<script setup lang="ts">
/* global ResizeObserver, HTMLImageElement, HTMLDivElement, requestAnimationFrame */
/**
 * QcImageCanvas - Renders an image with SVG annotation overlay.
 * Supports bbox, polygon, polyline, circle, and keypoints shapes.
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { QcTaskView, QcAnnotationShape } from '@/types/qc';
import { extractAnnotationShapes, normalizePoints, resolveShapeType } from '@/types/qc';

const props = defineProps<{
  taskView: QcTaskView;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);
const imgLoaded = ref(false);
const imgError = ref(false);
const naturalWidth = ref(0);
const naturalHeight = ref(0);
const displayWidth = ref(0);
const displayHeight = ref(0);

// Use the image URL from QC view (signed URL)
const imageUrl = computed(() => props.taskView.imageUrl ?? '');

// Determine which annotation to use: normalized first, then raw fallback
const annotationSource = computed<'normalized' | 'raw' | 'none'>(() => {
  if (props.taskView.normalized?.normalizedJson) return 'normalized';
  if (props.taskView.latestRaw?.payloadJson) return 'raw';
  return 'none';
});

const annotationPayload = computed<unknown>(() => {
  if (annotationSource.value === 'normalized') {
    return props.taskView.normalized?.normalizedJson;
  }
  if (annotationSource.value === 'raw') {
    return props.taskView.latestRaw?.payloadJson;
  }
  return null;
});

const shapes = computed(() => extractAnnotationShapes(annotationPayload.value));

// Build a label→color map from labelSet
const labelColorMap = computed(() => {
  const map = new Map<string, string>();
  if (props.taskView.labelSet?.labels) {
    for (const label of props.taskView.labelSet.labels) {
      if (label.color) {
        map.set(label.name, label.color);
      }
    }
  }
  return map;
});

// Default colors for shapes without explicit color in label set
const defaultColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

function getShapeColor(shape: QcAnnotationShape, index: number): string {
  if (shape.color) return shape.color;
  if (shape.label && labelColorMap.value.has(shape.label)) {
    return labelColorMap.value.get(shape.label)!;
  }
  return defaultColors[index % defaultColors.length]!;
}

// Scale factor: map from annotation coordinates (natural image size) to display size
const scaleX = computed(() => {
  if (naturalWidth.value === 0) return 1;
  return displayWidth.value / naturalWidth.value;
});

const scaleY = computed(() => {
  if (naturalHeight.value === 0) return 1;
  return displayHeight.value / naturalHeight.value;
});

function onImageLoad() {
  if (!imgRef.value) return;
  naturalWidth.value = imgRef.value.naturalWidth;
  naturalHeight.value = imgRef.value.naturalHeight;
  imgLoaded.value = true;
  
  // Wait for Vue to update the DOM (removing opacity-0 or display:none kinds of wrappers)
  nextTick(() => {
    // Wait for the browser to do a layout pass before measuring
    requestAnimationFrame(() => {
      updateDisplaySize();
    });
  });
}

function onImageError() {
  imgError.value = true;
}

function updateDisplaySize() {
  if (!imgRef.value) return;
  const rect = imgRef.value.getBoundingClientRect();
  displayWidth.value = rect.width;
  displayHeight.value = rect.height;
}

// SVG path generators
function getBboxPath(shape: QcAnnotationShape): { x: number; y: number; w: number; h: number } | null {
  if (shape.bbox && shape.bbox.length === 4) {
    return {
      x: shape.bbox[0] * scaleX.value,
      y: shape.bbox[1] * scaleY.value,
      w: shape.bbox[2] * scaleX.value,
      h: shape.bbox[3] * scaleY.value,
    };
  }
  if (shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
    return {
      x: shape.x * scaleX.value,
      y: shape.y * scaleY.value,
      w: shape.width * scaleX.value,
      h: shape.height * scaleY.value,
    };
  }
  return null;
}

function getPolygonPoints(shape: QcAnnotationShape): string {
  const pts = normalizePoints(shape.points);
  return pts.map(p => `${p.x * scaleX.value},${p.y * scaleY.value}`).join(' ');
}

function getCircle(shape: QcAnnotationShape): { cx: number; cy: number; r: number } | null {
  if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
    return {
      cx: shape.cx * scaleX.value,
      cy: shape.cy * scaleY.value,
      r: shape.r * Math.min(scaleX.value, scaleY.value),
    };
  }
  return null;
}

function getKeypointPositions(shape: QcAnnotationShape): Array<{ x: number; y: number }> {
  const pts = normalizePoints(shape.points);
  return pts.map(p => ({ x: p.x * scaleX.value, y: p.y * scaleY.value }));
}

// Label badge position per shape
function getLabelPosition(shape: QcAnnotationShape, index: number): { x: number; y: number } {
  const shapeType = resolveShapeType(shape);

  if (shapeType === 'bbox' || shapeType === 'rectangle') {
    const box = getBboxPath(shape);
    if (box) return { x: box.x, y: box.y - 4 };
  }

  if (shapeType === 'circle') {
    const circle = getCircle(shape);
    if (circle) return { x: circle.cx - circle.r, y: circle.cy - circle.r - 4 };
  }

  if (shapeType === 'polygon' || shapeType === 'polyline' || shapeType === 'keypoints') {
    const pts = normalizePoints(shape.points);
    if (pts.length > 0) {
      const first = pts[0]!;
      return { x: first.x * scaleX.value, y: first.y * scaleY.value - 4 };
    }
  }

  return { x: 10, y: 20 + index * 20 };
}

// Resize handling
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateDisplaySize();
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div ref="containerRef" class="qc-canvas-container">
    <!-- Image error state -->
    <div v-if="imgError" class="qc-canvas-error">
      <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Görsel yüklenemedi</p>
    </div>

    <!-- Loading skeleton -->
    <div v-show="!imgLoaded && !imgError" class="qc-canvas-loading absolute inset-0 z-10">
      <div class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-64"></div>
    </div>

    <!-- Image + SVG overlay -->
    <div v-show="!imgError" class="qc-canvas-wrapper" :class="{ 'opacity-0 pointer-events-none': !imgLoaded }">
      <img
        ref="imgRef"
        :src="imageUrl"
        class="qc-canvas-image"
        alt="QC preview image"
        @load="onImageLoad"
        @error="onImageError"
      />

      <!-- SVG Overlay -->
      <svg
        v-if="imgLoaded && shapes.length > 0"
        class="qc-canvas-svg"
        :viewBox="`0 0 ${displayWidth} ${displayHeight}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <template v-for="(shape, idx) in shapes" :key="idx">
          <!-- bbox / rectangle -->
          <template v-if="resolveShapeType(shape) === 'bbox' || resolveShapeType(shape) === 'rectangle'">
            <rect
              v-if="getBboxPath(shape)"
              :x="getBboxPath(shape)!.x"
              :y="getBboxPath(shape)!.y"
              :width="getBboxPath(shape)!.w"
              :height="getBboxPath(shape)!.h"
              :stroke="getShapeColor(shape, idx)"
              stroke-width="2"
              fill="none"
              :fill-opacity="0"
            />
          </template>

          <!-- polygon -->
          <template v-if="resolveShapeType(shape) === 'polygon'">
            <polygon
              :points="getPolygonPoints(shape)"
              :stroke="getShapeColor(shape, idx)"
              stroke-width="2"
              :fill="getShapeColor(shape, idx)"
              fill-opacity="0.15"
            />
          </template>

          <!-- polyline -->
          <template v-if="resolveShapeType(shape) === 'polyline'">
            <polyline
              :points="getPolygonPoints(shape)"
              :stroke="getShapeColor(shape, idx)"
              stroke-width="2"
              fill="none"
            />
          </template>

          <!-- circle -->
          <template v-if="resolveShapeType(shape) === 'circle' && getCircle(shape)">
            <circle
              :cx="getCircle(shape)!.cx"
              :cy="getCircle(shape)!.cy"
              :r="getCircle(shape)!.r"
              :stroke="getShapeColor(shape, idx)"
              stroke-width="2"
              :fill="getShapeColor(shape, idx)"
              fill-opacity="0.15"
            />
          </template>

          <!-- keypoints -->
          <template v-if="resolveShapeType(shape) === 'keypoints' || resolveShapeType(shape) === 'keypoint'">
            <circle
              v-for="(pt, ptIdx) in getKeypointPositions(shape)"
              :key="`kp-${idx}-${ptIdx}`"
              :cx="pt.x"
              :cy="pt.y"
              r="4"
              :fill="getShapeColor(shape, idx)"
              :stroke="'white'"
              stroke-width="1.5"
            />
          </template>

          <!-- Label badge -->
          <template v-if="shape.label && resolveShapeType(shape)">
            <rect
              :x="getLabelPosition(shape, idx).x"
              :y="getLabelPosition(shape, idx).y - 14"
              :width="shape.label.length * 7 + 12"
              height="18"
              :fill="getShapeColor(shape, idx)"
              rx="3"
              ry="3"
              opacity="0.9"
            />
            <text
              :x="getLabelPosition(shape, idx).x + 6"
              :y="getLabelPosition(shape, idx).y"
              fill="white"
              font-size="11"
              font-weight="500"
              font-family="Inter, sans-serif"
            >
              {{ shape.label }}
            </text>
          </template>
        </template>
      </svg>

      <!-- No annotation message -->
      <div
        v-if="imgLoaded && shapes.length === 0"
        class="qc-canvas-no-annotation"
      >
        <span class="badge-warning">
          {{ annotationSource === 'none'
            ? 'Bu örnek için annotation verisi bulunamadı'
            : 'Bu örnekte gösterilebilir şekil bulunamadı'
          }}
        </span>
      </div>
    </div>

    <!-- Annotation source indicator -->
    <div v-if="imgLoaded && !imgError" class="mt-2 flex items-center gap-2">
      <span
        v-if="annotationSource === 'normalized'"
        class="badge-success"
      >
        Normalized
      </span>
      <span
        v-else-if="annotationSource === 'raw'"
        class="badge-warning"
      >
        Raw (fallback)
      </span>
      <span v-else class="badge-neutral">
        Annotation yok
      </span>
      <span v-if="shapes.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
        {{ shapes.length }} şekil
      </span>
    </div>
  </div>
</template>

<style scoped>
.qc-canvas-container {
  position: relative;
  width: 100%;
}

.qc-canvas-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.qc-canvas-image {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  background: #f3f4f6;
}

.qc-canvas-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.qc-canvas-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 16rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px dashed #d1d5db;
}

:is(.dark) .qc-canvas-error {
  background: #1f2937;
  border-color: #374151;
}

.qc-canvas-loading {
  min-height: 16rem;
}

.qc-canvas-no-annotation {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
}
</style>
