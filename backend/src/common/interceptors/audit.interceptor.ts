import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    
    // Only audit write operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entityType = this.extractEntityType(request.url);
    const entityId = request.params.id || request.body.id;

    return next.handle().pipe(
      tap(async (response) => {
        if (user && entityType && entityId) {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user.id,
                workspaceId: request.body.workspaceId || request.query.workspaceId,
                entityType,
                entityId,
                action: this.mapMethodToAction(method),
                oldValues: method === 'PATCH' ? request.body._old : null,
                newValues: response,
                ipAddress: request.ip,
              },
            });
          } catch (error) {
            // If audit logging fails, don't fail the main request
            console.error('Audit log error:', error);
          }
        }
      }),
    );
  }

  private extractEntityType(url: string): string {
    // Extract entity type from URL (e.g., /api/projects -> 'Project', /api/tasks -> 'Task')
    const parts = url.split('/');
    // Remove empty parts and get the second to last part (the entity type)
    const nonEmptyParts = parts.filter(part => part !== '');
    // Get the last part which should be the entity type
    return nonEmptyParts[nonEmptyParts.length - 1]?.replace(/\?.*/g, '') || 'Unknown'; // Remove query params
  }

  private mapMethodToAction(method: string): any {
    const actionMap: { [key: string]: any } = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actionMap[method] || 'UNKNOWN';
  }
}