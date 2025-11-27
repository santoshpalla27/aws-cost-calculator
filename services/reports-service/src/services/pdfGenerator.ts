import puppeteer from 'puppeteer';
import { logger } from '../utils/logger';

export class PDFGenerator {
  async generateReportPDF(report: any): Promise<Buffer> {
    try {
      // Create HTML content for the report
      const htmlContent = this.generateHTMLContent(report);

      // Launch puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set the HTML content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      // Close the browser
      await browser.close();
      
      return pdf;
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  private generateHTMLContent(report: any): string {
    // Calculate summary data
    const totalMonthlyCost = report.data?.totalMonthlyCost || 0;
    const totalHourlyCost = report.data?.totalHourlyCost || 0;
    
    // Generate resources table rows
    const resourcesRows = report.data?.resources?.map((resource: any) => `
      <tr>
        <td>${resource.name}</td>
        <td>${resource.type}</td>
        <td>$${resource.monthlyCost?.toFixed(2) || '0.00'}</td>
        <td>$${resource.hourlyCost?.toFixed(4) || '0.0000'}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No resources found</td></tr>';
    
    // Generate services table rows
    const servicesRows = report.data?.services?.map((service: any) => `
      <tr>
        <td>${service.name}</td>
        <td>$${service.monthlyCost?.toFixed(2) || '0.00'}</td>
        <td>${service.resources?.length || 0}</td>
      </tr>
    `).join('') || '<tr><td colspan="3">No services found</td></tr>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cost Report - ${report.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .summary h2 { margin: 0 0 10px 0; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .summary-item { background: white; padding: 10px; border-radius: 4px; text-align: center; }
            .summary-value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
            .summary-label { font-size: 0.9em; color: #7f8c8d; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #ecf0f1; }
            .section { margin-bottom: 30px; }
            .section h3 { margin-top: 0; color: #2c3e50; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cost Report</h1>
            <h2>${report.name}</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">$${totalMonthlyCost.toFixed(2)}</div>
                <div class="summary-label">Total Monthly Cost</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">$${totalHourlyCost.toFixed(4)}</div>
                <div class="summary-label">Total Hourly Cost</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${report.data?.resources?.length || 0}</div>
                <div class="summary-label">Total Resources</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${report.data?.services?.length || 0}</div>
                <div class="summary-label">Total Services</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Resource Costs</h3>
            <table>
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Type</th>
                  <th>Monthly Cost</th>
                  <th>Hourly Cost</th>
                </tr>
              </thead>
              <tbody>
                ${resourcesRows}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Service Costs</h3>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Monthly Cost</th>
                  <th>Resource Count</th>
                </tr>
              </thead>
              <tbody>
                ${servicesRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  }
}