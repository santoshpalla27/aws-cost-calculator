import { logger } from './logger';

export class ChartGenerator {
  /**
   * Generates a data structure suitable for cost charts
   */
  generateCostChartData(reportData: any) {
    try {
      // Generate data for resource cost chart
      const resourceCostData = this.generateResourceCostData(reportData);
      
      // Generate data for service cost chart
      const serviceCostData = this.generateServiceCostData(reportData);
      
      // Generate data for cost trend chart (if historical data is available)
      const trendData = this.generateTrendData(reportData);
      
      return {
        resourceCostData,
        serviceCostData,
        trendData
      };
    } catch (error) {
      logger.error('Error generating chart data:', error);
      throw error;
    }
  }

  private generateResourceCostData(reportData: any) {
    const resources = reportData.resources || [];
    
    return {
      labels: resources.map((r: any) => r.name),
      datasets: [{
        label: 'Monthly Cost',
        data: resources.map((r: any) => r.monthlyCost),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1
      }]
    };
  }

  private generateServiceCostData(reportData: any) {
    const services = reportData.services || [];
    
    return {
      labels: services.map((s: any) => s.name),
      datasets: [{
        label: 'Monthly Cost',
        data: services.map((s: any) => s.monthlyCost),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1
      }]
    };
  }

  private generateTrendData(reportData: any) {
    // This would normally come from historical data
    // For now, we'll create some mock trend data
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate mock data based on the current report
    const currentCost = reportData.totalMonthlyCost || 0;
    const data = labels.map((_, index) => {
      // Create a slight variation around the current cost
      return currentCost * (0.8 + Math.random() * 0.4);
    });
    
    return {
      labels,
      datasets: [{
        label: 'Monthly Cost Trend',
        data,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
  }

  /**
   * Gets chart options with default styling
   */
  getDefaultChartOptions(): any {
    return {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Cost Breakdown'
        }
      }
    };
  }
}