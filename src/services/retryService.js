import { sendWhatsAppMessage } from './twilioService.js';

// Track retry notifications to prevent duplicates
const retryNotificationTracker = new Map();

// Configuration
const RETRY_NOTIFICATION_COOLDOWN_MS = 30000; // 30 seconds

// Default notification message
const DEFAULT_NOTIFICATION_MESSAGE = "Estou processando sua solicitação. Pode levar um pouco mais de tempo que o esperado devido ao alto volume. Agradeço a paciência!";

/**
 * Retry configuration for different operations
 */
export const RETRY_CONFIGS = {
  // Incremental retry delays: 5s, 10s, 30s
  DEFAULT: {
    maxRetries: 3,
    delays: [5000, 10000, 30000]
  },
  
  // For embedding generation (shorter delays)
  EMBEDDING: {
    maxRetries: 2,
    delays: [3000, 8000],
    notificationMessage: "Estou processando sua solicitação. Pode levar um pouco mais de tempo que o esperado. Agradeço a paciência!"
  },
  
  // For database operations (longer delays)
  DATABASE: {
    maxRetries: 3,
    delays: [2000, 5000, 15000]
  }
};

/**
 * Generic retry function with incremental delays
 * @param {Function} operation - The async operation to retry
 * @param {Object} config - Retry configuration (maxRetries, delays, notificationMessage)
 * @param {string} userPhoneNumber - User's phone number for notifications (optional)
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} - Result of the operation
 */
export async function retryWithIncrementalDelays(operation, config = RETRY_CONFIGS.DEFAULT, userPhoneNumber = null, operationName = 'operation') {
  let retries = 0;
  const { maxRetries, delays } = config;
  const notificationMessage = config.notificationMessage || DEFAULT_NOTIFICATION_MESSAGE;

  while (retries <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      
      // Check if this is a retryable error (429 rate limit)
      if (!isRetryableError(error)) {
        console.error(`[RetryService] Non-retryable error in ${operationName}:`, error.message || error);
        throw error;
      }

      if (retries > maxRetries) {
        console.error(`[RetryService] Max retries (${maxRetries}) exceeded for ${operationName}.`);
        throw new Error(`O serviço está sobrecarregado no momento. Por favor, tente novamente em alguns instantes.`);
      }

      // Get the delay for this retry attempt
      const delayIndex = Math.min(retries - 1, delays.length - 1);
      const waitTimeMs = delays[delayIndex];
      
      console.warn(`[RetryService] Received retryable error in ${operationName}. Retrying after ${waitTimeMs/1000}s (retry ${retries}/${maxRetries}).`);

      // Send notification if userPhoneNumber is provided
      if (userPhoneNumber && shouldSendRetryNotification(userPhoneNumber)) {
        console.log(`[RetryService] Sending retry notification to ${userPhoneNumber} for ${operationName}.`);
        try {
          await sendWhatsAppMessage(userPhoneNumber, notificationMessage);
          markRetryNotificationSent(userPhoneNumber);
        } catch (notificationError) {
          console.error(`[RetryService] Failed to send retry notification to ${userPhoneNumber}:`, notificationError);
        }
      } else if (userPhoneNumber) {
        console.log(`[RetryService] Skipping retry notification for ${userPhoneNumber} (already sent recently).`);
      }

      // Wait before retrying
      await delay(waitTimeMs);
    }
  }
  
  throw new Error(`[RetryService] Exited retry loop unexpectedly for ${operationName}.`);
}

/**
 * Check if an error is retryable (429 rate limit)
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(error) {
  return error.response && error.response.status === 429;
}

/**
 * Check if we should send a retry notification to a user
 * @param {string} userPhoneNumber - The user's phone number
 * @returns {boolean} - Whether we should send the notification
 */
function shouldSendRetryNotification(userPhoneNumber) {
  const now = Date.now();
  const lastNotification = retryNotificationTracker.get(userPhoneNumber);
  
  if (!lastNotification) {
    return true; // No previous notification
  }
  
  // Check if enough time has passed since the last notification
  return (now - lastNotification) > RETRY_NOTIFICATION_COOLDOWN_MS;
}

/**
 * Mark that a retry notification has been sent to a user
 * @param {string} userPhoneNumber - The user's phone number
 */
function markRetryNotificationSent(userPhoneNumber) {
  retryNotificationTracker.set(userPhoneNumber, Date.now());
  
  // Clean up old entries to prevent memory leaks
  const now = Date.now();
  for (const [phone, timestamp] of retryNotificationTracker.entries()) {
    if ((now - timestamp) > RETRY_NOTIFICATION_COOLDOWN_MS * 2) {
      retryNotificationTracker.delete(phone);
    }
  }
}

/**
 * Utility function to delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clear retry notification tracker (useful for testing)
 */
export function clearRetryNotificationTracker() {
  retryNotificationTracker.clear();
}

/**
 * Get retry notification tracker stats (useful for monitoring)
 */
export function getRetryNotificationStats() {
  return {
    activeNotifications: retryNotificationTracker.size,
    trackedUsers: Array.from(retryNotificationTracker.keys())
  };
} 