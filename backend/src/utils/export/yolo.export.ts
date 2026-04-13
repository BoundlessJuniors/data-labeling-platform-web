import archiver from 'archiver';
import { ExportableTaskRecord, ExportArtifact } from './export.types';
import { downloadFromR2 } from '../../lib/storage';
import logger from '../../lib/logger';

export async function exportYolo(
  contractId: string,
  tasks: ExportableTaskRecord[],
  labels: { name: string }[]
): Promise<ExportArtifact> {
  const archive = archiver('zip', { zlib: { level: 9 } });

  const chunks: Buffer[] = [];
  archive.on('data', chunk => chunks.push(chunk));

  const zipBufferPromise = new Promise<Buffer>((resolve, reject) => {
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', err => reject(err));
  });

  const labelToIndex = new Map<string, number>();
  labels.forEach((L, idx) => labelToIndex.set(L.name, idx));

  const classesTxt = labels.map(l => l.name).join('\n');
  archive.append(classesTxt, { name: 'classes.txt' });

  const dataYaml = `names:\n${labels.map(l => `  - ${l.name}`).join('\n')}\nnc: ${labels.length}\n`;
  archive.append(dataYaml, { name: 'data.yaml' });

  for (const task of tasks) {
    if (task.objectKey) {
      try {
        const imageBuffer = await downloadFromR2(task.objectKey);
        archive.append(imageBuffer, { name: `images/${task.basename}` });
      } catch (err) {
        logger.warn(`Failed to download image from R2 for task ${task.taskId}:`, err);
      }
    }

    const txtLines = task.bboxes.map(bbox => {
      const idx = labelToIndex.get(bbox.label)!;
      const xCenter = (bbox.x + bbox.width / 2) / task.width;
      const yCenter = (bbox.y + bbox.height / 2) / task.height;
      const wNorm = bbox.width / task.width;
      const hNorm = bbox.height / task.height;
      return `${idx} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${wNorm.toFixed(6)} ${hNorm.toFixed(6)}`;
    });

    const extIndex = task.basename.lastIndexOf('.');
    const basenameWithoutExt = extIndex > -1 ? task.basename.substring(0, extIndex) : task.basename;
    archive.append(txtLines.join('\n'), { name: `labels/${basenameWithoutExt}.txt` });
  }

  archive.finalize();
  const buffer = await zipBufferPromise;

  return {
    filename: `contract-${contractId}.yolo.zip`,
    mimeType: 'application/zip', // Ensure correct content type
    buffer,
  };
}
