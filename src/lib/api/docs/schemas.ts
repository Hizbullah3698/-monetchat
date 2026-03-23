/**
 * Common OpenAPI Schemas
 */

export const commonSchemas = {
  CreateProductInput: {
    type: 'object',
    required: ['title', 'price'],
    properties: {
      title: { type: 'string', minLength: 3 },
      titleAr: { type: 'string' },
      description: { type: 'string' },
      descriptionAr: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      currency: { type: 'string', default: 'KWD' },
      isNegotiable: { type: 'boolean', default: true },
      condition: { type: 'string', enum: ['new', 'like_new', 'good', 'fair', 'poor'], default: 'good' },
      regionId: { type: 'integer' },
      imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
      categorySlug: { type: 'string' },
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      price: { type: 'number' },
      currency: { type: 'string' },
      status: { type: 'string' },
      imageUrl: { type: 'string', nullable: true },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateUserInput: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string' },
      role: { type: 'string', enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
      isActive: { type: 'boolean', default: true },
      countryCode: { type: 'string', default: 'KW' },
    },
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      user: { $ref: '#/components/schemas/User' },
      accessToken: { type: 'string' },
    },
  },
};
