import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

// Generic validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: Record<string, string> = {};
      error.details.forEach((detail) => {
        const key = detail.path.join('.');
        errors[key] = detail.message;
      });

      return next(new ValidationError('Validation failed', errors));
    }

    // Replace request data with validated/sanitized data
    req[property] = value;
    next();
  };
};

// Validate multiple schemas (body, params, query)
export const validateMultiple = (schemas: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: Record<string, string> = {};

    for (const [property, schema] of Object.entries(schemas)) {
      if (schema) {
        const { error, value } = schema.validate(
          req[property as 'body' | 'params' | 'query'],
          {
            abortEarly: false,
            stripUnknown: true,
          }
        );

        if (error) {
          error.details.forEach((detail) => {
            const key = `${property}.${detail.path.join('.')}`;
            allErrors[key] = detail.message;
          });
        } else {
          req[property as 'body' | 'params' | 'query'] = value;
        }
      }
    }

    if (Object.keys(allErrors).length > 0) {
      return next(new ValidationError('Validation failed', allErrors));
    }

    next();
  };
};
