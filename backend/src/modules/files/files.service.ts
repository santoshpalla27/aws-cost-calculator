import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from './s3.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    context?: string,
    contextId?: string,
  ) {
    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 
      'text/plain', 'text/csv',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    // Generate a unique filename
    const filename = this.s3Service.generateFileName(file.originalname, context);

    try {
      // Upload to S3
      await this.s3Service.uploadFile(
        file.buffer,
        filename,
        file.mimetype,
      );

      // Save file metadata to database
      const fileRecord = await this.prisma.attachment.create({
        data: {
          fileName: file.originalname,
          fileUrl: filename, // Store the S3 key, not the full URL
          mimeType: file.mimetype,
          fileSize: file.size,
          taskId: context === 'task' ? contextId : undefined,
          uploadedBy: userId,
        },
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              email: true,
            }
          }
        }
      });

      return {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        fileUrl: fileRecord.fileUrl, // This is the S3 key
        mimeType: fileRecord.mimeType,
        fileSize: fileRecord.fileSize,
        uploadedAt: fileRecord.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error}`);
      throw error;
    }
  }

  async getFileMetadata(fileId: string, userId: string) {
    // Check if user has access to the file
    // This checks if it's a file attached to a task the user has access to
    const file = await this.prisma.attachment.findFirst({
      where: {
        id: fileId,
        OR: [
          { uploadedBy: userId }, // User uploaded the file
          { task: { 
              project: { 
                workspace: { 
                  members: { some: { userId } } 
                } 
              } 
            } 
          }, // File is in a task in a workspace the user has access to
          { task: { project: { ownerId: userId } } }, // File is in a project the user owns
        ]
      },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!file) {
      throw new BadRequestException('File not found or insufficient permissions');
    }

    return {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      uploadedAt: file.createdAt,
      uploader: file.uploader,
      task: file.task,
    };
  }

  async getDownloadUrl(fileId: string, userId: string, expiresIn: number = 3600) {
    const file = await this.getFileMetadata(fileId, userId);
    
    try {
      // Generate a signed URL for download
      const url = await this.s3Service.getFileUrl(file.fileUrl, expiresIn);
      
      return {
        downloadUrl: url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      };
    } catch (error) {
      this.logger.error(`Error generating download URL: ${error}`);
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string) {
    // Check if user has permission to delete the file
    const file = await this.prisma.attachment.findFirst({
      where: {
        id: fileId,
        uploadedBy: userId, // Only the uploader can delete
      },
      select: {
        fileUrl: true, // S3 key
      }
    });

    if (!file) {
      throw new BadRequestException('File not found or insufficient permissions');
    }

    try {
      // Delete from S3
      await this.s3Service.deleteFile(file.fileUrl);
      
      // Delete from database
      await this.prisma.attachment.delete({
        where: { id: fileId },
      });

      return { message: 'File deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting file: ${error}`);
      throw error;
    }
  }

  async getUserFiles(userId: string, context?: string, contextId?: string) {
    const whereClause: any = {
      uploadedBy: userId,
    };

    if (context) {
      if (context === 'task' && contextId) {
        whereClause.taskId = contextId;
      }
      // Add more context filters as needed
    }

    return this.prisma.attachment.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
          }
        },
        task: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskFiles(taskId: string, userId: string) {
    // Check if user has access to the task
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { project: { workspace: { members: { some: { userId } } } } },
          { project: { ownerId: userId } }
        ]
      }
    });

    if (!task) {
      throw new BadRequestException('Task not found or insufficient permissions');
    }

    return this.prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}