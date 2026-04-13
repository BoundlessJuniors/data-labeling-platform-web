import { BadRequestError } from '../errors';
import { NormalizedBBox } from './export.types';
import logger from '../../lib/logger';

export function extractBboxes(payloadData: any[], labelSetLabels: { name: string }[]): NormalizedBBox[] {
  if (!Array.isArray(payloadData)) {
    return [];
  }

  // Filter only bbox types explicitly
  const bboxes = payloadData.filter(item => item.type === 'bbox') as NormalizedBBox[];
  
  // Also log and discard unsupported shapes (as per scope decision)
  const unsupported = payloadData.filter(item => item.type && item.type !== 'bbox');
  if (unsupported.length > 0) {
    logger.warn(`Ignored ${unsupported.length} unsupported shapes during export (only bbox is supported).`);
  }

  const validLabels = new Set(labelSetLabels.map(l => l.name));
  
  for (const bbox of bboxes) {
    if (!validLabels.has(bbox.label)) {
      // Fail-fast on unknown label as requested
      throw new BadRequestError(`Label '${bbox.label}' found in annotation but it does not exist in the contract's label set.`);
    }
  }
  
  return bboxes;
}

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
