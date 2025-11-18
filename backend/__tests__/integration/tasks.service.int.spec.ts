import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../../src/modules/tasks/tasks.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, PrismaService],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const userId = 'test-user-id';
      const createTaskDto: CreateTaskDto = {
        projectId: 'test-project-id',
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        priority: 'MEDIUM',
      };

      // Mock Prisma calls
      jest.spyOn(prisma.project, 'findFirst').mockResolvedValue({
        id: 'test-project-id',
        workspace: { members: [{ userId }] },
      } as any);

      jest.spyOn(prisma.task, 'create').mockResolvedValue({
        id: 'test-task-id',
        ...createTaskDto,
        sequenceNumber: 1,
        reporterId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.create(userId, createTaskDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Task');
      expect(result.description).toBe('Test Description');
      expect(result.status).toBe('TODO');
      expect(result.priority).toBe('MEDIUM');
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const userId = 'test-user-id';
      
      // Mock Prisma call
      jest.spyOn(prisma.task, 'findMany').mockResolvedValue([
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'TODO',
          priority: 'MEDIUM',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await service.findAll(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
    });
  });
});