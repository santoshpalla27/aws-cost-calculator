import { 
  DescribeInstanceTypesCommand,
  DescribeImagesCommand,
  DescribeAvailabilityZonesCommand
} from '@aws-sdk/client-ec2';
import { 
  DescribeDBInstancesCommand,
  DescribeDBEngineVersionsCommand
} from '@aws-sdk/client-rds';
import logger from '../config/logger.config.js';

export class AWSMetadataService {
  constructor(awsClientFactory) {
    this.clientFactory = awsClientFactory;
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  async getEC2InstanceTypes(region = 'us-east-1') {
    const cacheKey = `ec2-instance-types-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const ec2Client = this.clientFactory.createEC2Client(region);
      const command = new DescribeInstanceTypesCommand({});
      const response = await ec2Client.send(command);

      const instanceTypes = response.InstanceTypes.map(type => ({
        instanceType: type.InstanceType,
        vcpu: type.VCpuInfo?.DefaultVCpus,
        memory: type.MemoryInfo?.SizeInMiB,
        networkPerformance: type.NetworkInfo?.NetworkPerformance,
        storage: type.InstanceStorageInfo
      }));

      this.setCache(cacheKey, instanceTypes);
      return instanceTypes;
    } catch (error) {
      logger.error('Error fetching EC2 instance types:', error);
      throw error;
    }
  }

  async getEC2InstanceTypeDetails(instanceType, region = 'us-east-1') {
    try {
      const ec2Client = this.clientFactory.createEC2Client(region);
      const command = new DescribeInstanceTypesCommand({
        InstanceTypes: [instanceType]
      });
      const response = await ec2Client.send(command);

      if (response.InstanceTypes.length === 0) {
        return null;
      }

      const type = response.InstanceTypes[0];
      return {
        instanceType: type.InstanceType,
        vcpu: type.VCpuInfo?.DefaultVCpus || 2,
        memory: type.MemoryInfo?.SizeInMiB || 4096,
        networkPerformance: type.NetworkInfo?.NetworkPerformance || 'Moderate',
        storage: type.InstanceStorageInfo || null,
        processorInfo: type.ProcessorInfo
      };
    } catch (error) {
      logger.warn(`Could not fetch details for instance type ${instanceType}:`, error.message);
      return null;
    }
  }

  async getAMIDetails(amiId, region = 'us-east-1') {
    const cacheKey = `ami-${amiId}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const ec2Client = this.clientFactory.createEC2Client(region);
      const command = new DescribeImagesCommand({
        ImageIds: [amiId]
      });
      const response = await ec2Client.send(command);

      if (response.Images.length === 0) {
        return null;
      }

      const ami = response.Images[0];
      const details = {
        amiId: ami.ImageId,
        name: ami.Name,
        architecture: ami.Architecture,
        rootDeviceType: ami.RootDeviceType,
        virtualizationType: ami.VirtualizationType,
        blockDeviceMappings: ami.BlockDeviceMappings
      };

      this.setCache(cacheKey, details);
      return details;
    } catch (error) {
      logger.warn(`Could not fetch AMI details for ${amiId}:`, error.message);
      return null;
    }
  }

  async getRDSEngineVersions(engine, region = 'us-east-1') {
    const cacheKey = `rds-engine-${engine}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const rdsClient = this.clientFactory.createRDSClient(region);
      const command = new DescribeDBEngineVersionsCommand({
        Engine: engine
      });
      const response = await rdsClient.send(command);

      const versions = response.DBEngineVersions.map(v => ({
        engine: v.Engine,
        version: v.EngineVersion,
        dbParameterGroupFamily: v.DBParameterGroupFamily
      }));

      this.setCache(cacheKey, versions);
      return versions;
    } catch (error) {
      logger.warn(`Could not fetch RDS engine versions for ${engine}:`, error.message);
      return [];
    }
  }

  async getAvailabilityZones(region = 'us-east-1') {
    const cacheKey = `az-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const ec2Client = this.clientFactory.createEC2Client(region);
      const command = new DescribeAvailabilityZonesCommand({});
      const response = await ec2Client.send(command);

      const zones = response.AvailabilityZones.map(az => ({
        zoneName: az.ZoneName,
        zoneId: az.ZoneId,
        state: az.State,
        region: az.RegionName
      }));

      this.setCache(cacheKey, zones);
      return zones;
    } catch (error) {
      logger.warn(`Could not fetch availability zones for ${region}:`, error.message);
      return [];
    }
  }

  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    
    const cached = this.cache.get(key);
    return Date.now() - cached.timestamp < this.cacheExpiry;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}