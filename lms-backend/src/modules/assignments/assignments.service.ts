import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '../../common/auth/roles.enum';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import {
  AssignmentSubmission,
  AssignmentSubmissionDocument,
} from './schemas/assignment-submission.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto';
import { StudentsService } from '../students/students.service';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(AssignmentSubmission.name)
    private readonly submissionModel: Model<AssignmentSubmissionDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async createAssignment(
    dto: CreateAssignmentDto,
    actor: { sub: string; role: UserRole; email: string },
  ) {
    if (actor.role !== UserRole.TEACHER && actor.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only teachers or admins can create assignments.',
      );
    }

    const assignment = await this.assignmentModel.create({
      ...dto,
      teacherId: actor.sub,
      teacherName: actor.email,
      assignedStudentIds: dto.assignedStudentIds ?? [],
    });

    return this.toAssignmentResponse(assignment);
  }

  async listAssignments(
    query: {
      classGrade?: string;
      teacherId?: string;
      studentId?: string;
      subject?: string;
    },
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    let scopedClassGrade = query.classGrade;
    let scopedStudentId = query.studentId;

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      scopedStudentId = student._id.toString();
      scopedClassGrade = student.grade.toString();
    }

    const filter: Record<string, unknown> = {};
    if (scopedClassGrade) filter.classGrade = scopedClassGrade;
    if (query.teacherId) filter.teacherId = query.teacherId;
    if (query.subject) filter.subject = query.subject;
    if (scopedStudentId) {
      filter.$or = [
        { assignedStudentIds: { $size: 0 } },
        { assignedStudentIds: scopedStudentId },
      ];
    }

    const assignments = await this.assignmentModel
      .find(filter)
      .sort({ dueDate: 1 })
      .exec();

    return assignments.map((assignment) =>
      this.toAssignmentResponse(assignment),
    );
  }

  async getAssignment(
    assignmentId: string,
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    const assignment = await this.assignmentModel.findById(assignmentId).exec();
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      const studentId = student._id.toString();
      const isVisibleToStudent =
        assignment.classGrade === student.grade.toString() &&
        (assignment.assignedStudentIds.length === 0 ||
          assignment.assignedStudentIds.includes(studentId));

      if (!isVisibleToStudent) {
        throw new NotFoundException('Assignment not found.');
      }
    }

    return this.toAssignmentResponse(assignment);
  }

  async listSubmissions(
    query: { assignmentId?: string; studentId?: string },
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    let scopedStudentId = query.studentId;

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      scopedStudentId = student._id.toString();
    }

    const filter: Record<string, unknown> = {};
    if (query.assignmentId) filter.assignmentId = query.assignmentId;
    if (scopedStudentId) filter.studentId = scopedStudentId;

    const submissions = await this.submissionModel
      .find(filter)
      .sort({ submittedAt: -1 })
      .exec();

    return submissions.map((submission) =>
      this.toSubmissionResponse(submission),
    );
  }

  async submitAssignment(
    assignmentId: string,
    dto: CreateAssignmentSubmissionDto,
    actor: { sub: string; role: UserRole; email: string },
  ) {
    if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only students can submit assignments.');
    }

    const effectiveStudentId =
      actor.role === UserRole.STUDENT
        ? (await this.studentsService.findByUserId(actor.sub))._id.toString()
        : dto.studentId;

    const assignment = await this.assignmentModel.findById(assignmentId).exec();
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const existing = await this.submissionModel.exists({
      assignmentId,
      studentId: effectiveStudentId,
    });
    if (existing) {
      throw new ConflictException(
        'Assignment already submitted for this student.',
      );
    }

    const submission = await this.submissionModel.create({
      assignmentId,
      studentId: effectiveStudentId,
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
      files: dto.files,
    });

    return this.toSubmissionResponse(submission);
  }

  async gradeSubmission(
    submissionId: string,
    dto: GradeAssignmentSubmissionDto,
  ) {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    submission.marks = dto.marks;
    submission.feedback = dto.feedback;
    submission.status = 'Graded';

    await submission.save();
    return this.toSubmissionResponse(submission);
  }

  private toAssignmentResponse(assignment: AssignmentDocument) {
    return {
      id: assignment._id.toString(),
      title: assignment.title,
      subject: assignment.subject,
      classGrade: assignment.classGrade,
      dueDate: assignment.dueDate,
      teacherId: assignment.teacherId,
      teacherName: assignment.teacherName,
      totalMarks: assignment.totalMarks,
      description: assignment.description,
      instructions: assignment.instructions,
      assignedStudentIds: assignment.assignedStudentIds,
    };
  }

  private toSubmissionResponse(submission: AssignmentSubmissionDocument) {
    return {
      id: submission._id.toString(),
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      submittedAt: submission.submittedAt,
      status: submission.status,
      files: submission.files,
      marks: submission.marks,
      feedback: submission.feedback,
    };
  }
}
