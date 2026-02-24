import { ListingStatus, Prisma, QcMode } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDeletePattern } from '../lib/redis';
import logger from '../lib/logger';

export class ListingService {
  /**
   * Create a new listing
   */
  async createListing(
    userId: string,
    userRole: UserRole,
    data: {
      datasetId: string;
      title: string;
      description?: string;
      labelSetId: string;
      labelSetVersion: number;
      labelingSpecJson?: unknown;
      qcMode?: QcMode;
      priceTotal: number;
      currency: string;
      deadlineAt?: string | null;
    }
  ) {
    // Verify dataset exists and user owns it
    const dataset = await prisma.dataset.findUnique({
      where: { id: data.datasetId },
    });

    if (!dataset) {
      throw new NotFoundError('Dataset');
    }

    if (userRole !== 'admin' && dataset.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to create a listing for this dataset');
    }

    // Verify labelset exists
    const labelSet = await prisma.labelSet.findUnique({
      where: { id: data.labelSetId },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (labelSet.version !== data.labelSetVersion) {
      throw new BadRequestError(`LabelSet version mismatch. Expected ${labelSet.version}, got ${data.labelSetVersion}`);
    }

    const listing = await prisma.listing.create({
      data: {
        datasetId: data.datasetId,
        ownerUserId: userId,
        title: data.title,
        description: data.description,
        labelSetId: data.labelSetId,
        labelSetVersion: data.labelSetVersion,
        labelingSpecJson: data.labelingSpecJson as Prisma.InputJsonValue,
        qcMode: data.qcMode || QcMode.none,
        priceTotal: data.priceTotal,
        currency: data.currency,
        deadlineAt: data.deadlineAt ? new Date(data.deadlineAt) : null,
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

    // Invalidate listings cache so the new listing appears immediately
    await cacheDeletePattern('cache:/api/v1/listings*');

    return listing;
  }

  /**
   * Get all listings with pagination and filtering
   */
  async getListings(
    page: number,
    limit: number,
    userId: string | undefined,
    userRole: UserRole | undefined,
    status?: string,
    ownOnly?: boolean
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ListingWhereInput = {};

    if (status) {
      where.status = status as ListingStatus;
    }

    // If user wants to see only their listings
    if (ownOnly && userId) {
      where.ownerUserId = userId;
    } else if (userRole !== 'admin') {
      // Non-admin users see open listings or their own
      where.OR = [
        { status: ListingStatus.open },
        ...(userId ? [{ ownerUserId: userId }] : []),
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
            select: { id: true, name: true, _count: { select: { assets: true } } },
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

    return {
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
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

    return listing;
  }

  /**
   * Update a listing
   */
  async updateListing(
    listingId: string,
    userId: string,
    userRole: UserRole,
    data: {
      title?: string;
      description?: string;
      qcMode?: QcMode;
      priceTotal?: number;
      deadlineAt?: string | null;
      status?: string;
    }
  ) {
    // Check if listing exists and user has access
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      throw new NotFoundError('Listing');
    }

    if (userRole !== 'admin' && existingListing.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to update this listing');
    }

    // Can't update if listing has active contract
    if (existingListing.status !== 'open' && data.status !== 'cancelled') {
      throw new BadRequestError('Cannot update listing that is not open');
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.qcMode && { qcMode: data.qcMode }),
        ...(data.priceTotal && { priceTotal: data.priceTotal }),
        ...(data.deadlineAt !== undefined && {
          deadlineAt: data.deadlineAt ? new Date(data.deadlineAt) : null,
        }),
        ...(data.status && { status: data.status as ListingStatus }),
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

    // Invalidate cache (wildcard covers paginated/filtered variants)
    await cacheDeletePattern('cache:/api/v1/listings*');

    logger.info(`Listing updated: ${listing.id}`);

    return listing;
  }

  /**
   * Delete a listing
   */
  async deleteListing(listingId: string, userId: string, userRole: UserRole) {
    // Check if listing exists and user has access
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { contracts: true, proposals: true },
    });

    if (!existingListing) {
      throw new NotFoundError('Listing');
    }

    if (userRole !== 'admin' && existingListing.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this listing');
    }

    // Can't delete if listing has any contracts
    if (existingListing.contracts.length > 0) {
      throw new BadRequestError('Cannot delete listing with active contracts');
    }

    // Delete within a transaction: first proposals, then listing
    await prisma.$transaction(async (tx) => {
      // Delete related proposals first to avoid FK constraint
      if (existingListing.proposals.length > 0) {
        await tx.proposal.deleteMany({
          where: { listingId },
        });
      }

      await tx.listing.delete({
        where: { id: listingId },
      });
    });

    // Invalidate cache (wildcard covers paginated/filtered variants)
    await cacheDeletePattern('cache:/api/v1/listings*');

    logger.info(`Listing deleted: ${listingId}`);
  }
}
