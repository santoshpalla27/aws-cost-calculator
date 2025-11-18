import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;

  constructor() {
    // Initialize S3 client with environment variables
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT, // For MinIO or other S3-compatible services
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: process.env.S3_ENDPOINT ? true : undefined, // Required for MinIO
    });
  }

  async uploadFile(
    fileBuffer: Buffer, 
    filename: string, 
    mimetype: string, 
    bucket: string = process.env.S3_BUCKET || 'projectmanager'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: fileBuffer,
      ContentType: mimetype,
    });

    try {
      await this.s3Client.send(command);
      // Return the file key/path, not the full URL, as the URL will be generated as needed
      return filename;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error}`);
      throw error;
    }
  }

  async getFileUrl(
    filename: string, 
    expiresIn: number = 3600, // 1 hour by default
    bucket: string = process.env.S3_BUCKET || 'projectmanager'
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: filename,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL for file: ${error}`);
      throw error;
    }
  }

  async deleteFile(filename: string, bucket: string = process.env.S3_BUCKET || 'projectmanager'): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: filename,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error}`);
      throw error;
    }
  }

  generateFileName(originalName: string, context?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop();
    
    // Create a structured path based on context
    const pathPrefix = context ? `${context}/` : '';
    
    return `${pathPrefix}${timestamp}-${randomString}.${extension}`;
  }
}