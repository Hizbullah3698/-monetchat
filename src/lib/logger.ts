import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Sensitive keys to redact from logs
const redactPaths = [
    'password',
    '*.password',
    'token',
    '*.token',
    'refreshToken',
    '*.refreshToken',
    'accessToken',
    '*.accessToken',
    'secret',
    '*.secret',
    'authorization',
    'req.headers.authorization',
];

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    redact: {
        paths: redactPaths,
        censor: '[REDACTED]',
    },
    // pino-pretty transport breaks Next.js Turbopack worker threads
    // Output standard JSON instead in development
});

// Provide a default export as well for convenience
export default logger;
