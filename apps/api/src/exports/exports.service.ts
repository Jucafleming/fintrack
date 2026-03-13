import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { Workbook } from 'exceljs';
import { TransactionType } from '@fintrack/shared';
import { Transaction } from '../transactions/transaction.entity';
import { GroupsService } from '../groups/groups.service';
import { ListTransactionsDto } from '../transactions/dto';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    private groupsService: GroupsService,
  ) {}

  async exportCsv(groupId: string, userId: string, filters: ListTransactionsDto, res: Response): Promise<void> {
    await this.groupsService.validateMembership(groupId, userId);

    const qb = this.transactionsRepo
      .createQueryBuilder('t')
      .where('t.groupId = :groupId', { groupId })
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.paymentMethod', 'paymentMethod')
      .orderBy('t.date', 'DESC');

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.paymentMethodId) {
      qb.andWhere('t.paymentMethodId = :paymentMethodId', { paymentMethodId: filters.paymentMethodId });
    }
    if (filters.startDate) {
      qb.andWhere('t.date >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('t.date <= :endDate', { endDate: filters.endDate });
    }
    if (filters.month && filters.year) {
      qb.andWhere('EXTRACT(MONTH FROM t.date) = :month', { month: filters.month });
      qb.andWhere('EXTRACT(YEAR FROM t.date) = :year', { year: filters.year });
    } else if (filters.month) {
      qb.andWhere('EXTRACT(MONTH FROM t.date) = :month', { month: filters.month });
    } else if (filters.year) {
      qb.andWhere('EXTRACT(YEAR FROM t.date) = :year', { year: filters.year });
    }

    const transactions = await qb.getMany();

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Transações');

    sheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Meio de Pagamento', key: 'paymentMethod', width: 20 },
      { header: 'Valor', key: 'amount', width: 12 },
      { header: 'Dono', key: 'ownership', width: 12 },
      { header: 'Pago', key: 'isPaid', width: 8 },
      { header: 'Observações', key: 'notes', width: 30 },
    ];

    const typeLabels: Record<TransactionType, string> = {
      [TransactionType.FIXED]: 'Gasto Fixo',
      [TransactionType.VARIABLE]: 'Gasto Variável',
      [TransactionType.INSTALLMENT]: 'Parcelado',
      [TransactionType.INCOME]: 'Receita',
    };

    for (const tx of transactions) {
      sheet.addRow({
        date: tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : tx.date,
        type: typeLabels[tx.type] ?? tx.type,
        title: tx.title,
        category: tx.category?.name ?? '',
        paymentMethod: tx.paymentMethod?.name ?? '',
        amount: Number(tx.amount),
        ownership: tx.ownership,
        isPaid: tx.isPaid ? 'Sim' : 'Não',
        notes: tx.notes ?? '',
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transacoes.csv"');

    await workbook.csv.write(res);
  }
}
