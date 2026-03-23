import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Monetchat REST API Documentation',
      version: '1.0.0',
      description: 'Clean and scalable REST API for Monetchat frontend, mobile, and third-party integrations.',
      contact: {
        name: 'Monetchat Dev Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                details: { type: 'object' },
                code: { type: 'string' },
              },
            },
          },
        },
        ...require('./schemas').commonSchemas,
      },
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/app/api/**/*.ts', './src/lib/api/docs/schemas.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
