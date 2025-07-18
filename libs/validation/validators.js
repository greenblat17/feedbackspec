import { createValidationError } from "../errors/error-handler.js";

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
};

/**
 * Validation rules for different data types
 */
export const VALIDATION_RULES = {
  // Feedback validation
  feedback: {
    title: {
      required: true,
      minLength: 3,
      maxLength: 200,
      type: "string",
    },
    content: {
      required: true,
      minLength: 10,
      maxLength: 2000,
      type: "string",
    },
    source: {
      required: true,
      type: "string",
      enum: [
        "manual",
        "email",
        "twitter",
        "discord",
        "slack",
        "github",
        "website",
        "survey",
        "support",
        "other",
      ],
    },
    priority: {
      required: true,
      type: "string",
      enum: ["low", "medium", "high", "urgent"],
    },
    category: {
      required: true,
      type: "string",
      enum: [
        "feature",
        "bug",
        "improvement",
        "complaint",
        "praise",
        "question",
        "suggestion",
        "other",
      ],
    },
    userEmail: {
      required: false,
      type: "string",
      pattern: VALIDATION_PATTERNS.EMAIL,
      maxLength: 254,
    },
    tags: {
      required: false,
      type: "array",
      maxItems: 10,
      itemMaxLength: 50,
    },
    metadata: {
      required: false,
      type: "object",
      maxSize: 1000, // JSON string size limit
    },
  },

  // Spec generation validation
  specGeneration: {
    feedbackId: {
      required: true,
      type: "string",
      pattern: VALIDATION_PATTERNS.UUID,
    },
    clusterId: {
      required: false,
      type: "string",
      pattern: VALIDATION_PATTERNS.UUID,
    },
    theme: {
      required: false,
      type: "string",
      minLength: 3,
      maxLength: 200,
    },
    feedbackList: {
      required: false,
      type: "array",
      maxItems: 100,
      minItems: 1,
    },
  },

  // User profile validation
  userProfile: {
    email: {
      required: true,
      type: "string",
      pattern: VALIDATION_PATTERNS.EMAIL,
      maxLength: 254,
    },
    name: {
      required: false,
      type: "string",
      minLength: 1,
      maxLength: 100,
    },
    company: {
      required: false,
      type: "string",
      maxLength: 100,
    },
    phone: {
      required: false,
      type: "string",
      pattern: VALIDATION_PATTERNS.PHONE,
      maxLength: 20,
    },
  },

  // Stripe validation
  stripe: {
    priceId: {
      required: true,
      type: "string",
      minLength: 1,
    },
    mode: {
      required: true,
      type: "string",
      enum: ["payment", "subscription"],
    },
    successUrl: {
      required: true,
      type: "string",
      pattern: VALIDATION_PATTERNS.URL,
    },
    cancelUrl: {
      required: true,
      type: "string",
      pattern: VALIDATION_PATTERNS.URL,
    },
    returnUrl: {
      required: true,
      type: "string",
      pattern: VALIDATION_PATTERNS.URL,
    },
  },
};

/**
 * Input sanitization helper
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  // Basic XSS protection - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .trim();
}

/**
 * Validate a single field against its rule
 */
