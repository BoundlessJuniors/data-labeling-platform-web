import { ExportableTaskRecord, ExportArtifact } from './export.types';

export async function exportCoco(
  contractId: string,
  tasks: ExportableTaskRecord[],
  labels: { name: string }[]
): Promise<ExportArtifact> {
  const info = {
    description: `Export for contract ${contractId}`,
    date_created: new Date().toISOString(),
  };

  const categories = labels.map((label, index) => ({
    id: index + 1,
    name: label.name,
    supercategory: 'none',
  }));

  const labelToIdMap = new Map<string, number>();
  categories.forEach(c => labelToIdMap.set(c.name, c.id));

  const images: any[] = [];
  const annotations: any[] = [];

  let annotationId = 1;

  tasks.forEach((task, index) => {
    const imageId = index + 1;
    images.push({
      id: imageId,
      file_name: task.basename,
      width: task.width,
      height: task.height,
    });

    task.bboxes.forEach(bbox => {
      const categoryId = labelToIdMap.get(bbox.label);
      if (categoryId) {
        annotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: categoryId,
          bbox: [bbox.x, bbox.y, bbox.width, bbox.height],
          area: bbox.width * bbox.height,
          iscrowd: 0,
        });
      }
    });
  });

  const payload = {
    info,
    images,
    annotations,
    categories,
  };

  const buffer = Buffer.from(JSON.stringify(payload, null, 2));

  return {
    filename: `contract-${contractId}.coco.json`,
    mimeType: 'application/json', // Ensure correct content type
    buffer,
  };
}
