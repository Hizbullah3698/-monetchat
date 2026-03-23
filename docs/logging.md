# Structured Logging & Monitoring Guide

## Overview

Monetchat uses **[Pino](https://getpino.io/)** for blazing-fast, structured JSON logging. All server-side code (API routes, Next.js server actions, middleware, background queues) should use the global `logger` instance.

By using structured JSON, we can directly export logs to observability platforms like Datadog, New Relic, AWS CloudWatch, and the ELK Stack without writing custom parsing rules.

## Basic Usage

Import the logger from the central library:

```typescript
import { logger } from '@/lib/logger';

// 1. Basic informational messages
logger.info('User successfully updated their profile');

// 2. Logging with structured metadata (highly recommended)
logger.info({ userId: user.id, action: 'PROFILE_UPDATE' }, 'User updated profile');

// 3. Warnings
logger.warn({ reqId, retries: 3 }, 'Third-party API request timeout, retrying...');

// 4. Errors
try {
  await someServiceCall();
} catch (err) {
  logger.error({ err, userId: user.id }, 'Failed to execute service call');
}

// 5. Debug (Only visible when LOG_LEVEL=debug)
logger.debug({ queryData }, 'Executing complex database query');
```

## Best Practices

1. **Use objects for contextual data:** Always pass an object as the *first* argument, and the message string as the *second*.
    - **Good:** `logger.info({ userId: 123 }, "User signed in")`
    - **Bad:** `logger.info("User signed in: " + userId)` (Hard to search in Datadog!)
2. **Standardize field names:**
    - Error objects should be `err`: `logger.error({ err }, ...)`
    - Identify traces with `reqId`
    - Identify users with `userId` and `email`
3. **Sensitive Data:** 
    - The logger automatically redacts standard fields (`password`, `token`, `authorization`, etc.).
    - If you are logging a completely new sensitive field, add it to the `redactPaths` array in `src/lib/logger.ts`.

## Edge Computing Note

Next.js `middleware.ts` runs on the Vercel Edge Runtime, which does not fully support core Node module dependencies required by Pino transports. 
In `middleware.ts`, we emit structured JSON through standard `console.log` exactly mirroring Pino's format. In all other parts of the application, standard `logger` should be used.

## Monitoring Integration (Production)

In development, the logs are formatted nicely in your console using `pino-pretty`. 
In production (`NODE_ENV=production`), `pino-pretty` is automatically disabled, and logs are output as raw newline-delimited JSON.

To forward logs to external systems, you can simply pipe the `stdout` of your Node process to an agent. 

### Datadog
If you are running the Datadog Agent, it will automatically parse Pino's JSON output without any extra Node dependencies. Ensure `DD_LOGS_INJECTION=true` is enabled in your environment.
