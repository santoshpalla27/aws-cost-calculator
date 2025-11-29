import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class VPCPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'VPC');
  }

  getServiceCode() {
    return 'AmazonVPC';
  }

  getSupportedResourceTypes() {
    return [
      'aws_vpc',
      'aws_subnet',
      'aws_internet_gateway',
      'aws_nat_gateway',
      'aws_eip',
      'aws_vpc_peering_connection',
      'aws_vpc_endpoint',
      'aws_vpc_endpoint_service',
      'aws_vpn_gateway',
      'aws_customer_gateway',
      'aws_vpn_connection',
      'aws_dx_gateway',
      'aws_dx_connection',
      'aws_transit_gateway',
      'aws_transit_gateway_attachment',
      'aws_transit_gateway_route_table',
      'aws_network_acl',
      'aws_route_table',
      'aws_route_table_association',
      'aws_security_group',
      'aws_flow_log'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_nat_gateway':
        return this.calculateNATGatewayCost(resource, region);
      case 'aws_eip':
        return this.calculateEIPCost(resource, region);
      case 'aws_vpc_endpoint':
        return this.calculateVPCEndpointCost(resource, region);
      case 'aws_vpn_connection':
        return this.calculateVPNConnectionCost(resource, region);
      case 'aws_transit_gateway':
        return this.calculateTransitGatewayCost(resource, region);
      case 'aws_transit_gateway_attachment':
        return this.calculateTransitGatewayAttachmentCost(resource, region);
      case 'aws_vpc_peering_connection':
        return this.calculateVPCPeeringCost(resource, region);
      case 'aws_flow_log':
        return this.calculateFlowLogCost(resource, region);
      // Free resources
      case 'aws_vpc':
      case 'aws_subnet':
      case 'aws_internet_gateway':
      case 'aws_route_table':
      case 'aws_route_table_association':
      case 'aws_security_group':
      case 'aws_network_acl':
        return null;
      default:
        return null;
    }
  }

  async calculateNATGatewayCost(resource, region) {
    // NAT Gateway: $0.045/hour + $0.045/GB processed
    const pricing = await this.getNATGatewayPricing(region);
    
    // Estimate data processing (default: 100GB/month)
    const estimatedDataGB = resource.config._estimated_data_gb || 100;
    const dataProcessingCost = this.monthlyToHourly(estimatedDataGB * pricing.dataProcessingPerGB);
    
    const hourly = pricing.hourlyPrice + dataProcessingCost;

    return this.formatCostResponse(hourly, {
      base: pricing.hourlyPrice,
      dataProcessing: dataProcessingCost
    }, {
      region,
      dataProcessingPerGB: pricing.dataProcessingPerGB,
      estimatedDataGB,
      note: 'Data processing costs depend on actual usage'
    });
  }

  async calculateEIPCost(resource, region) {
    // EIP is free when attached to a running instance
    // $0.005/hour when not attached
    const isAttached = resource.config.instance || resource.config.network_interface;
    
    if (isAttached) {
      return this.formatCostResponse(0, {}, {
        attached: true,
        note: 'EIP is free when attached to a running instance'
      });
    }

    const hourly = 0.005;
    return this.formatCostResponse(hourly, {
      idle: hourly
    }, {
      attached: false,
      note: 'Unattached EIP incurs charges'
    });
  }

  async calculateVPCEndpointCost(resource, region) {
    const config = resource.config;
    const endpointType = config.vpc_endpoint_type || 'Interface';
    
    if (endpointType === 'Gateway') {
      // Gateway endpoints (S3, DynamoDB) are free
      return this.formatCostResponse(0, {}, {
        endpointType,
        note: 'Gateway endpoints for S3 and DynamoDB are free'
      });
    }

    // Interface endpoints: $0.01/hour per AZ + data processing
    const subnetCount = config.subnet_ids?.length || 1;
    const hourlyPrice = 0.01 * subnetCount;
    
    // Data processing estimate
    const estimatedDataGB = config._estimated_data_gb || 10;
    const dataPrice = 0.01; // $0.01 per GB
    const dataCost = this.monthlyToHourly(estimatedDataGB * dataPrice);
    
    const hourly = hourlyPrice + dataCost;

    return this.formatCostResponse(hourly, {
      endpoint: hourlyPrice,
      dataProcessing: dataCost
    }, {
      endpointType,
      subnetCount,
      estimatedDataGB
    });
  }

  async calculateVPNConnectionCost(resource, region) {
    // Site-to-Site VPN: $0.05/hour per connection
    const hourly = 0.05;
    
    // Data transfer costs
    const estimatedDataOutGB = resource.config._estimated_data_out_gb || 100;
    const dataTransferPrice = 0.09; // $0.09 per GB
    const dataTransferCost = this.monthlyToHourly(estimatedDataOutGB * dataTransferPrice);
    
    const total = hourly + dataTransferCost;

    return this.formatCostResponse(total, {
      connection: hourly,
      dataTransfer: dataTransferCost
    }, {
      estimatedDataOutGB,
      note: 'Data transfer costs depend on actual usage'
    });
  }

  async calculateTransitGatewayCost(resource, region) {
    // Transit Gateway: $0.05/hour
    const hourly = 0.05;

    return this.formatCostResponse(hourly, {
      base: hourly
    }, {
      note: 'Additional costs for attachments and data processing'
    });
  }

  async calculateTransitGatewayAttachmentCost(resource, region) {
    // TGW Attachment: $0.05/hour per attachment
    const hourly = 0.05;
    
    // Data processing: $0.02 per GB
    const estimatedDataGB = resource.config._estimated_data_gb || 100;
    const dataCost = this.monthlyToHourly(estimatedDataGB * 0.02);
    
    const total = hourly + dataCost;

    return this.formatCostResponse(total, {
      attachment: hourly,
      dataProcessing: dataCost
    }, {
      estimatedDataGB
    });
  }

  async calculateVPCPeeringCost(resource, region) {
    // VPC Peering is free for same-region
    // Cross-region peering has data transfer costs
    const config = resource.config;
    const isCrossRegion = config.peer_region && config.peer_region !== region;
    
    if (!isCrossRegion) {
      return this.formatCostResponse(0, {}, {
        note: 'Same-region VPC peering is free (data transfer within AZ)'
      });
    }

    // Cross-region data transfer
    const estimatedDataGB = config._estimated_data_gb || 100;
    const dataTransferPrice = 0.02; // $0.02 per GB cross-region
    const dataCost = this.monthlyToHourly(estimatedDataGB * dataTransferPrice);

    return this.formatCostResponse(dataCost, {
      dataTransfer: dataCost
    }, {
      crossRegion: true,
      estimatedDataGB
    });
  }

  async calculateFlowLogCost(resource, region) {
    const config = resource.config;
    const destination = config.log_destination_type || 'cloud-watch-logs';
    
    // Estimate log volume (default: 10GB/month)
    const estimatedLogGB = config._estimated_log_gb || 10;
    
    let storageCost = 0;
    if (destination === 'cloud-watch-logs') {
      // CloudWatch Logs: $0.50 per GB ingested
      storageCost = estimatedLogGB * 0.50;
    } else if (destination === 's3') {
      // S3: $0.023 per GB
      storageCost = estimatedLogGB * 0.023;
    }
    
    const hourly = this.monthlyToHourly(storageCost);

    return this.formatCostResponse(hourly, {
      storage: hourly
    }, {
      destination,
      estimatedLogGB,
      note: 'Cost depends on actual log volume'
    });
  }

  async getNATGatewayPricing(region) {
    const cacheKey = `nat-gateway-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const pricing = {
      hourlyPrice: 0.045,
      dataProcessingPerGB: 0.045
    };

    this.setCache(cacheKey, pricing);
    return pricing;
  }
}