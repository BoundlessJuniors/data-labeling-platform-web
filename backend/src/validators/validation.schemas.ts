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

export const contractIdParamSchema = Joi.object({
  contractId: uuidSchema,
});

export const uuidArraySchema = Joi.object({
  ids: Joi.array().items(uuidSchema).min(1).required().messages({
    'array.min': 'At least one ID must be provided',
    'any.required': 'IDs array is required',
  }),
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
  inviteCode: Joi.string().trim().max(100).optional().allow(''),
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

export const inviteRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const createInviteCodeSchema = Joi.object({
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address',
  }),
  expiresAt: Joi.date().iso().greater('now').optional(),
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

export const initiateUploadSchema = Joi.object({
  datasetId: uuidSchema.messages({
    'any.required': 'Dataset ID is required',
  }),
  filename: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Filename is required',
  }),
  // Strict allowlist — only raster image types supported by the processing pipeline.
  // SVG, GIF, AVIF, text/html, application/octet-stream and all other types are
  // rejected here before any controller or service logic runs.
  contentType: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/webp')
    .required()
    .messages({
      'any.only': 'Desteklenmeyen dosya formatı. İzin verilen formatlar: image/jpeg, image/png, image/webp',
      'any.required': 'Content-Type zorunludur.',
    }),
  fileSize: Joi.number().integer().positive().required().messages({
    'any.required': 'File size is required',
  }),
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

export const addLabelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Label name is required',
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g., #FF5733)',
  }),
  attributesSchemaJson: Joi.object().optional(),
});

export const updateLabelSetSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  labels: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(255).required(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FF5733)',
      }),
      attributesSchemaJson: Joi.object().optional(),
    })
  ).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
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
  annotationFormat: Joi.string().valid('COCO', 'YOLO', 'VOC', 'Custom').required().messages({
    'any.required': 'Annotation format is required',
  }),
});

export const updateListingSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional().allow(''),
  qcMode: Joi.string().valid('none', 'client_approval', 'internal_reviewer').optional(),
  priceTotal: Joi.number().positive().precision(2).optional(),
  deadlineAt: Joi.date().iso().greater('now').optional().allow(null),
  status: Joi.string().valid('open','payment_pending', 'in_progress', 'completed', 'cancelled').optional(),
  annotationFormat: Joi.string().valid('COCO', 'YOLO', 'VOC', 'Custom').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// ============================================================================
// Contract Schemas
// ============================================================================

// ARCHITECTURAL NOTE:
//   There is no createContractSchema because contract creation happens
//   exclusively through proposal acceptance (PATCH /proposals/:id/accept).

export const rejectContractSchema = Joi.object({
  reason: Joi.string().max(1000).optional().allow(''),
});

export const cancelContractSchema = Joi.object({
  reason: Joi.string().max(1000).optional().allow(''),
});

export const resolveDisputeSchema = Joi.object({
  decision: Joi.string()
    .valid('refund_client', 'release_to_labeler')
    .required()
    .messages({
      'any.only': 'Decision must be refund_client or release_to_labeler',
      'any.required': 'Decision is required',
    }),
  reason: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required',
    'any.required': 'Reason is required',
  }),
});

export const exportContractQuerySchema = Joi.object({
  format: Joi.string().valid('COCO', 'YOLO', 'VOC').required().messages({
    'any.required': 'Export format is required',
    'any.only': 'Export format must be one of: COCO, YOLO, VOC',
  }),
});

export const createContractRatingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be an integer',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),
  comment: Joi.string().trim().max(2000).optional().allow(''),
});

// ============================================================================
// Task Schemas
// ============================================================================

// ARCHITECTURAL NOTE:
//   There is no generateTasksSchema because task generation happens
//   exclusively inside ProposalService.acceptProposal.

export const leaseTaskSchema = Joi.object({
  leaseDurationMinutes: Joi.number().integer().min(5).max(120).optional().default(30),
});

export const leaseTaskBatchSchema = Joi.object({
  contractId: uuidSchema.messages({
    'any.required': 'Contract ID is required',
  }),
  amount: Joi.number().integer().min(1).max(100).optional().default(10).messages({
    'number.min': 'Amount must be at least 1',
    'number.max': 'Amount cannot exceed 100',
  }),
});

