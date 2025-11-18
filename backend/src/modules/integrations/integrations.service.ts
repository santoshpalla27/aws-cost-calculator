import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { GoogleCalendarService } from './providers/google-calendar.service';
import { GithubService } from './providers/github.service';
import { SlackService } from './providers/slack.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private googleCalendarService: GoogleCalendarService,
    private githubService: GithubService,
    private slackService: SlackService,
  ) {}

  async create(userId: string, createIntegrationDto: CreateIntegrationDto) {
    // Verify user has access to the workspace
    if (createIntegrationDto.workspaceId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: {
          id: createIntegrationDto.workspaceId,
          OR: [
            { members: { some: { userId } } },
            { ownerId: userId }
          ]
        }
      });

      if (!workspace) {
        throw new Error('Workspace not found or insufficient permissions');
      }
    }

    // Encrypt credentials before storing
    let encryptedCredentials = null;
    if (createIntegrationDto.credentials) {
      const salt = await bcrypt.genSalt(10);
      const credentialsString = JSON.stringify(createIntegrationDto.credentials);
      encryptedCredentials = await bcrypt.hash(credentialsString, salt);
    }

    return this.prisma.integration.create({
      data: {
        workspaceId: createIntegrationDto.workspaceId,
        userId, // User who created the integration
        integrationType: createIntegrationDto.integrationType,
        config: createIntegrationDto.config || {},
        credentialsEncrypted: encryptedCredentials,
        active: true,
      },
      include: {
        workspace: true,
      },
    });
  }

  async findAll(userId: string, filters?: { workspaceId?: string; type?: string }) {
    const whereClause: any = {
      OR: [
        { userId }, // User's personal integrations
        { workspace: { members: { some: { userId } } } }, // Workspace integrations
      ],
    };

    if (filters?.workspaceId) {
      whereClause.workspaceId = filters.workspaceId;
    }
    if (filters?.type) {
      whereClause.integrationType = filters.type;
    }

    return this.prisma.integration.findMany({
      where: whereClause,
      include: {
        workspace: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.integration.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Owner of the integration
          { workspace: { members: { some: { userId } } } }, // Members of the workspace
        ],
      },
      include: {
        workspace: true,
      },
    });
  }

  async update(id: string, updateIntegrationDto: UpdateIntegrationDto, userId: string) {
    // Check if user has permission to update
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Owner of the integration
          { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } }, // Admins of the workspace
        ],
      },
    });

    if (!integration) {
      throw new Error('Integration not found or insufficient permissions');
    }

    const updateData: any = {
      config: updateIntegrationDto.config || integration.config,
      active: updateIntegrationDto.active !== undefined ? updateIntegrationDto.active : integration.active,
    };

    // Handle credentials update if provided
    if (updateIntegrationDto.credentials) {
      const salt = await bcrypt.genSalt(10);
      const credentialsString = JSON.stringify(updateIntegrationDto.credentials);
      updateData.credentialsEncrypted = await bcrypt.hash(credentialsString, salt);
    }

    return this.prisma.integration.update({
      where: { id },
      data: updateData,
      include: {
        workspace: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Check if user has permission to delete
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Owner of the integration
          { workspace: { members: { some: { userId, role: { in: ['ADMIN', 'OWNER'] } } } } }, // Admins of the workspace
        ],
      },
    });

    if (!integration) {
      throw new Error('Integration not found or insufficient permissions');
    }

    return this.prisma.integration.delete({
      where: { id },
    });
  }

  async triggerSync(id: string, userId: string) {
    // Verify user has access to trigger sync
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Owner of the integration
          { workspace: { members: { some: { userId } } } }, // Members of the workspace
        ],
      },
    });

    if (!integration) {
      throw new Error('Integration not found or insufficient permissions');
    }

    // Get the integration credentials
    let credentials = null;
    if (integration.credentialsEncrypted) {
      // Decryption would happen here in a real implementation
      // For now, we'll just pass the encrypted credentials through
      credentials = integration.credentialsEncrypted;
    }

    // Call the appropriate provider service based on integration type
    switch (integration.integrationType) {
      case 'GOOGLE_CALENDAR':
        return this.googleCalendarService.sync(
          integration.userId,
          integration.config,
          credentials
        );
      case 'GITHUB':
        return this.githubService.sync(
          integration.userId,
          integration.config,
          credentials
        );
      case 'SLACK':
        return this.slackService.sync(
          integration.userId,
          integration.config,
          credentials
        );
      default:
        throw new Error(`Sync not implemented for integration type: ${integration.integrationType}`);
    }
  }

  async testConnection(id: string, userId: string) {
    // Verify user has access to test connection
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Owner of the integration
          { workspace: { members: { some: { userId } } } }, // Members of the workspace
        ],
      },
    });

    if (!integration) {
      throw new Error('Integration not found or insufficient permissions');
    }

    // Get the integration credentials
    let credentials = null;
    if (integration.credentialsEncrypted) {
      // Decryption would happen here in a real implementation
      credentials = integration.credentialsEncrypted;
    }

    // Call the appropriate provider service based on integration type
    switch (integration.integrationType) {
      case 'GOOGLE_CALENDAR':
        return this.googleCalendarService.testConnection(
          integration.config,
          credentials
        );
      case 'GITHUB':
        return this.githubService.testConnection(
          integration.config,
          credentials
        );
      case 'SLACK':
        return this.slackService.testConnection(
          integration.config,
          credentials
        );
      default:
        throw new Error(`Test connection not implemented for integration type: ${integration.integrationType}`);
    }
  }
}