import { AppDataSource } from '../config/database';
import { Report, ReportType } from '../models/Report';
import { Between } from 'typeorm';

export class ReportService {
    private reportRepository = AppDataSource.getRepository(Report);

    async createReport(
        userId: string,
        type: ReportType,
        name: string,
        data: any,
        totalMonthlyCost: number,
        metadata?: any
    ): Promise {
        const report = this.reportRepository.create({
            userId,
            type,
            name,
            data,
            totalMonthlyCost,
            metadata
        });

        return this.reportRepository.save(report);
    }

    async getReports(userId: string, filters?: any): Promise {
        const where: any = { userId };

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.startDate & amp;& amp; filters?.endDate) {
            where.createdAt = Between(
                new Date(filters.startDate),
                new Date(filters.endDate)
            );
        }

        return this.reportRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: filters?.limit || 50
        });
    }

    async getReportById(id: string, userId: string): Promise {
        return this.reportRepository.findOne({
            where: { id, userId }
        });
    }

    async deleteReport(id: string, userId: string): Promise {
        const result = await this.reportRepository.delete({ id, userId });
        return result.affected ? result.affected & gt; 0 : false;
    }

    async getCostTrends(userId: string, days: number = 30): Promise {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const reports = await this.reportRepository
            .createQueryBuilder('report')
            .select('DATE(report.createdAt)', 'date')
            .addSelect('SUM(report.totalMonthlyCost)', 'totalCost')
            .addSelect('COUNT(*)', 'count')
            .where('report.userId = :userId', { userId })
            .andWhere('report.createdAt &gt;= :startDate', { startDate })
            .groupBy('DATE(report.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();

        return reports;
    }
}

export const reportService = new ReportService();