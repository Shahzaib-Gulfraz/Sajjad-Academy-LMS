import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeeInvoice, FeeInvoiceDocument } from './schemas/fee-invoice.schema';
import {
  FeeTransaction,
  FeeTransactionDocument,
} from './schemas/fee-transaction.schema';
import { CreateFeeTransactionDto } from './dto/create-fee-transaction.dto';
import { UpdateFeeTransactionDto } from './dto/update-fee-transaction.dto';
import { UpsertFeeInvoiceDto } from './dto/upsert-fee-invoice.dto';

@Injectable()
export class FeesService {
  constructor(
    @InjectModel(FeeInvoice.name)
    private readonly invoiceModel: Model<FeeInvoiceDocument>,
    @InjectModel(FeeTransaction.name)
    private readonly transactionModel: Model<FeeTransactionDocument>,
  ) {}

  async createTransaction(dto: CreateFeeTransactionDto) {
    const receiptNo = `RCPT-${Date.now().toString(36).toUpperCase()}`;

    const transaction = await this.transactionModel.create({
      ...dto,
      receiptNo,
      paidAt: new Date().toISOString(),
    });

    if (dto.invoiceId) {
      const invoice = await this.invoiceModel.findById(dto.invoiceId).exec();
      if (invoice) {
        const paidAgainstInvoice = await this.transactionModel.aggregate<{
          total: number;
        }>([
          { $match: { invoiceId: dto.invoiceId } },
          { $group: { _id: '$invoiceId', total: { $sum: '$amount' } } },
        ]);

        const totalPaid = paidAgainstInvoice[0]?.total ?? 0;
        invoice.status = totalPaid >= invoice.amountDue ? 'Paid' : 'Partial';
        await invoice.save();
      }
    }

    return this.toTransactionResponse(transaction);
  }

  async updateTransaction(id: string, dto: UpdateFeeTransactionDto) {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException('Fee transaction not found.');
    }

    if (dto.amount !== undefined) transaction.amount = dto.amount;
    if (dto.method !== undefined) transaction.method = dto.method;
    if (dto.collector !== undefined) transaction.collector = dto.collector;
    if (dto.remarks !== undefined) transaction.remarks = dto.remarks;

    await transaction.save();

    if (transaction.invoiceId) {
      await this.reconcileInvoiceStatus(transaction.invoiceId);
    }

    return this.toTransactionResponse(transaction);
  }

  async upsertInvoice(dto: UpsertFeeInvoiceDto) {
    const invoice = await this.invoiceModel
      .findOneAndUpdate(
        {
          studentId: dto.studentId,
          period: dto.period,
        },
        {
          $set: {
            amountDue: dto.amountDue,
            status: 'Pending',
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    await this.reconcileInvoiceStatus(invoice._id.toString());
    const refreshedInvoice = await this.invoiceModel
      .findById(invoice._id)
      .exec();
    if (!refreshedInvoice) {
      throw new NotFoundException('Fee invoice not found after update.');
    }

    return {
      id: refreshedInvoice._id.toString(),
      studentId: refreshedInvoice.studentId,
      period: refreshedInvoice.period,
      amountDue: refreshedInvoice.amountDue,
      status: refreshedInvoice.status as 'Paid' | 'Partial' | 'Pending',
    };
  }

  async listTransactions(query: { studentId?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.studentId) filter.studentId = query.studentId;

    const transactions = await this.transactionModel
      .find(filter)
      .sort({ paidAt: -1 })
      .exec();
    return transactions.map((transaction) =>
      this.toTransactionResponse(transaction),
    );
  }

  async getStudentSummary(studentId: string) {
    const [invoiceAgg, transactionAgg] = await Promise.all([
      this.invoiceModel.aggregate<{ totalDue: number }>([
        { $match: { studentId } },
        { $group: { _id: '$studentId', totalDue: { $sum: '$amountDue' } } },
      ]),
      this.transactionModel.aggregate<{ totalPaid: number }>([
        { $match: { studentId } },
        { $group: { _id: '$studentId', totalPaid: { $sum: '$amount' } } },
      ]),
    ]);

    const totalDue = invoiceAgg[0]?.totalDue ?? 0;
    const totalPaid = transactionAgg[0]?.totalPaid ?? 0;
    const pending = Math.max(0, totalDue - totalPaid);

    return {
      studentId,
      totalDue,
      totalPaid,
      pending,
      status: pending === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending',
    };
  }

  async duesReport() {
    const invoices = await this.invoiceModel.find().exec();
    const transactions = await this.transactionModel.find().exec();

    const paidByStudent = new Map<string, number>();
    for (const transaction of transactions) {
      paidByStudent.set(
        transaction.studentId,
        (paidByStudent.get(transaction.studentId) ?? 0) + transaction.amount,
      );
    }

    const dueByStudent = new Map<string, number>();
    for (const invoice of invoices) {
      dueByStudent.set(
        invoice.studentId,
        (dueByStudent.get(invoice.studentId) ?? 0) + invoice.amountDue,
      );
    }

    return Array.from(dueByStudent.entries()).map(([studentId, totalDue]) => {
      const totalPaid = paidByStudent.get(studentId) ?? 0;
      const pending = Math.max(0, totalDue - totalPaid);
      return {
        studentId,
        totalDue,
        totalPaid,
        pending,
      };
    });
  }

  private async reconcileInvoiceStatus(invoiceId: string) {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) return;

    const paidAgainstInvoice = await this.transactionModel.aggregate<{
      total: number;
    }>([
      { $match: { invoiceId } },
      { $group: { _id: '$invoiceId', total: { $sum: '$amount' } } },
    ]);

    const totalPaid = paidAgainstInvoice[0]?.total ?? 0;
    if (totalPaid >= invoice.amountDue) {
      invoice.status = 'Paid';
    } else if (totalPaid > 0) {
      invoice.status = 'Partial';
    } else {
      invoice.status = 'Pending';
    }

    await invoice.save();
  }

  private toTransactionResponse(transaction: FeeTransactionDocument) {
    return {
      id: transaction._id.toString(),
      studentId: transaction.studentId,
      invoiceId: transaction.invoiceId,
      receiptNo: transaction.receiptNo,
      amount: transaction.amount,
      method: transaction.method,
      collector: transaction.collector,
      remarks: transaction.remarks,
      paidAt: transaction.paidAt,
    };
  }
}
