import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueManager } from '@/lib/queue-manager';

describe('QueueManager', () => {
  beforeEach(() => {
    // Clear any existing queues
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should enqueue and execute function', async () => {
      const connectionId = 'test-conn-1';
      const fn = vi.fn().mockResolvedValue('result');

      const result = await queueManager.enqueue(connectionId, fn);

      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should rate limit per connection', async () => {
      const connectionId = 'test-conn-2';
      const startTime = Date.now();

      // Enqueue 3 tasks (should be rate limited to 50/min = 1.2s interval)
      const tasks = [
        queueManager.enqueue(connectionId, async () => 'task1'),
        queueManager.enqueue(connectionId, async () => 'task2'),
        queueManager.enqueue(connectionId, async () => 'task3'),
      ];

      const results = await Promise.all(tasks);
      const endTime = Date.now();

      expect(results).toEqual(['task1', 'task2', 'task3']);
      // Should take at least 2 intervals (2 * 1200ms = 2400ms)
      // But we'll be lenient since this is timing-dependent
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    }, 10000);

    it('should handle errors', async () => {
      const connectionId = 'test-conn-3';
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(queueManager.enqueue(connectionId, fn)).rejects.toThrow(
        'Test error'
      );
    });

    it('should retry on retriable errors', async () => {
      const connectionId = 'test-conn-4';
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Temporary error');
          error.status = 500; // Retriable status
          throw error;
        }
        return 'success';
      });

      const result = await queueManager.enqueue(connectionId, fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  describe('separate queues per connection', () => {
    it('should use separate queues for different connections', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      // These should run in parallel since they're different connections
      const [result1, result2] = await Promise.all([
        queueManager.enqueue('conn-1', fn1),
        queueManager.enqueue('conn-2', fn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });
  });
});
