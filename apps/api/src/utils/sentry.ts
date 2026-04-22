import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry
export function initSentry() {
  if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.GIT_SHA || 'unknown',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: null }),
        new Sentry.Integrations.Postgres(),
        new ProfilingIntegration(),
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
        }
        return event;
      },
      beforeSendTransaction(event, hint) {
        // Filter out health check transactions
        if (event.transaction === 'GET /health') {
          return null;
        }
        return event;
      },
    });
  }
}

// Capture error with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: 'api',
    },
  });
}

// Capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, {
    level,
    tags: {
      component: 'api',
    },
  });
}

// Add user context
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    ip_address: '{{auto}}',
    other: {
      role: user.role,
    },
  });
}

// Clear user context
export function clearUserContext() {
  Sentry.setUser(null);
}

// Start transaction for performance monitoring
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

// Express middleware
export function sentryMiddleware() {
  return Sentry.Handlers.requestHandler();
}

// @ts-ignore - Sentry MiddlewareError type cannot be named
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}