export function validateField(fieldName, value, rule) {
  const errors = [];

  // Required field validation
  if (
    rule.required &&
    (value === null || value === undefined || value === "")
  ) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  // Skip other validations if field is empty and not required
  if (
    !rule.required &&
    (value === null || value === undefined || value === "")
  ) {
    return errors;
  }

  // Type validation
  if (rule.type === "string" && typeof value !== "string") {
    errors.push(`${fieldName} must be a string`);
  } else if (rule.type === "array" && !Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
  } else if (rule.type === "number" && typeof value !== "number") {
    errors.push(`${fieldName} must be a number`);
  } else if (rule.type === "boolean" && typeof value !== "boolean") {
    errors.push(`${fieldName} must be a boolean`);
  } else if (
    rule.type === "object" &&
    (typeof value !== "object" || Array.isArray(value))
  ) {
    errors.push(`${fieldName} must be an object`);
  }

  // Length validation for strings
  if (rule.type === "string" && typeof value === "string") {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(
        `${fieldName} must be at least ${rule.minLength} characters long`
      );
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${fieldName} cannot exceed ${rule.maxLength} characters`);
    }
  }

  // Array validation
  if (rule.type === "array" && Array.isArray(value)) {
    if (rule.minItems && value.length < rule.minItems) {
      errors.push(`${fieldName} must have at least ${rule.minItems} items`);
    }
    if (rule.maxItems && value.length > rule.maxItems) {
      errors.push(`${fieldName} cannot have more than ${rule.maxItems} items`);
    }
    if (rule.itemMaxLength) {
      const invalidItems = value.filter(
        (item) => typeof item === "string" && item.length > rule.itemMaxLength
      );
      if (invalidItems.length > 0) {
        errors.push(
          `${fieldName} items cannot exceed ${rule.itemMaxLength} characters`
        );
      }
    }
  }

  // Number validation
  if (rule.type === "number" && typeof value === "number") {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${fieldName} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${fieldName} cannot exceed ${rule.max}`);
    }
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rule.enum.join(", ")}`);
  }

  // Pattern validation
  if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
    errors.push(`${fieldName} has invalid format`);
  }

  // Object size validation (for metadata)
  if (rule.type === "object" && rule.maxSize && typeof value === "object") {
    const jsonSize = JSON.stringify(value).length;
    if (jsonSize > rule.maxSize) {
      errors.push(`${fieldName} is too large (max ${rule.maxSize} characters)`);
    }
  }

  return errors;
}

/**
 * Validate data against a set of rules
 */
export function validateData(data, rules) {
  const errors = [];

  // Validate each field according to rules
  Object.entries(rules).forEach(([fieldName, rule]) => {
    const fieldErrors = validateField(fieldName, data[fieldName], rule);
    errors.push(...fieldErrors);
  });

  return errors;
}

/**
 * Validate and sanitize feedback data
 */
export function validateFeedback(data) {
  // Sanitize string inputs
  const sanitizedData = {
    title: sanitizeInput(data.title),
    content: sanitizeInput(data.content),
    source: data.source,
    priority: data.priority,
    category: data.category,
    userEmail: data.userEmail ? sanitizeInput(data.userEmail) : null,
    tags: data.tags,
    metadata: data.metadata,
  };

  // Validate the data
  const validationErrors = validateData(sanitizedData, VALIDATION_RULES.feedback);

  // Additional custom validations for feedback
  if (sanitizedData.tags && Array.isArray(sanitizedData.tags)) {
    // Check for duplicate tags
    const uniqueTags = [...new Set(sanitizedData.tags)];
    if (uniqueTags.length !== sanitizedData.tags.length) {
      validationErrors.push("Tags must be unique");
    }

    // Check for empty tags
    const emptyTags = sanitizedData.tags.filter((tag) => !tag || tag.trim() === "");
    if (emptyTags.length > 0) {
      validationErrors.push("Tags cannot be empty");
    }
  }

  if (validationErrors.length > 0) {
    throw createValidationError(validationErrors.join(", "), validationErrors);
  }

  return sanitizedData;
}

/**
 * Validate spec generation request
 */
export function validateSpecGeneration(data) {
  const validationErrors = validateData(data, VALIDATION_RULES.specGeneration);

  // Custom validation for spec generation
  if (data.feedbackList && Array.isArray(data.feedbackList)) {
    if (data.feedbackList.length === 0) {
      validationErrors.push("Feedback list cannot be empty");
    }
  }

  if (!data.feedbackId && !data.clusterId) {
    validationErrors.push("Either feedbackId or clusterId is required");
  }

  if (validationErrors.length > 0) {
    throw createValidationError(validationErrors.join(", "), validationErrors);
  }

  return data;
}

/**
 * Validate user profile data
 */
export function validateUserProfile(data) {
  const sanitizedData = {
    email: sanitizeInput(data.email),
    name: data.name ? sanitizeInput(data.name) : null,
    company: data.company ? sanitizeInput(data.company) : null,
    phone: data.phone ? sanitizeInput(data.phone) : null,
  };

  const validationErrors = validateData(sanitizedData, VALIDATION_RULES.userProfile);

  if (validationErrors.length > 0) {
    throw createValidationError(validationErrors.join(", "), validationErrors);
  }

  return sanitizedData;
}

/**
 * Validate Stripe request data
 */
export function validateStripeRequest(data, type = "checkout") {
  const rules = type === "checkout" 
    ? { 
        priceId: VALIDATION_RULES.stripe.priceId,
        mode: VALIDATION_RULES.stripe.mode,
        successUrl: VALIDATION_RULES.stripe.successUrl,
        cancelUrl: VALIDATION_RULES.stripe.cancelUrl,
      }
    : { 
        returnUrl: VALIDATION_RULES.stripe.returnUrl,
      };

  const validationErrors = validateData(data, rules);

  if (validationErrors.length > 0) {
    throw createValidationError(validationErrors.join(", "), validationErrors);
  }

  return data;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params) {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = params;

  // Validate page
  if (typeof page !== "number" || page < 1) {
    throw createValidationError("Page must be a positive number");
  }

  // Validate limit
  if (typeof limit !== "number" || limit < 1 || limit > 100) {
    throw createValidationError("Limit must be between 1 and 100");
  }

  // Validate sort order
  if (!["asc", "desc"].includes(sortOrder)) {
    throw createValidationError("Sort order must be 'asc' or 'desc'");
  }

  return {
    page: Math.floor(page),
    limit: Math.floor(limit),
    sortBy,
    sortOrder,
    offset: (Math.floor(page) - 1) * Math.floor(limit),
  };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid, fieldName = "ID") {
  if (!uuid || typeof uuid !== "string") {
    throw createValidationError(`${fieldName} is required`);
  }

  if (!VALIDATION_PATTERNS.UUID.test(uuid)) {
    throw createValidationError(`${fieldName} must be a valid UUID`);
  }

  return uuid;
}

/**
 * Validate required fields
 */
export function validateRequired(data, requiredFields) {
  const missingFields = requiredFields.filter(
    (field) => !data[field] || (typeof data[field] === "string" && !data[field].trim())
  );

  if (missingFields.length > 0) {
    throw createValidationError(
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }

  return data;
}