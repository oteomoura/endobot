import { retryWithIncrementalDelays, RETRY_CONFIGS, clearRetryNotificationTracker, getRetryNotificationStats } from '../src/services/retryService.js';

describe('RetryService', () => {
  beforeEach(() => {
    clearRetryNotificationTracker();
  });

  test('RETRY_CONFIGS should have correct structure', () => {
    expect(RETRY_CONFIGS.DEFAULT).toBeDefined();
    expect(RETRY_CONFIGS.EMBEDDING).toBeDefined();
    expect(RETRY_CONFIGS.DATABASE).toBeDefined();
    expect(RETRY_CONFIGS.DEFAULT.delays).toBeDefined();
    expect(RETRY_CONFIGS.EMBEDDING.delays).toBeDefined();
    
    console.log('Configs:', JSON.stringify(RETRY_CONFIGS, null, 2));
  });

  test('getRetryNotificationStats should return correct structure', () => {
    const stats = getRetryNotificationStats();
    expect(typeof stats.activeNotifications).toBe('number');
    expect(Array.isArray(stats.trackedUsers)).toBe(true);
    
    console.log('Stats:', stats);
  });

  test('clearRetryNotificationTracker should work', () => {
    clearRetryNotificationTracker();
    const stats = getRetryNotificationStats();
    expect(stats.activeNotifications).toBe(0);
    
    console.log('Tracker cleared successfully');
  });

  test('retryWithIncrementalDelays should succeed on first attempt', async () => {
    const operation = () => Promise.resolve('success');
    const result = await retryWithIncrementalDelays(operation, RETRY_CONFIGS.DEFAULT);
    expect(result).toBe('success');
    
    console.log('Operation succeeded on first attempt');
  });

  test('retryWithIncrementalDelays should handle non-retryable errors', async () => {
    const operation = () => Promise.reject({ response: { status: 500 } });
    
    await expect(retryWithIncrementalDelays(operation, RETRY_CONFIGS.DEFAULT))
      .rejects.toEqual({ response: { status: 500 } });
    
    console.log('Non-retryable error handled correctly');
  });
}); 