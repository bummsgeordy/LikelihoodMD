import { clamp, posttestProbability } from './calculations';

export interface NomogramDimensions {
  width: number;
  height: number;
}

export interface NomogramLayout {
  top: number;
  bottom: number;
  xPre: number;
  xLr: number;
  xPost: number;
  scale: number;
}

export interface NomogramPoint {
  x: number;
  y: number;
}

export interface NomogramPoints {
  pre: NomogramPoint;
  lr: NomogramPoint;
  post: NomogramPoint;
}

export type NomogramMode = 'positive' | 'negative';

const MIN_PROBABILITY = 0.01;
const MAX_PROBABILITY = 0.99;
const MIN_RATIO = 0.01;
const MAX_RATIO = 100;
const LOGIT_SPAN = Math.log(MAX_PROBABILITY / MIN_PROBABILITY);

export const probabilityTicks = [0.01, 0.05, 0.1, 0.2, 0.5, 0.8, 0.9, 0.95, 0.99];
export const positiveRatioTicks = [1, 3, 10, 30, 100];
export const negativeRatioTicks = [1, 0.3, 0.1, 0.03, 0.01];

export function ratioTicksForMode(mode: NomogramMode): number[] {
  return mode === 'positive' ? positiveRatioTicks : negativeRatioTicks;
}

export function createNomogramLayout({ width, height }: NomogramDimensions): NomogramLayout {
  const scale = Math.min(width / 720, height / 405);
  const top = 56 * scale;
  const bottom = height - 50 * scale;
  const sideMargin = 98 * scale;
  return {
    top,
    bottom,
    xPre: sideMargin,
    xLr: width / 2,
    xPost: width - sideMargin,
    scale
  };
}

export function probabilityToY(probability: number, layout: NomogramLayout): number {
  const clamped = clamp(probability, MIN_PROBABILITY, MAX_PROBABILITY);
  const logit = Math.log(clamped / (1 - clamped));
  return layout.bottom - ((logit + LOGIT_SPAN) / (2 * LOGIT_SPAN)) * (layout.bottom - layout.top);
}

export function ratioToY(ratio: number, pretestProbability: number, layout: NomogramLayout): number {
  const clampedRatio = clamp(ratio, MIN_RATIO, MAX_RATIO);
  const pre = { x: layout.xPre, y: probabilityToY(pretestProbability, layout) };
  const post = {
    x: layout.xPost,
    y: probabilityToY(posttestProbability(pretestProbability, clampedRatio), layout)
  };
  return pointOnLineAtX(pre, post, layout.xLr).y;
}

export function nomogramPoints(
  pretestProbability: number,
  likelihoodRatio: number,
  posttestProbability: number,
  layout: NomogramLayout
): NomogramPoints {
  const pre = { x: layout.xPre, y: probabilityToY(pretestProbability, layout) };
  const post = { x: layout.xPost, y: probabilityToY(posttestProbability, layout) };
  return {
    pre,
    lr: { x: layout.xLr, y: ratioToY(likelihoodRatio, pretestProbability, layout) },
    post
  };
}

export function pointOnLineAtX(start: NomogramPoint, end: NomogramPoint, x: number): NomogramPoint {
  const t = (x - start.x) / (end.x - start.x);
  return {
    x,
    y: start.y + (end.y - start.y) * t
  };
}
