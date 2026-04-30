import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '../../common/auth/roles.enum';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import {
  GradebookEntry,
  GradebookEntryDocument,
} from './schemas/gradebook-entry.schema';
import { CreateGradebookEntryDto } from './dto/create-gradebook-entry.dto';
import { UpdateGradebookEntryDto } from './dto/update-gradebook-entry.dto';
import { StudentsService } from '../students/students.service';

@Injectable()
export class GradebookService {
  constructor(
    @InjectModel(GradebookEntry.name)
    private readonly entryModel: Model<GradebookEntryDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async createEntry(dto: CreateGradebookEntryDto, teacherId: string) {
    const entry = await this.entryModel.create({
      ...dto,
      teacherId,
    });

    return this.toResponse(entry);
  }

  async listEntries(query: {
    classGrade?: string;
    teacherId?: string;
    subject?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.classGrade) filter.classGrade = query.classGrade;
    if (query.teacherId) filter.teacherId = query.teacherId;
    if (query.subject) filter.subject = query.subject;

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const entries = await this.entryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();

    return entries.map((entry) => this.toResponse(entry));
  }

  async updateEntry(
    entryId: string,
    dto: UpdateGradebookEntryDto,
    actor: RequestUser,
  ) {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) {
      throw new NotFoundException('Gradebook entry not found.');
    }

    if (actor.role !== UserRole.ADMIN && entry.teacherId !== actor.sub) {
      throw new ForbiddenException(
        'You are not allowed to update this gradebook entry.',
      );
    }

    if (dto.totalMarks !== undefined) {
      const marksToValidate = dto.marks ?? entry.marks;
      const hasOutOfRange = marksToValidate.some(
        (mark) => mark.marks > dto.totalMarks!,
      );
      if (hasOutOfRange) {
        throw new ForbiddenException(
          'One or more marks exceed the updated total marks.',
        );
      }
    }

    const updated = await this.entryModel
      .findByIdAndUpdate(entryId, { $set: dto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Gradebook entry not found.');
    }

    return this.toResponse(updated);
  }

  async deleteEntry(entryId: string, actor: RequestUser) {
    const entry = await this.entryModel.findById(entryId).exec();
    if (!entry) {
      throw new NotFoundException('Gradebook entry not found.');
    }

    if (actor.role !== UserRole.ADMIN && entry.teacherId !== actor.sub) {
      throw new ForbiddenException(
        'You are not allowed to delete this gradebook entry.',
      );
    }

    await this.entryModel.deleteOne({ _id: entryId }).exec();
    return { deleted: true, id: entryId };
  }

  async getStudentEntries(studentId: string, actor: RequestUser) {
    if (actor.role === UserRole.STUDENT) {
      const me = await this.studentsService.findByUserId(actor.sub);
      if (me.id !== studentId) {
        throw new ForbiddenException(
          'You are not allowed to view another student gradebook.',
        );
      }
    }

    const entries = await this.entryModel
      .find({ 'marks.studentId': studentId })
      .sort({ createdAt: -1 })
      .exec();

    return entries.map((entry) => {
      const studentMark = entry.marks.find(
        (mark) => mark.studentId === studentId,
      );
      return {
        id: entry._id.toString(),
        subject: entry.subject,
        classGrade: entry.classGrade,
        term: entry.term,
        assessment: entry.assessment,
        totalMarks: entry.totalMarks,
        marks: studentMark?.marks ?? null,
      };
    });
  }

  private toResponse(entry: GradebookEntryDocument) {
    return {
      id: entry._id.toString(),
      teacherId: entry.teacherId,
      subject: entry.subject,
      classGrade: entry.classGrade,
      term: entry.term,
      assessment: entry.assessment,
      totalMarks: entry.totalMarks,
      createdAt: entry.createdAt?.toISOString(),
      marks: entry.marks,
    };
  }
}
