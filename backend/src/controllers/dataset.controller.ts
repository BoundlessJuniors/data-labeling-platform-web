import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { DatasetService } from '../services/dataset.service';
import { DatasetStatus } from '@prisma/client';

const datasetService = new DatasetService();

// Create a new dataset
export const createDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user!.id;

    const dataset = await datasetService.createDataset(userId, {
      name,
      description,
      status: status as DatasetStatus,
    });

    res.status(201).json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Get all datasets (with pagination)
export const getDatasets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const search = req.query.search as string | undefined;

    const result = await datasetService.getDatasets(page, limit, userId, userRole, search);

    res.json({
      success: true,
      data: result.datasets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single dataset by ID
export const getDatasetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const dataset = await datasetService.getDatasetById(id, userId, userRole);

    res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Update a dataset
export const updateDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const dataset = await datasetService.updateDataset(id, userId, userRole, {
      name,
      description,
      status: status as DatasetStatus,
    });

    res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a dataset
export const deleteDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await datasetService.deleteDataset(id, userId, userRole);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