// ── Shared annotation payload shape ─────────────────────────────────────────
//
// This schema defines the FULL FINAL annotation snapshot for a single task.
// It is NOT a partial patch or incremental append — each submission contains
// the complete annotation state for that task.
//
// - "type" identifies the annotation geometry/format.
// - "data" is the complete annotation payload (object or array of objects).
// - "export" type represents a full annotation package from the desktop app.
//
// The normalize worker treats the LATEST valid raw row per task as authoritative.
// Enforced in both task submit (POST /tasks/:id/submit) and admin raw annotation
// (POST /annotations/raw).
const annotationPayloadSchema = Joi.object({
  type: Joi.string()
    .valid('bbox', 'polygon', 'polyline', 'keypoint', 'circle', 'export')
    .required()
    .messages({
      'any.required': 'Annotation type is required',
      'any.only': 'Annotation type must be one of: bbox, polygon, polyline, keypoint, circle, export',
    }),
  data: Joi.alternatives()
    .try(Joi.object().unknown(true), Joi.array())
    .required()
    .messages({
      'any.required': 'Annotation data payload is required',
    }),
}).required();

export const submitTaskSchema = Joi.object({
  leaseToken: Joi.string().uuid().required().messages({
    'any.required': 'Lease token is required',
  }),
  annotationData: annotationPayloadSchema.messages({
    'any.required': 'Annotation data is required',
  }),
});

export const rejectTaskSchema = Joi.object({
  reason: Joi.string().max(1000).optional().allow(''),
});

// ============================================================================
// Annotation Schemas
// ============================================================================

export const createAnnotationRawSchema = Joi.object({
  taskId: uuidSchema.messages({
    'any.required': 'Task ID is required',
  }),
  payloadJson: annotationPayloadSchema.messages({
    'any.required': 'Payload JSON is required',
  }),
});

export const normalizeAnnotationSchema = Joi.object({
  taskId: uuidSchema.messages({
    'any.required': 'Task ID is required',
  }),
  // normalizedJson accepts both objects and arrays to match the normalize
  // pipeline's behavior (normalizeRawPayload is an identity transform that
  // can produce whatever the raw payload contained).
  normalizedJson: Joi.alternatives()
    .try(Joi.object().unknown(true), Joi.array())
    .required()
    .messages({
      'any.required': 'Normalized JSON is required',
    }),
});

// ============================================================================
// Review Schemas
// ============================================================================

export const createReviewSchema = Joi.object({
  taskId: uuidSchema.messages({
    'any.required': 'Task ID is required',
  }),
  decision: Joi.string().valid('accept', 'reject').required().messages({
    'any.only': 'Decision must be either accept or reject',
    'any.required': 'Decision is required',
  }),
  notes: Joi.string().max(2000).optional().allow(''),
});

export const resolveReviewSchema = Joi.object({
  decision: Joi.string().valid('accept', 'reject').required().messages({
    'any.only': 'Decision must be either accept or reject',
    'any.required': 'Decision is required',
  }),
  notes: Joi.string().max(2000).optional().allow(''),
});

// ============================================================================
// Admin Schemas
// ============================================================================

export const updateUserSchema = Joi.object({
  role: Joi.string().valid('client', 'labeler', 'admin').optional().messages({
    'any.only': 'Role must be client, labeler, or admin',
  }),
  displayName: Joi.string().max(100).optional().allow(''),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const adminPaymentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'paid', 'failed', 'expired', 'refunded', 'released').optional(),
  provider: Joi.string().max(50).optional(),
  search: Joi.string().max(255).optional().allow(''),
});

// ============================================================================
// Proposal Schemas
// ============================================================================

export const createProposalSchema = Joi.object({
  listingId: uuidSchema.messages({
    'any.required': 'Listing ID is required',
  }),
  priceQuote: Joi.number().positive().precision(2).required().messages({
    'any.required': 'Price quote is required',
    'number.positive': 'Price quote must be positive',
  }),
  deliveryDays: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .required()
    .messages({
      'any.required': 'Delivery time is required',
      'number.base': 'Delivery time must be a number',
      'number.integer': 'Delivery time must be an integer number of days',
      'number.min': 'Delivery time must be at least 1 day',
      'number.max': 'Delivery time cannot exceed 90 days',
    }),
  coverLetter: Joi.string().max(2000).optional().allow(''),
});

export const updateProposalStatusSchema = Joi.object({
  status: Joi.string().valid('accepted', 'rejected', 'withdrawn').required().messages({
    'any.only': 'Status must be accepted, rejected, or withdrawn',
    'any.required': 'Status is required',
  }),
});

// ============================================================================
// QC Sampling Schemas
// ============================================================================

export const qcSampleQuerySchema = Joi.object({
  size: Joi.number().integer().min(1).max(500).optional().default(100).messages({
    'number.min': 'Sample size must be at least 1',
    'number.max': 'Sample size cannot exceed 500',
  }),
});

