import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { createValidationError } from "../lib/errors.js";

type RequestSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

function parseOrThrow(schema: ZodTypeAny, value: unknown) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw createValidationError(result.error);
  }

  return result.data;
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = parseOrThrow(schemas.params, req.params) as typeof req.params;
      }

      if (schemas.query) {
        req.query = parseOrThrow(schemas.query, req.query) as typeof req.query;
      }

      if (schemas.body) {
        req.body = parseOrThrow(schemas.body, req.body);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
