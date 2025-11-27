import createCsvWriter from 'csv-writer';
import { logger } from '../utils/logger';

export class CSVExporter {
  generateReportCSV(report: any): string {
    try {
      // Prepare CSV data for resources
      const resourcesData = report.data?.resources?.map((resource: any) => ({
        'Resource Name': resource.name,
        'Resource Type': resource.type,
        'Monthly Cost': resource.monthlyCost,
        'Hourly Cost': resource.hourlyCost,
        'Details': JSON.stringify(resource.details || {})
      })) || [];

      // Create CSV writer
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: 'temp.csv', // This won't be used since we return the content as string
        header: [
          { id: 'Resource Name', title: 'Resource Name' },
          { id: 'Resource Type', title: 'Resource Type' },
          { id: 'Monthly Cost', title: 'Monthly Cost' },
          { id: 'Hourly Cost', title: 'Hourly Cost' },
          { id: 'Details', title: 'Details' }
        ]
      });

      // Generate CSV content
      let csvContent = 'Resource Name,Resource Type,Monthly Cost,Hourly Cost,Details\n';
      
      for (const resource of resourcesData) {
        csvContent += `"${resource['Resource Name']}","${resource['Resource Type']}","${resource['Monthly Cost']}","${resource['Hourly Cost']}","${resource['Details']}"\n`;
      }

      return csvContent;
    } catch (error) {
      logger.error('Error generating CSV:', error);
      throw error;
    }
  }
}