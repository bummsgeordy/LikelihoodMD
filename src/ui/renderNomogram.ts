import type { CalculationResult } from '../types';
import { clamp, formatRatio } from '../lib/calculations';
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

function drawSingleNomogramOnCanvas(
  canvas: HTMLCanvasElement,
  result: CalculationResult,
  likelihoodRatio: number,
  posttestProbability: number,
  color: string,
  label: string,
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
  const points = nomogramPoints(result.pretestProbability, likelihoodRatio, posttestProbability, layout);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);

  function axis(x: number, axisLabel: string, ticks: number[], mapper: (value: number) => number): void {
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, layout.top);
    context.lineTo(x, layout.bottom);
    context.stroke();
    context.fillStyle = '#111827';
    context.font = `600 ${14 * layout.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.fillText(axisLabel, x, 26 * layout.scale);
    context.font = `${11 * layout.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
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
      context.fillText(text, x === layout.xPost ? x + 9 * layout.scale : x - 9 * layout.scale, y + 4 * layout.scale);
    });
  }

  axis(layout.xPre, 'Prä', probabilityTicks, value => probabilityToY(value, layout));
  axis(layout.xLr, 'LR', ratioTicksForMode(mode), value => ratioToY(value, result.pretestProbability, layout));
  axis(layout.xPost, 'Post', probabilityTicks, value => probabilityToY(value, layout));

  context.strokeStyle = color;
  context.lineWidth = 3 * layout.scale;
  context.beginPath();
  context.moveTo(points.pre.x, points.pre.y);
  context.lineTo(points.post.x, points.post.y);
  context.stroke();

  context.fillStyle = color;
  [points.pre, points.lr, points.post].forEach(point => {
    context.beginPath();
    context.arc(point.x, point.y, 4.5 * layout.scale, 0, Math.PI * 2);
    context.fill();
  });

  context.font = `700 ${12 * layout.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = 'left';
  context.fillText(label, points.post.x + 14 * layout.scale, points.post.y + 4 * layout.scale);

  const ratioLabel = formatRatio(likelihoodRatio);
  context.font = `700 ${11 * layout.scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const labelPaddingX = 5 * layout.scale;
  const labelPaddingY = 4 * layout.scale;
  const labelWidth = context.measureText(ratioLabel).width + labelPaddingX * 2;
  const labelHeight = 18 * layout.scale;
  const labelX = layout.xLr + 12 * layout.scale;
  const labelY = clamp(points.lr.y - labelHeight - 6 * layout.scale, layout.top + 4 * layout.scale, layout.bottom - labelHeight - 4 * layout.scale);
  context.fillStyle = '#fff';
  context.strokeStyle = color;
  context.lineWidth = 1 * layout.scale;
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
  drawSingleNomogramOnCanvas(canvases.positive, result, result.lrPositive, result.postPositiveProbability, '#167044', '+', 'positive', impact);
  drawSingleNomogramOnCanvas(canvases.negative, result, result.lrNegative, result.postNegativeProbability, '#b45309', '-', 'negative', impact);
}
