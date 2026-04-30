import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { Student, StudentDocument } from './schemas/student.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentSelfDto } from './dto/update-student-self.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/auth/roles.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateStudentDto) {
    const exists = await this.studentModel.exists({
      admissionNo: dto.admissionNo,
    });
    if (exists) {
      throw new ConflictException(
        'Student with this admission number already exists.',
      );
    }

    const defaultPassword = dto.admissionNo;
    const passwordHash = await argon2.hash(defaultPassword);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.STUDENT,
      systemId: dto.admissionNo,
    });

    const student = await this.studentModel.create({
      ...dto,
      grade: new Types.ObjectId(dto.grade),
      userId: user._id,
      email: dto.email.toLowerCase(),
      gender: '',
      dob: '',
      phone: '',
      address: '',
      subjects: dto.subjects ?? [],
      // Enrollment links are managed by courses enrollments API.
      enrolledCourses: [],
      enrolledCourseIds: [],
      status: 'Active',
    });

    return this.toResponse(student);
  }

  async findAll(query: {
    className?: string;
    status?: string;
    search?: string;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.className) filter.grade = query.className;
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { admissionNo: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const students = await this.studentModel
      .find(filter)
      .sort({ name: 1 })
      .exec();
    return students.map((item) => this.toResponse(item));
  }

  async findByUserId(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Student not found.');
    }

    const byUserId = await this.studentModel.findOne({ userId }).exec();
    if (byUserId) {
      return byUserId;
    }

    // Backward-compatible fallback for legacy rows where userId wasn't linked.
    const user = await this.usersService.findById(userId);
    const byEmail = await this.studentModel
      .findOne({ email: user.email.toLowerCase() })
      .exec();

    if (!byEmail) {
      throw new NotFoundException('Student not found.');
    }

    return byEmail;
  }

  async getProfile(userId: string) {
    const student = await this.findByUserId(userId);
    return this.toResponse(student);
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.findById(id);

    if (dto.name) student.name = dto.name;
    if (dto.email) student.email = dto.email.toLowerCase();
    if (dto.grade) student.grade = new Types.ObjectId(dto.grade);
    if (dto.guardian) student.guardian = dto.guardian;
    if (dto.guardianPhone) student.guardianPhone = dto.guardianPhone;
    if (dto.subjects) student.subjects = dto.subjects;
    if (dto.status) student.status = dto.status;

    await student.save();

    if (student.userId) {
      await this.usersService.updateIdentity(student.userId.toString(), {
        name: student.name,
        email: student.email,
        systemId: student.admissionNo,
      });
    }

    return this.toResponse(student);
  }

  async updateByUserId(userId: string, dto: UpdateStudentSelfDto) {
    const student = await this.findByUserId(userId);

    if (dto.gender !== undefined) student.gender = dto.gender;
    if (dto.dob !== undefined) student.dob = dto.dob;
    if (dto.phone !== undefined) student.phone = dto.phone;
    if (dto.address !== undefined) student.address = dto.address;
    if (dto.email !== undefined) student.email = dto.email.toLowerCase();

    await student.save();

    if (dto.email !== undefined && student.userId) {
      await this.usersService.updateIdentity(student.userId.toString(), {
        email: student.email,
      });
    }

    return this.toResponse(student);
  }

  async remove(id: string) {
    const student = await this.findById(id);
    await student.deleteOne();

    return { id };
  }

  async resetPassword(id: string) {
    const student = await this.findById(id);
    return this.resetPasswordForStudent(student);
  }

  async findByAdmissionNo(admissionNo: string) {
    return this.studentModel
      .findOne({
        admissionNo: {
          $regex: `^${this.escapeRegex(admissionNo.trim())}$`,
          $options: 'i',
        },
      })
      .exec();
  }

  async resetPasswordByAdmissionNo(admissionNo: string) {
    const student = await this.findByAdmissionNo(admissionNo);
    if (!student) {
      throw new NotFoundException('Student not found.');
    }
    return this.resetPasswordForStudent(student);
  }

  private async resetPasswordForStudent(student: StudentDocument) {
    const defaultPassword = student.admissionNo;
    const passwordHash = await argon2.hash(defaultPassword);

    const existingUser =
      (student.userId
        ? await this.usersService
            .findById(student.userId.toString())
            .catch(() => null)
        : null) ?? (await this.usersService.findByEmail(student.email));

    if (existingUser) {
      await this.usersService.updateIdentity(existingUser._id.toString(), {
        name: student.name,
        email: student.email,
        systemId: student.admissionNo,
      });
      await this.usersService.updatePasswordHash(
        existingUser._id.toString(),
        passwordHash,
      );
      await this.usersService.setRefreshTokenHash(
        existingUser._id.toString(),
        null,
      );
      if (
        !student.userId ||
        student.userId.toString() !== existingUser._id.toString()
      ) {
        student.userId = existingUser._id;
        await student.save();
      }
    } else {
      const createdUser = await this.usersService.create({
        name: student.name,
        email: student.email,
        passwordHash,
        role: UserRole.STUDENT,
        systemId: student.admissionNo,
      });
      student.userId = createdUser._id;
      await student.save();
    }

    return {
      id: student._id.toString(),
      defaultPassword,
    };
  }

  private async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Student not found.');
    }

    const student = await this.studentModel.findById(id).exec();
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  private toResponse(
    student: StudentDocument | (Student & { _id: Types.ObjectId }),
  ) {
    return {
      id: student._id.toString(),
      admissionNo: student.admissionNo,
      name: student.name,
      email: student.email,
      grade: student.grade.toString(),
      guardian: student.guardian,
      guardianPhone: student.guardianPhone,
      gender: student.gender ?? '',
      dob: student.dob ?? '',
      phone: student.phone ?? '',
      address: student.address ?? '',
      subjects: student.subjects ?? [],
      enrolledCourses: student.enrolledCourses ?? [],
      enrolledCourseIds: student.enrolledCourseIds ?? [],
      status: student.status,
      avatarUrl: student.avatarUrl ?? '',
    };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
