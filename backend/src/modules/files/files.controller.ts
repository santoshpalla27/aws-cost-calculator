import { Controller, Post, Get, Delete, Param, Query, UseGuards, UploadedFile, UseInterceptors, Res, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|pdf|doc|docx|txt)$/ }),
        ],
      })
    ) file: Express.Multer.File,
    @Query('context') context?: string,
    @Query('contextId') contextId?: string,
    @Param('userId') userId: string,
  ) {
    return this.filesService.uploadFile(file, userId, context, contextId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':fileId')
  getFileMetadata(
    @Param('fileId') fileId: string,
    @Param('userId') userId: string,
  ) {
    return this.filesService.getFileMetadata(fileId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':fileId/download')
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @Param('userId') userId: string,
    @Query('expiresIn') expiresIn: string,
  ) {
    const expiresInNum = parseInt(expiresIn, 10) || 3600;
    return this.filesService.getDownloadUrl(fileId, userId, expiresInNum);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':fileId')
  deleteFile(
    @Param('fileId') fileId: string,
    @Param('userId') userId: string,
  ) {
    return this.filesService.deleteFile(fileId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  getUserFiles(
    @Param('userId') userId: string,
    @Query('context') context?: string,
    @Query('contextId') contextId?: string,
  ) {
    return this.filesService.getUserFiles(userId, context, contextId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('task/:taskId')
  getTaskFiles(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.filesService.getTaskFiles(taskId, userId);
  }
}