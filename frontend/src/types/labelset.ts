/**
 * Label set types
 */

/** Label set entity */
export interface LabelSet {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  labels: Label[];
  createdAt: string;
  updatedAt: string;
}

/** Individual label */
export interface Label {
  id: string;
  labelSetId: string;
  name: string;
  color: string;
  shortcut?: string | null;
  description?: string | null;
  order: number;
}

/** Create label set request */
export interface CreateLabelSetRequest {
  name: string;
  description?: string;
  labels: Omit<Label, 'id' | 'labelSetId'>[];
}
