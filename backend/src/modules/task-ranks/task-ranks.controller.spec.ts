import { Test, TestingModule } from '@nestjs/testing';
import { TaskRanksController } from './task-ranks.controller';
import { TaskRanksService } from './task-ranks.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('TaskRanksController', () => {
  let controller: TaskRanksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskRanksController],
      providers: [
        TaskRanksService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TaskRanksController>(TaskRanksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
