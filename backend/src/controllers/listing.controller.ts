import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ListingService } from '../services/listing.service';

const listingService = new ListingService();

// Create a new listing
export const createListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      datasetId,
      title,
      description,
      labelSetId,
      labelSetVersion,
      labelingSpecJson,
      annotationFormat,
      qcMode,
      priceTotal,
      currency,
      deadlineAt,
    } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const listing = await listingService.createListing(userId, userRole, {
      datasetId,
      title,
      description,
      labelSetId,
      labelSetVersion,
      labelingSpecJson,
      annotationFormat,
      qcMode,
      priceTotal,
      currency,
      deadlineAt,
    });

    res.status(201).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

// Get all listings (with pagination and filtering)
export const getListings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const ownOnly = req.query.ownOnly === 'true';
    const search = req.query.search as string | undefined;

    const result = await listingService.getListings(
      page,
      limit,
      req.user?.id,
      req.user?.role,
      status,
      ownOnly,
      search
    );

    res.json({
      success: true,
      data: result.listings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single listing by ID
export const getListingById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const listing = await listingService.getListingById(id);

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

// Update a listing
export const updateListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, qcMode, priceTotal, annotationFormat, deadlineAt, status } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const listing = await listingService.updateListing(id, userId, userRole, {
      title,
      description,
      qcMode,
      priceTotal,
      annotationFormat,
      deadlineAt,
      status,
    });

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a listing
export const deleteListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await listingService.deleteListing(id, userId, userRole);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
