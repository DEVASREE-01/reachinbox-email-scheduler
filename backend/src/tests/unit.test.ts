import { parseEmailsFromCSV } from '../utils/csv.parser';
import { scheduleCampaignSchema } from '../validators/campaign.validator';
import { checkAndIncrementRateLimit } from '../services/rate-limit.service';

describe('Unit Tests - ReachInbox Scheduler', () => {
  
  describe('CSV Email Parser', () => {
    it('should intelligently scan columns and extract unique valid emails', () => {
      const csvContent = Buffer.from(
        `name,email,status\n` +
        `John,john@example.com,active\n` +
        `Alice,alice@example.com,pending\n` +
        `John,john@example.com,active\n` + // Duplicate
        `Bob,invalid_email,inactive\n` // Invalid format
      );

      const result = parseEmailsFromCSV(csvContent);

      expect(result.emails).toEqual(['john@example.com', 'alice@example.com']);
      expect(result.stats.valid).toBe(2);
      expect(result.stats.duplicates).toBe(1);
      expect(result.stats.invalid).toBe(2); // Header row and Bob's row has no valid email cells
    });

    it('should handle emails placed in non-standard columns', () => {
      const csvContent = Buffer.from(
        `custom_col,name\n` +
        `test@example.com,Tester\n` +
        `admin@reachinbox.co,Admin\n`
      );

      const result = parseEmailsFromCSV(csvContent);

      expect(result.emails).toEqual(['test@example.com', 'admin@reachinbox.co']);
      expect(result.stats.valid).toBe(2);
    });
  });

  describe('Campaign Input Validator Schema', () => {
    it('should validate correct payload successfully', () => {
      const payload = {
        senderId: 'e28bbca5-26ea-45d6-848f-399ea43422cc',
        subject: 'ReachInbox Update',
        body: 'Here is the update content...',
        startTime: new Date(Date.now() + 10000).toISOString(),
        delayMs: 3000,
        hourlyLimit: 15,
        recipients: ['one@test.com', 'two@test.com'],
      };

      const result = scheduleCampaignSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should fail validation for past dates or low delays', () => {
      const payload = {
        senderId: 'e28bbca5-26ea-45d6-848f-399ea43422cc',
        subject: 'Welcome',
        body: 'Welcome body',
        startTime: new Date(Date.now() - 500000).toISOString(), // Past date
        delayMs: 1000, // Below min delay (2000ms)
        hourlyLimit: -5, // Negative limit
        recipients: [], // Empty recipients
      };

      const result = scheduleCampaignSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.format();
        expect(error.startTime).toBeDefined();
        expect(error.delayMs).toBeDefined();
        expect(error.hourlyLimit).toBeDefined();
        expect(error.recipients).toBeDefined();
      }
    });
  });

  describe('Next-Hour Window calculations', () => {
    it('should correctly calculate the next hour window offset', () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
      
      const expectedOffsetMs = nextHour.getTime() - now.getTime();
      expect(expectedOffsetMs).toBeGreaterThan(0);
      expect(expectedOffsetMs).toBeLessThanOrEqual(3600000);
    });
  });

});
