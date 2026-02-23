import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { LabelSetService } from '../services/labelset.service';

const labelSetService = new LabelSetService();

// Create a new labelset with labels
export const createLabelSet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, version, labels } = req.body;
    const userId = req.user!.id;

    const labelSet = await labelSetService.createLabelSet(userId, {
      name,
      version,
      labels,
    });

    res.status(201).json({
      success: true,
      data: labelSet,
    });
  } catch (error) {
    next(error);
  }
};

// Get all labelsets (with pagination)
export const getLabelSets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const result = await labelSetService.getLabelSets(page, limit, userId, userRole);

    res.json({
      success: true,
      data: result.labelSets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single labelset by ID with all labels
export const getLabelSetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const labelSet = await labelSetService.getLabelSetById(id, userId, userRole);

    res.json({
      success: true,
      data: labelSet,
    });
  } catch (error) {
    next(error);
  }
};

// Add a label to a labelset
export const addLabel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color, attributesSchemaJson } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const label = await labelSetService.addLabel(id, userId, userRole, {
      name,
      color,
      attributesSchemaJson,
    });

    res.status(201).json({
      success: true,
      data: label,
    });
  } catch (error) {
    next(error);
  }
};

// Update a labelset (name and/or replace labels)
export const updateLabelSet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, labels } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const labelSet = await labelSetService.updateLabelSet(id, userId, userRole, {
      name,
      labels,
    });

    res.json({
      success: true,
      data: labelSet,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a labelset
export const deleteLabelSet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await labelSetService.deleteLabelSet(id, userId, userRole);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
