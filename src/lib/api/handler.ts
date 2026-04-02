import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, successResponse } from './response';
import { ValidationError, AuthenticationError, ForbiddenError } from './errors/AppError';
import { requireAuth } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';
import { ROLE_SUPER_ADMIN, RoleName } from '@/lib/auth/roles';

export type ApiHandler<T = any> = (
  req: NextRequest,
  context: { params: any }
) => Promise<T>;

export interface HandlerOptions<TBody = any, TQuery = any> {
  bodySchema?: z.ZodSchema<TBody>;
  querySchema?: z.ZodSchema<TQuery>;
  requireAuth?: boolean;
  roles?: string[];
}

/**
 * Higher-order function to wrap Next.js API route handlers
 * with standard error handling, validation, and response formatting.
 */
export function createApiHandler<TBody = any, TQuery = any, TResult = any>(
  handler: (
    req: NextRequest,
    options: { body: TBody; query: TQuery; params: any; user?: any }
  ) => Promise<TResult>,
  options: HandlerOptions<TBody, TQuery> = {}
) {
  return async (req: NextRequest, context: { params: any }) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    logger.info({
      reqId: requestId,
      method: req.method,
      url: req.url,
      params: context.params,
    }, 'API Request Started');

    try {
      let user = null;
      if (options.requireAuth || (options.roles && options.roles.length > 0)) {
        try {
          user = await requireAuth(req);
          if (
            options.roles &&
            options.roles.length > 0 &&
            user.role !== ROLE_SUPER_ADMIN &&
            !(options.roles as RoleName[]).includes(user.role as RoleName)
          ) {
            throw new ForbiddenError('Insufficient permissions');
          }
        } catch (e) {
          if (e instanceof ForbiddenError) throw e;
          throw new AuthenticationError();
        }
      }

      const { searchParams } = new URL(req.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      // Validate Query
      let query = queryParams as TQuery;
      if (options.querySchema) {
        const result = options.querySchema.safeParse(queryParams);
        if (!result.success) {
          throw new ValidationError('Invalid query parameters', result.error.errors);
        }
        query = result.data;
      }

      // Validate Body
      let body = {} as TBody;
      if (options.bodySchema && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        try {
          const json = await req.json();
          const result = options.bodySchema.safeParse(json);
          if (!result.success) {
            throw new ValidationError('Validation failed', result.error.errors);
          }
          body = result.data;
        } catch (e) {
          if (e instanceof ValidationError) throw e;
          throw new ValidationError('Invalid JSON body');
        }
      }

      // Execute handler
      const result = await handler(req, { body, query, params: context.params, user });

      // If handler returns a response object directly, return it
      if (result instanceof Response) {
        return result;
      }

      // Otherwise wrap in success response
      const duration = Date.now() - startTime;
      logger.info({ reqId: requestId, durationMs: duration }, 'API Request Completed');
      return successResponse(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ reqId: requestId, durationMs: duration, err: error }, 'API Request Failed');
      return handleApiError(error);
    }
  };
}
