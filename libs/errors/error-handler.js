import { NextResponse } from "next/server";

/**
 * Standard error codes and messages
 */
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  
  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  DUPLICATE_RECORD: "DUPLICATE_RECORD",
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  STRIPE_ERROR: "STRIPE_ERROR",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // General errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BAD_REQUEST: "BAD_REQUEST",
};

/**
 * Error messages for different error codes
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: "Authentication required",
  [ERROR_CODES.FORBIDDEN]: "Access denied",
  [ERROR_CODES.TOKEN_EXPIRED]: "Session expired, please sign in again",
  [ERROR_CODES.VALIDATION_ERROR]: "Invalid input data",
  [ERROR_CODES.INVALID_INPUT]: "The provided input is invalid",
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: "Required field is missing",
  [ERROR_CODES.DATABASE_ERROR]: "Database operation failed",
  [ERROR_CODES.RECORD_NOT_FOUND]: "Record not found",
  [ERROR_CODES.DUPLICATE_RECORD]: "Record already exists",
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: "External service error",
  [ERROR_CODES.AI_SERVICE_ERROR]: "AI service is temporarily unavailable",
  [ERROR_CODES.STRIPE_ERROR]: "Payment processing error",
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Too many requests, please try again later",
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: "Internal server error",
  [ERROR_CODES.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
  [ERROR_CODES.BAD_REQUEST]: "Bad request",
};

/**
 * HTTP status codes for different error types
 */
export const ERROR_STATUS_CODES = {
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.RECORD_NOT_FOUND]: 404,
  [ERROR_CODES.DUPLICATE_RECORD]: 409,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
  [ERROR_CODES.AI_SERVICE_ERROR]: 503,
  [ERROR_CODES.STRIPE_ERROR]: 502,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.BAD_REQUEST]: 400,
};

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(code, message, details = null, statusCode = null) {
    super(message || ERROR_MESSAGES[code] || "Unknown error");
    
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode || ERROR_STATUS_CODES[code] || 500;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(error, context = null) {
  let errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR];
  let statusCode = 500;
  let details = null;

  if (error instanceof AppError) {
    errorCode = error.code;
    message = error.message;
    statusCode = error.statusCode;
    details = error.details;
  } else {
    // Map common error types
    if (error.message?.includes("JWT expired")) {
      errorCode = ERROR_CODES.TOKEN_EXPIRED;
    } else if (error.message?.includes("unauthorized") || error.message?.includes("401")) {
      errorCode = ERROR_CODES.UNAUTHORIZED;
    } else if (error.message?.includes("forbidden") || error.message?.includes("403")) {
      errorCode = ERROR_CODES.FORBIDDEN;
    } else if (error.message?.includes("not found") || error.message?.includes("404")) {
      errorCode = ERROR_CODES.RECORD_NOT_FOUND;
    } else if (error.message?.includes("validation") || error.message?.includes("invalid")) {
      errorCode = ERROR_CODES.VALIDATION_ERROR;
    } else if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      errorCode = ERROR_CODES.DUPLICATE_RECORD;
    }
    
    message = ERROR_MESSAGES[errorCode];
    statusCode = ERROR_STATUS_CODES[errorCode];
  }

  const response = {
    success: false,
    error: errorCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  if (context) {
    response.context = context;
  }

  // Log error for debugging (but don't expose sensitive info)
  console.error(`[API Error] ${context || "Unknown"}:`, {
    code: errorCode,
    message: error.message,
    stack: error.stack,
    timestamp: response.timestamp,
  });

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Wrap API route handlers with error handling
 */
export function withErrorHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return createErrorResponse(error, context?.params?.slug || "API");
    }
  };
}

/**
 * Validation error helper
 */
export function createValidationError(message, details = null) {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, details);
}

/**
 * Authentication error helper
 */
export function createAuthError(message = null) {
  return new AppError(ERROR_CODES.UNAUTHORIZED, message);
}

/**
 * Database error helper
 */
export function createDatabaseError(message = null, details = null) {
  return new AppError(ERROR_CODES.DATABASE_ERROR, message, details);
}

/**
 * External service error helper
 */
export function createExternalServiceError(service, message = null, details = null) {
  const errorCode = service === "stripe" ? ERROR_CODES.STRIPE_ERROR : 
                   service === "openai" ? ERROR_CODES.AI_SERVICE_ERROR : 
                   ERROR_CODES.EXTERNAL_SERVICE_ERROR;
  
  return new AppError(errorCode, message, details);
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(message = null) {
  return new AppError(ERROR_CODES.RATE_LIMIT_EXCEEDED, message);
}

/**
 * Monitor and log errors to external service
 */
export async function logErrorToMonitoring(error, context = null, userId = null) {
  if (!process.env.MONITORING_ENDPOINT) {
    return;
  }

  try {
    const errorLog = {
      level: "error",
      message: error.message,
      code: error.code || "UNKNOWN",
      context: context,
      userId: userId,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      userAgent: context?.request?.headers?.get("user-agent"),
      ip: context?.request?.headers?.get("x-forwarded-for") || context?.request?.ip,
    };

    await fetch(process.env.MONITORING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MONITORING_API_KEY}`,
      },
      body: JSON.stringify(errorLog),
    });
  } catch (monitoringError) {
    console.error("Failed to log error to monitoring service:", monitoringError.message);
  }
}