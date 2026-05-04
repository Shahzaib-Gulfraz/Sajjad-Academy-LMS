import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  AttendanceSession,
  AttendanceSessionDocument,
} from '../attendance/schemas/attendance-session.schema';
import {
  FeeTransaction,
  FeeTransactionDocument,
} from '../fees/schemas/fee-transaction.schema';
import {
  FeeInvoice,
  FeeInvoiceDocument,
} from '../fees/schemas/fee-invoice.schema';
import {
  GradebookEntry,
  GradebookEntryDocument,
} from '../gradebook/schemas/gradebook-entry.schema';
import { SchoolClass, SchoolClassDocument } from '../classes/schemas/class.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(AttendanceSession.name)
    private readonly attendanceModel: Model<AttendanceSessionDocument>,
    @InjectModel(FeeTransaction.name)
    private readonly feeTransactionModel: Model<FeeTransactionDocument>,
    @InjectModel(FeeInvoice.name)
    private readonly feeInvoiceModel: Model<FeeInvoiceDocument>,
    @InjectModel(GradebookEntry.name)
    private readonly gradebookModel: Model<GradebookEntryDocument>,
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
  ) {}

  async getOverview() {
    const [
      students,
      teachers,
      attendanceSessions,
      feeTransactions,
      feeInvoices,
      gradebookEntries,
    ] = await Promise.all([
      this.studentModel.find().lean().exec(),
      this.teacherModel.find().lean().exec(),
      this.attendanceModel.find().lean().exec(),
      this.feeTransactionModel.find().lean().exec(),
      this.feeInvoiceModel.find().lean().exec(),
      this.gradebookModel.find().lean().exec(),
    ]);

    // Build a map of class ObjectId -> class name so reports use readable names
    const classes = await this.classModel.find().lean().exec();
    const classNameMap = new Map<string, string>();
    for (const c of classes) {
      // @ts-ignore - c._id may be ObjectId
      classNameMap.set(c._id.toString(), c.name);
    }

    const totalStudents = students.length;
    const totalTeachers = teachers.length;

    const totalCollected = feeTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const totalInvoiced = feeInvoices.reduce(
      (sum, invoice) => sum + invoice.amountDue,
      0,
    );
    const totalPending = Math.max(0, totalInvoiced - totalCollected);
    const collectionRate =
      totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    let attendancePresent = 0;
    let attendanceTotal = 0;
    for (const session of attendanceSessions) {
      attendanceTotal += session.entries.length;
      attendancePresent += session.entries.filter(
        (entry) => entry.status === 'Present',
      ).length;
    }
    const avgAttendance =
      attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 0;

    const monthlyCollectionMap = new Map<string, number>();
    for (const tx of feeTransactions) {
      const month = tx.paidAt.slice(0, 7);
      monthlyCollectionMap.set(
        month,
        (monthlyCollectionMap.get(month) ?? 0) + tx.amount,
      );
    }
    const monthlyCollection = Array.from(monthlyCollectionMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const dueByStudent = new Map<string, number>();
    for (const invoice of feeInvoices) {
      dueByStudent.set(
        invoice.studentId,
        (dueByStudent.get(invoice.studentId) ?? 0) + invoice.amountDue,
      );
    }

    const paidByStudent = new Map<string, number>();
    for (const tx of feeTransactions) {
      paidByStudent.set(
        tx.studentId,
        (paidByStudent.get(tx.studentId) ?? 0) + tx.amount,
      );
    }

    const pendingByClass = new Map<
      string,
      { students: number; pending: number }
    >();
    for (const student of students) {
      // Fees data can be keyed by backend student document ID or admissionNo.
      const studentDocId = student._id.toString();
      const totalDue =
        dueByStudent.get(studentDocId) ??
        dueByStudent.get(student.admissionNo) ??
        0;
      const totalPaid =
        paidByStudent.get(studentDocId) ??
        paidByStudent.get(student.admissionNo) ??
        0;
      const pending = Math.max(0, totalDue - totalPaid);

      const gradeId = student.grade?.toString();
      const resolvedClassName = classNameMap.get(gradeId) ?? gradeId ?? 'Unknown';

      const current = pendingByClass.get(resolvedClassName) ?? {
        students: 0,
        pending: 0,
      };
      current.students += 1;
      current.pending += pending;
      pendingByClass.set(resolvedClassName, current);
    }

    const pendingDuesByClass = Array.from(pendingByClass.entries())
      .map(([className, value]) => ({
        className,
        students: value.students,
        pending: value.pending,
      }))
      .sort((a, b) => b.pending - a.pending);

    const teacherWorkload = teachers.map((teacher) => {
      const subjectCount = teacher.subject
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean).length;
      const classSubjectCount =
        teacher.classes.length * Math.max(1, subjectCount);

      return {
        id: teacher.employeeNo,
        name: teacher.name,
        loadUnits: Math.max(1, classSubjectCount),
      };
    });

    const attendanceByClass = new Map<
      string,
      { present: number; total: number }
    >();
    for (const session of attendanceSessions) {
      const current = attendanceByClass.get(session.className) ?? {
        present: 0,
        total: 0,
      };
      current.total += session.entries.length;
      current.present += session.entries.filter(
        (entry) => entry.status === 'Present',
      ).length;
      attendanceByClass.set(session.className, current);
    }

    const attendanceTrends = Array.from(attendanceByClass.entries())
      .map(([className, value]) => ({
        className,
        percentage: value.total > 0 ? (value.present / value.total) * 100 : 0,
        present: value.present,
        total: value.total,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const gradeBuckets = new Map<string, number>([
      ['A*', 0],
      ['A', 0],
      ['B', 0],
      ['C', 0],
      ['D', 0],
      ['E', 0],
      ['F/G', 0],
    ]);

    const scoresByStudent = new Map<
      string,
      { scored: number; total: number }
    >();
    for (const entry of gradebookEntries) {
      for (const mark of entry.marks) {
        const current = scoresByStudent.get(mark.studentId) ?? {
          scored: 0,
          total: 0,
        };
        current.scored += mark.marks;
        current.total += entry.totalMarks;
        scoresByStudent.set(mark.studentId, current);
      }
    }

    for (const student of students) {
      const scores = scoresByStudent.get(student.admissionNo);
      const percentage =
        scores && scores.total > 0 ? (scores.scored / scores.total) * 100 : 0;
      const grade = this.percentageToGrade(percentage);
      gradeBuckets.set(grade, (gradeBuckets.get(grade) ?? 0) + 1);
    }

    const gradeDistribution = Array.from(gradeBuckets.entries()).map(
      ([grade, count]) => ({ grade, count }),
    );

    return {
      summary: {
        totalStudents,
        totalTeachers,
        totalCollected,
        totalPending,
        totalInvoiced,
        collectionRate,
        avgAttendance,
      },
      monthlyCollection,
      pendingDuesByClass,
      teacherWorkload,
      attendanceTrends,
      gradeDistribution,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private percentageToGrade(percentage: number): string {
    if (percentage >= 90) return 'A*';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F/G';
  }
}
