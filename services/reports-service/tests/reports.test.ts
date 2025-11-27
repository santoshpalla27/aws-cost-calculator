import { ReportService } from '../src/services/reportService';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
  });

  it('should fetch reports', async () => {
    const reports = await service.getReports(10, 0);
    expect(Array.isArray(reports)).toBe(true);
  });

  it('should get report by id', async () => {
    const report = await service.getReportById('1');
    expect(report).toBeDefined();
  });
});