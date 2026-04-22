/**
 * Webhook system for notifications
 * Allows external services to receive notifications about events
 */

import crypto from 'crypto';

export enum WebhookEvent {
  DOG_CREATED = 'dog.created',
  DOG_UPDATED = 'dog.updated',
  DOG_DELETED = 'dog.deleted',
  BREEDING_CREATED = 'breeding.created',
  BREEDING_UPDATED = 'breeding.updated',
  HEALTH_RECORD_CREATED = 'health_record.created',
  HEALTH_RECORD_UPDATED = 'health_record.updated',
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  IMPORT_COMPLETED = 'import.completed',
  IMPORT_FAILED = 'import.failed',
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  signature: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  statusCode: number;
  response: string;
  success: boolean;
  attemptedAt: Date;
  retryCount: number;
  nextRetryAt?: Date;
}

/**
 * Generate signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  data: any
): Promise<boolean> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    signature: '',
  };

  const payloadString = JSON.stringify(payload);
  payload.signature = generateSignature(payloadString, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': payload.signature,
        'X-Webhook-Event': event,
        'X-Webhook-ID': webhook.id,
        'User-Agent': 'GSD-Atlas-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const success = response.ok;
    
    // Update webhook stats
    if (success) {
      webhook.failureCount = 0;
    } else {
      webhook.failureCount++;
    }
    webhook.lastTriggeredAt = new Date();

    return success;
  } catch (error) {
    webhook.failureCount++;
    webhook.lastTriggeredAt = new Date();
    console.error(`Webhook delivery failed for ${webhook.url}:`, error);
    return false;
  }
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: any,
  webhooks: Webhook[]
): Promise<void> {
  const relevantWebhooks = webhooks.filter(
    (w) => w.isActive && w.events.includes(event) && w.failureCount < 5
  );

  // Send webhooks in parallel
  const promises = relevantWebhooks.map((webhook) =>
    sendWebhook(webhook, event, data)
  );

  await Promise.allSettled(promises);
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedWebhooks(
  deliveries: WebhookDelivery[],
  maxRetries: number = 3
): Promise<void> {
  const now = new Date();
  const failedDeliveries = deliveries.filter(
    (d) =>
      !d.success &&
      d.retryCount < maxRetries &&
      (!d.nextRetryAt || d.nextRetryAt <= now)
  );

  for (const delivery of failedDeliveries) {
    const webhook = await getWebhookById(delivery.webhookId);
    if (!webhook || !webhook.isActive) continue;

    const success = await sendWebhook(webhook, delivery.payload.event, delivery.payload.data);

    delivery.retryCount++;
    delivery.attemptedAt = now;

    if (success) {
      delivery.success = true;
    } else {
      // Exponential backoff: 1min, 5min, 15min, 1hour, 3hours
      const backoffMinutes = Math.min(60 * Math.pow(3, delivery.retryCount), 180);
      delivery.nextRetryAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);
    }
  }
}

// Placeholder functions - these would be implemented with actual database calls
async function getWebhookById(id: string): Promise<Webhook | null> {
  // TODO: Implement with Prisma
  return null;
}
