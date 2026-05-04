import archiver from 'archiver';
import { ExportableTaskRecord, ExportArtifact } from './export.types';
import { escapeXml } from './export.helpers';
import { downloadFromR2 } from '../../lib/storage';
import logger from '../../lib/logger';

export async function exportVoc(
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

  for (const task of tasks) {
    if (task.objectKey) {
      try {
        const imageBuffer = await downloadFromR2(task.objectKey);
        archive.append(imageBuffer, { name: `images/${task.basename}` });
      } catch (err) {
        logger.warn(`Failed to download image from R2 for task ${task.taskId}:`, err);
      }
    }

    let xml = `<annotation>\n`;
    xml += `  <folder>images</folder>\n`;
    xml += `  <filename>${escapeXml(task.basename)}</filename>\n`;
    xml += `  <size>\n`;
    xml += `    <width>${task.width}</width>\n`;
    xml += `    <height>${task.height}</height>\n`;
    xml += `    <depth>3</depth>\n`;
    xml += `  </size>\n`;

    task.shapes.forEach(shape => {
      const bbox = shape.derivedBbox;
      xml += `  <object>\n`;
      xml += `    <name>${escapeXml(shape.label)}</name>\n`;
      xml += `    <pose>Unspecified</pose>\n`;
      xml += `    <truncated>0</truncated>\n`;
      xml += `    <difficult>0</difficult>\n`;
      xml += `    <bndbox>\n`;
      xml += `      <xmin>${Math.max(Math.round(bbox.x), 0)}</xmin>\n`;
      xml += `      <ymin>${Math.max(Math.round(bbox.y), 0)}</ymin>\n`;
      xml += `      <xmax>${Math.min(Math.round(bbox.x + bbox.width), task.width)}</xmax>\n`;
      xml += `      <ymax>${Math.min(Math.round(bbox.y + bbox.height), task.height)}</ymax>\n`;
      xml += `    </bndbox>\n`;

      xml += `    <shape_type>${shape.type}</shape_type>\n`;
      if (shape.type === 'polygon' || shape.type === 'polyline') {
        const points = shape.points;
        if (points) {
          xml += `    <points>\n`;
          points.forEach(p => {
            xml += `      <point><x>${p.x}</x><y>${p.y}</y></point>\n`;
          });
          xml += `    </points>\n`;
        }
      } else if (shape.type === 'keypoint') {
        xml += `    <point><x>${shape.x}</x><y>${shape.y}</y></point>\n`;
      } else if (shape.type === 'circle') {
        xml += `    <circle><cx>${shape.cx}</cx><cy>${shape.cy}</cy><r>${shape.r}</r></circle>\n`;
      }

      xml += `  </object>\n`;
    });
    xml += `</annotation>\n`;

    const extIndex = task.basename.lastIndexOf('.');
    const basenameWithoutExt = extIndex > -1 ? task.basename.substring(0, extIndex) : task.basename;
    archive.append(xml, { name: `annotations/${basenameWithoutExt}.xml` });
  }

  archive.finalize();
  const buffer = await zipBufferPromise;

  return {
    filename: `contract-${contractId}.voc.zip`,
    mimeType: 'application/zip', // Ensure correct content type
    buffer,
  };
}
