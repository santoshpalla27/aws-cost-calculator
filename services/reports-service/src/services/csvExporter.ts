import { createObjectCsvWriter } from 'csv-writer';
import { Report } from '../models/Report';
import * as fs from 'fs';
import * as path from 'path';

export class CSVExporter {
    async exportReportToCSV(report: Report): Promise {
        const tmpDir = '/tmp/reports';
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const filePath = path.join(tmpDir, `report-\${report.id}.csv`);

        if (report.type === 'terraform') {
            return this.exportTerraformReport(report, filePath);
        } else {
            return this.exportGenericReport(report, filePath);
        }
    }

    private async exportTerraformReport(report: Report, filePath: string): Promise {
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'name', title: 'Resource Name' },
                { id: 'type', title: 'Resource Type' },
                { id: 'monthlyCost', title: 'Monthly Cost' },
                { id: 'hourlyCost', title: 'Hourly Cost' }
            ]
        });

        const records = report.data.resources || [];
        await csvWriter.writeRecords(records);

        return filePath;
    }

    private async exportGenericReport(report: Report, filePath: string): Promise {
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'field', title: 'Field' },
                { id: 'value', title: 'Value' }
            ]
        });

        const records = Object.entries(report.data).map(([key, value]) =& gt; ({
            field: key,
            value: JSON.stringify(value)
        }));

        await csvWriter.writeRecords(records);

        return filePath;
    }
}

export const csvExporter = new CSVExporter();