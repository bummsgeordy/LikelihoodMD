import type { CalculationResult } from '../types';
import { clamp, formatPercent, formatRatio } from '../lib/calculations';
import {
  createNomogramLayout,
  type NomogramMode,
  nomogramPoints,
  probabilityTicks,
  probabilityToY,
  ratioTicksForMode,
  ratioToY
} from '../lib/nomogram';

export type NomogramModifierDirection = 'higher' | 'lower' | 'mixed' | 'uncertain' | 'none';

export interface NomogramModifierImpact {
  direction: NomogramModifierDirection;
}

export interface NomogramCanvases {
  positive: HTMLCanvasElement;
  negative: HTMLCanvasElement;
}

export function drawSingleNomogramOnCanvas(
  canvas: HTMLCanvasElement,
  result: CalculationResult,
  likelihoodRatio: number,
  posttestProbability: number,
  color: string,
  mode: NomogramMode,
  impact: NomogramModifierImpact
): void {
  const maybeContext = canvas.getContext('2d');
  if (!maybeContext) return;
  const context: CanvasRenderingContext2D = maybeContext;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || 720);
  const height = Math.max(180, rect.height || 405);
  const deviceScale = window.devicePixelRatio || 1;
  const targetWidth = Math.round(width * deviceScale);
  const targetHeight = Math.round(height * deviceScale);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  const layout = createNomogramLayout({ width, height });
  const axisTitleFont = Math.max(20 * layout.scale, 18);
  const tickFont = Math.max(15 * layout.scale, 13);
  const valueFont = Math.max(17 * layout.scale, 15);
  const pointRadius = Math.max(6.4 * layout.scale, 5.8);
  const lineWidth = Math.max(4.2 * layout.scale, 3.8);
  const points = nomogramPoints(result.pretestProbability, likelihoodRatio, posttestProbability, layout);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);

  function axis(x: number, axisLabel: string, ticks: number[], mapper: (value: number) => number): void {
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = Math.max(1.4 * layout.scale, 1);
    context.beginPath();
    context.moveTo(x, layout.top);
    context.lineTo(x, layout.bottom);
    context.stroke();
    context.fillStyle = '#111827';
    context.font = `850 ${axisTitleFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.fillText(axisLabel, x, Math.max(30 * layout.scale, 28));
    context.font = `850 ${tickFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    let lastLabelY = Number.NEGATIVE_INFINITY;
    ticks.forEach(tick => {
      const y = mapper(tick);
      context.strokeStyle = '#94a3b8';
      context.beginPath();
      context.moveTo(x - 5 * layout.scale, y);
      context.lineTo(x + 5 * layout.scale, y);
      context.stroke();
      context.fillStyle = '#475569';
      context.textAlign = x === layout.xPost ? 'left' : 'right';
      const text = axisLabel === 'LR' ? String(tick).replace('.', ',') : `${Math.round(tick * 100)}%`;
      const minTickGap = axisLabel === 'LR' ? Math.max(31 * layout.scale, 28) : Math.max(22 * layout.scale, 20);
      const skipForCurrentValue = axisLabel === 'LR' && Math.abs(y - points.lr.y) < Math.max(28 * layout.scale, 25);
      const skipForCollision = Math.abs(y - lastLabelY) < minTickGap;
      if (!skipForCurrentValue && !skipForCollision) {
        const labelX = x === layout.xPost ? x + 10 * layout.scale : x - 10 * layout.scale;
        context.fillText(text, labelX, clamp(y + 5 * layout.scale, layout.top + tickFont, layout.bottom - 2));
        lastLabelY = y;
      }
    });
  }

  axis(layout.xPre, 'Prä', probabilityTicks, value => probabilityToY(value, layout));
  axis(layout.xLr, 'LR', ratioTicksForMode(mode), value => ratioToY(value, result.pretestProbability, layout));
  axis(layout.xPost, 'Post', probabilityTicks, value => probabilityToY(value, layout));

  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(points.pre.x, points.pre.y);
  context.lineTo(points.post.x, points.post.y);
  context.stroke();

  context.fillStyle = color;
  [points.pre, points.lr, points.post].forEach(point => {
    context.beginPath();
    context.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
    context.fill();
  });

  context.font = `900 ${valueFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = 'left';
  const endpointLabel = `Post ${formatPercent(posttestProbability)}`;
  const endpointPaddingX = Math.max(9 * layout.scale, 8);
  const endpointPaddingY = Math.max(6 * layout.scale, 5);
  const endpointLabelHeight = valueFont + endpointPaddingY * 2;
  const endpointLabelWidth = context.measureText(endpointLabel).width;
  const endpointBoxWidth = endpointLabelWidth + endpointPaddingX * 2;
  let endpointBoxX = points.post.x - endpointBoxWidth - Math.max(16 * layout.scale, 12);
  endpointBoxX = clamp(endpointBoxX, layout.xLr + Math.max(12 * layout.scale, 10), width - endpointBoxWidth - 10);
  if (endpointBoxX + endpointBoxWidth > points.post.x - pointRadius - 4) {
    endpointBoxX = clamp(points.post.x - endpointBoxWidth - pointRadius - 8, layout.xLr + 8, width - endpointBoxWidth - 10);
  }
  const endpointBoxY = clamp(
    points.post.y - endpointLabelHeight / 2,
    layout.top + 4,
    layout.bottom - endpointLabelHeight - 4
  );
  context.fillStyle = '#fff';
  context.strokeStyle = color;
  context.lineWidth = Math.max(1.5 * layout.scale, 1.2);
  context.beginPath();
  context.roundRect(endpointBoxX, endpointBoxY, endpointBoxWidth, endpointLabelHeight, Math.max(8 * layout.scale, 7));
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.fillText(endpointLabel, endpointBoxX + endpointPaddingX, endpointBoxY + endpointLabelHeight - endpointPaddingY);

  const ratioLabel = formatRatio(likelihoodRatio);
  context.font = `900 ${valueFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const labelPaddingX = Math.max(10 * layout.scale, 8);
  const labelPaddingY = Math.max(6 * layout.scale, 5);
  const labelWidth = context.measureText(ratioLabel).width + labelPaddingX * 2;
  const labelHeight = valueFont + labelPaddingY * 2;
  const labelX = clamp(layout.xLr + 14 * layout.scale, 8, width - labelWidth - 8);
  const labelY = clamp(points.lr.y - labelHeight - 10 * layout.scale, layout.top + 4 * layout.scale, layout.bottom - labelHeight - 4 * layout.scale);
  context.fillStyle = '#fff';
  context.strokeStyle = color;
  context.lineWidth = Math.max(1.5 * layout.scale, 1.2);
  context.beginPath();
  context.roundRect(labelX, labelY, labelWidth, labelHeight, 5 * layout.scale);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.textAlign = 'left';
  context.fillText(ratioLabel, labelX + labelPaddingX, labelY + labelHeight - labelPaddingY);

  if (impact.direction === 'none') return;
  const direction = impact.direction;
  const arrowColor =
    direction === 'higher' ? '#0f766e' : direction === 'lower' ? '#b45309' : direction === 'mixed' ? '#7c3aed' : '#64748b';
  const arrowX = layout.xPost + 38 * layout.scale;
  const arrowLength = 34 * layout.scale;
  const arrowStartY = clamp(points.post.y + (direction === 'higher' ? 18 : direction === 'lower' ? -18 : 0) * layout.scale, layout.top + arrowLength, layout.bottom - arrowLength);
  const arrowEndY =
    direction === 'higher'
      ? arrowStartY - arrowLength
      : direction === 'lower'
        ? arrowStartY + arrowLength
        : arrowStartY;
  context.strokeStyle = arrowColor;
  context.fillStyle = arrowColor;
  context.lineWidth = 2.5 * layout.scale;
  context.beginPath();
  if (direction === 'mixed' || direction === 'uncertain') {
    context.moveTo(arrowX, arrowStartY - arrowLength / 2);
    context.lineTo(arrowX, arrowStartY + arrowLength / 2);
  } else {
    context.moveTo(arrowX, arrowStartY);
    context.lineTo(arrowX, arrowEndY);
  }
  context.stroke();
  const headSize = 6 * layout.scale;
  function arrowHead(y: number, pointsUp: boolean): void {
    context.beginPath();
    context.moveTo(arrowX, y);
    context.lineTo(arrowX - headSize, y + (pointsUp ? headSize : -headSize));
    context.lineTo(arrowX + headSize, y + (pointsUp ? headSize : -headSize));
    context.closePath();
    context.fill();
  }
  if (direction === 'higher') arrowHead(arrowEndY, true);
  if (direction === 'lower') arrowHead(arrowEndY, false);
  if (direction === 'mixed' || direction === 'uncertain') {
    arrowHead(arrowStartY - arrowLength / 2, true);
    arrowHead(arrowStartY + arrowLength / 2, false);
  }
  context.font = `700 ${10 * layout.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = 'left';
  context.fillText(
    direction === 'higher' ? 'Mod. höher' : direction === 'lower' ? 'Mod. niedriger' : 'Mod. uneinheitlich',
    arrowX + 10 * layout.scale,
    clamp(arrowEndY + 4 * layout.scale, layout.top + 12 * layout.scale, layout.bottom - 6 * layout.scale)
  );
}

export function drawNomogramCanvases(canvases: NomogramCanvases, result: CalculationResult, impact: NomogramModifierImpact): void {
  drawSingleNomogramOnCanvas(canvases.positive, result, result.lrPositive, result.postPositiveProbability, '#167044', 'positive', impact);
  drawSingleNomogramOnCanvas(canvases.negative, result, result.lrNegative, result.postNegativeProbability, '#b45309', 'negative', impact);
}
