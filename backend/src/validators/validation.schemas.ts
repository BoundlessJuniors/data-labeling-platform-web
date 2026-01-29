import Joi from 'joi';

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = Joi.string().uuid().required();

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const idParamSchema = Joi.object({
  id: uuidSchema,
});

// ============================================================================
// Auth Schemas
// ============================================================================

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
  role: Joi.string().valid('client', 'labeler').required().messages({
    'any.only': 'Role must be either client or labeler',
    'any.required': 'Role is required',
  }),
  displayName: Joi.string().max(100).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// ============================================================================
// Dataset Schemas
// ============================================================================

export const createDatasetSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Dataset name is required',
    'any.required': 'Dataset name is required',
  }),
  description: Joi.string().max(1000).optional().allow(''),
  status: Joi.string().valid('draft', 'uploading', 'ready', 'archived').optional(),
});

export const updateDatasetSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  status: Joi.string().valid('draft', 'uploading', 'ready', 'archived').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// ============================================================================
// Asset Schemas
// ============================================================================

export const createAssetSchema = Joi.object({
  datasetId: uuidSchema.messages({
    'any.required': 'Dataset ID is required',
  }),
  objectKey: Joi.string().min(1).max(500).required().messages({
    'any.required': 'Object key is required',
  }),
  mimeType: Joi.string().max(100).required().messages({
    'any.required': 'MIME type is required',
  }),
  width: Joi.number().integer().positive().optional(),
  height: Joi.number().integer().positive().optional(),
  sizeBytes: Joi.number().integer().positive().optional(),
  checksum: Joi.string().max(255).optional(),
});

export const updateAssetSchema = Joi.object({
  objectKey: Joi.string().min(1).max(500).optional(),
  mimeType: Joi.string().max(100).optional(),
  width: Joi.number().integer().positive().optional(),
  height: Joi.number().integer().positive().optional(),
  sizeBytes: Joi.number().integer().positive().optional(),
  checksum: Joi.string().max(255).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// ============================================================================
// LabelSet Schemas
// ============================================================================

export const createLabelSetSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'LabelSet name is required',
  }),
  version: Joi.number().integer().positive().optional().default(1),
  labels: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(255).required(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FF5733)',
      }),
      attributesSchemaJson: Joi.object().optional(),
    })
  ).optional(),
});

// ============================================================================
// Listing Schemas
// ============================================================================

export const createListingSchema = Joi.object({
  datasetId: uuidSchema.messages({
    'any.required': 'Dataset ID is required',
  }),
  title: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Listing title is required',
  }),
  description: Joi.string().max(2000).optional().allow(''),
  labelSetId: uuidSchema.messages({
    'any.required': 'LabelSet ID is required',
  }),
  labelSetVersion: Joi.number().integer().positive().required().messages({
    'any.required': 'LabelSet version is required',
  }),
  labelingSpecJson: Joi.object().required().messages({
    'any.required': 'Labeling specification is required',
  }),
  qcMode: Joi.string().valid('none', 'client_approval', 'internal_reviewer').optional().default('none'),
  priceTotal: Joi.number().positive().precision(2).required().messages({
    'any.required': 'Price is required',
  }),
  currency: Joi.string().length(3).uppercase().required().messages({
    'any.required': 'Currency is required',
    'string.length': 'Currency must be a 3-letter code (e.g., USD)',
  }),
  deadlineAt: Joi.date().iso().greater('now').optional(),
});

export const updateListingSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional().allow(''),
  qcMode: Joi.string().valid('none', 'client_approval', 'internal_reviewer').optional(),
  priceTotal: Joi.number().positive().precision(2).optional(),
  deadlineAt: Joi.date().iso().greater('now').optional().allow(null),
  status: Joi.string().valid('open', 'in_progress', 'completed', 'cancelled').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});
