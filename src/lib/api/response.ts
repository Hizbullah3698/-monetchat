import { NextResponse } from 'next/server';
import { AppError } from './errors/AppError';
import { logger } from '@/lib/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
    code?: string;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    [key: string]: any;
  };
}

export const successResponse = <T>(
  data: T,
  statusCode: number = 200,
  meta?: any
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  return NextResponse.json(response, { status: statusCode });
};

export const errorResponse = (
  message: string,
  statusCode: number = 500,
  details?: any,
  code?: string
) => {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      details,
      code,
    },
  };
  return NextResponse.json(response, { status: statusCode });
};

export const handleApiError = (error: unknown) => {
  logger.error({ err: error }, '[API Error]');

  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.details);
  }

  // Handle Zod validation errors if not already caught
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ZodError') {
    const zodError = error as any;
    return errorResponse('Validation failed', 400, zodError.errors);
  }

  // Default internal server error
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : (error instanceof Error ? error.message : 'Unknown error');
    
  return errorResponse(message, 500);
};
