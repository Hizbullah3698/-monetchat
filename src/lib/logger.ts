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
    // Use pino-pretty in development for readable console output
    ...(isProduction
        ? {}
        : {
              transport: {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                  },
              },
          }),
});

// Provide a default export as well for convenience
export default logger;
