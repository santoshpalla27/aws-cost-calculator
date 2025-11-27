import { EC2PricingService } from '../src/services/ec2PricingService';

describe('EC2PricingService', () => {
  let service: EC2PricingService;

  beforeEach(() => {
    service = new EC2PricingService();
  });

  it('should calculate EC2 costs correctly', async () => {
    const result = await service.calculateEC2Cost(
      't3.micro',
      'us-east-1',
      'linux',
      'on-demand',
      1,
      730
    );

    expect(result).toHaveProperty('monthlyCost');
    expect(result).toHaveProperty('hourlyCost');
    expect(result.monthlyCost).toBeGreaterThan(0);
  });
});