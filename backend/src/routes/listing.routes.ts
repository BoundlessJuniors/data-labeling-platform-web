import { Router } from 'express';
import * as listingController from '../controllers/listing.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { adminOrClient } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createListingSchema, updateListingSchema, idParamSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/listings - Get all listings (public access for open listings)
router.get(
  '/',
  optionalAuth,
  cacheMiddleware({ ttl: 30, keyPrefix: 'cache' }),
  listingController.getListings
);

// POST /api/listings - Create a new listing
router.post(
  '/',
  authenticate,
  adminOrClient,
  validate(createListingSchema),
  listingController.createListing
);

// GET /api/listings/:id - Get a single listing
router.get(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  listingController.getListingById
);

// PUT /api/listings/:id - Update a listing
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateListingSchema),
  listingController.updateListing
);

// DELETE /api/listings/:id - Delete a listing
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  listingController.deleteListing
);

export default router;
