import { Response, NextFunction } from 'express';
import { ListingStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
import logger from '../lib/logger';

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
      qcMode,
      priceTotal,
      currency,
      deadlineAt 
    } = req.body;
    const userId = req.user!.id;

    // Verify dataset exists and user owns it
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new NotFoundError('Dataset');
    }

    if (req.user?.role !== 'admin' && dataset.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to create a listing for this dataset');
    }

    // Verify labelset exists
    const labelSet = await prisma.labelSet.findUnique({
      where: { id: labelSetId },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (labelSet.version !== labelSetVersion) {
      throw new BadRequestError(`LabelSet version mismatch. Expected ${labelSet.version}, got ${labelSetVersion}`);
    }

    const listing = await prisma.listing.create({
      data: {
        datasetId,
        ownerUserId: userId,
        title,
        description,
        labelSetId,
        labelSetVersion,
        labelingSpecJson,
        qcMode: qcMode || 'none',
        priceTotal,
        currency,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        status: 'open',
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        labelSet: {
          select: { id: true, name: true, version: true },
        },
      },
    });

    logger.info(`Listing created: ${listing.id} by user ${userId}`);

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
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const ownOnly = req.query.ownOnly === 'true';

    // Build where clause
    const where: Prisma.ListingWhereInput = {};
    
    if (status) {
      where.status = status as ListingStatus;
    }

    // If user wants to see only their listings
    if (ownOnly && req.user) {
      where.ownerUserId = req.user.id;
    } else if (req.user?.role !== 'admin') {
      // Non-admin users see open listings or their own
      where.OR = [
        { status: ListingStatus.open },
        ...(req.user ? [{ ownerUserId: req.user.id }] : []),
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dataset: {
            select: { id: true, name: true },
          },
          owner: {
            select: { id: true, email: true, displayName: true },
          },
          labelSet: {
            select: { id: true, name: true, version: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        dataset: {
          select: { 
            id: true, 
            name: true, 
            description: true,
            _count: { select: { assets: true } },
          },
        },
        owner: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
        labelSet: {
          include: {
            labels: true,
          },
        },
        contracts: {
          select: { id: true, status: true, labelerUserId: true },
        },
        _count: {
          select: { proposals: true },
        },
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

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
    const { title, description, qcMode, priceTotal, deadlineAt, status } = req.body;

    // Check if listing exists and user has access
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      throw new NotFoundError('Listing');
    }

    if (req.user?.role !== 'admin' && existingListing.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to update this listing');
    }

    // Can't update if listing has active contract
    if (existingListing.status !== 'open' && status !== 'cancelled') {
      throw new BadRequestError('Cannot update listing that is not open');
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(qcMode && { qcMode }),
        ...(priceTotal && { priceTotal }),
        ...(deadlineAt !== undefined && { deadlineAt: deadlineAt ? new Date(deadlineAt) : null }),
        ...(status && { status }),
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        labelSet: {
          select: { id: true, name: true, version: true },
        },
      },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/listings/${id}`);
    await cacheDelete(`cache:/api/listings`);

    logger.info(`Listing updated: ${listing.id}`);

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

    // Check if listing exists and user has access
    const existingListing = await prisma.listing.findUnique({
      where: { id },
      include: { contracts: true },
    });

    if (!existingListing) {
      throw new NotFoundError('Listing');
    }

    if (req.user?.role !== 'admin' && existingListing.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this listing');
    }

    // Can't delete if listing has any contracts
    if (existingListing.contracts.length > 0) {
      throw new BadRequestError('Cannot delete listing with active contracts');
    }

    await prisma.listing.delete({
      where: { id },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/listings/${id}`);
    await cacheDelete(`cache:/api/listings`);

    logger.info(`Listing deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
