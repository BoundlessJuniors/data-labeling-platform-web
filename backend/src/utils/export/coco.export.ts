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

  function calculatePolygonArea(points: {x: number, y: number}[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  }

  tasks.forEach((task, index) => {
    const imageId = index + 1;
    images.push({
      id: imageId,
      file_name: task.basename,
      width: task.width,
      height: task.height,
    });

    task.shapes.forEach(shape => {
      const categoryId = labelToIdMap.get(shape.label);
      if (categoryId) {
        const bbox = shape.derivedBbox;
        let area = bbox.width * bbox.height;
        let segmentation: any[] = [];
        const attributes: any = { shape_type: shape.type };

        if (shape.type === 'polygon') {
          segmentation = [[...shape.points.flatMap(p => [p.x, p.y])]];
          area = calculatePolygonArea(shape.points);
        } else if (shape.type === 'polyline') {
          attributes.points = shape.points;
        } else if (shape.type === 'keypoint') {
          attributes.x = shape.x;
          attributes.y = shape.y;
        } else if (shape.type === 'circle') {
          attributes.cx = shape.cx;
          attributes.cy = shape.cy;
          attributes.r = shape.r;
        }

        annotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: categoryId,
          bbox: [bbox.x, bbox.y, bbox.width, bbox.height],
          area,
          segmentation,
          iscrowd: 0,
          attributes,
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
