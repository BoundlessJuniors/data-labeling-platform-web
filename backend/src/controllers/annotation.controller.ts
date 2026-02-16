import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AnnotationService } from '../services/annotation.service';

const annotationService = new AnnotationService();

// Create raw annotation
export const createRawAnnotation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, payloadJson } = req.body;
    const labelerId = req.user!.id;
    const labelerRole = req.user!.role;

    const annotation = await annotationService.createRawAnnotation(
      taskId,
      labelerId,
      labelerRole,
      payloadJson
    );

    res.status(201).json({
      success: true,
      data: annotation,
    });
  } catch (error) {
    next(error);
  }
};

// Normalize annotation (create or update normalized version)
export const normalizeAnnotation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, normalizedJson } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const normalized = await annotationService.normalizeAnnotation(
      taskId,
      userId,
      userRole,
      normalizedJson
    );

    res.json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    next(error);
  }
};

// Get annotations for a task
export const getTaskAnnotations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const annotations = await annotationService.getTaskAnnotations(taskId, userId, userRole);

    res.json({
      success: true,
      data: annotations,
    });
  } catch (error) {
    next(error);
  }
};
