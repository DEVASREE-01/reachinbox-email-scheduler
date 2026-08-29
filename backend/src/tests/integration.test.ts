import { scheduleCampaign } from '../services/scheduler.service';
import { addEmailJob } from '../queues/email.queue';
import { prisma } from '../config/database';

jest.mock('../config/database', () => {
  const databaseMock: any = {
    sender: {
      findFirst: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    email: {
      createMany: jest.fn(),
      update: jest.fn(),
    },
    slackConnection: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    prisma: databaseMock,
  };
});

jest.mock('../queues/email.queue', () => ({
  addEmailJob: jest.fn(),
}));

jest.mock('../services/search.service', () => ({
  indexEmail: jest.fn().mockResolvedValue(true),
  updateEmailStatusInSearch: jest.fn().mockResolvedValue(true),
}));

describe('Integration Tests - ReachInbox Scheduler', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule campaign: create DB records and queue BullMQ jobs', async () => {
    const input = {
      userId: 'user-uuid',
      senderId: 'sender-uuid',
      subject: 'Integration Test',
      body: 'Testing scheduling flow...',
      startTime: new Date(Date.now() + 100000),
      delayMs: 3000,
      hourlyLimit: 20,
      recipients: ['alice@test.com', 'bob@test.com'],
    };

    // Mock sender check
    (prisma.sender.findFirst as jest.Mock).mockResolvedValue({ id: 'sender-uuid', userId: 'user-uuid' });

    // Mock transaction implementation
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });

    // Mock search indexing
    const { indexEmail } = require('../services/search.service');
    (indexEmail as jest.Mock).mockResolvedValue(true);

    // Mock campaign create
    const fakeCampaign = { id: 'campaign-uuid', ...input };
    (prisma.campaign.create as jest.Mock).mockResolvedValue(fakeCampaign);

    // Call service
    await scheduleCampaign(input);

    // Assertions
    expect(prisma.sender.findFirst).toHaveBeenCalledWith({
      where: { id: 'sender-uuid', userId: 'user-uuid' },
    });
    expect(prisma.campaign.create).toHaveBeenCalled();
    expect(prisma.email.createMany).toHaveBeenCalled();
    expect(addEmailJob).toHaveBeenCalledTimes(2);

    // Verify first recipient is scheduled immediately, second is delayed by 3s
    const firstCallArgs = (addEmailJob as jest.Mock).mock.calls[0];
    const secondCallArgs = (addEmailJob as jest.Mock).mock.calls[1];

    expect(firstCallArgs[0].recipient).toBeUndefined(); // job payload only has IDs
    expect(firstCallArgs[0].emailId).toBeDefined();
    expect(secondCallArgs[1] - firstCallArgs[1]).toBeCloseTo(3000, -2); // delayMs check
  });
  
});
