import { posttestProbability } from "./calculations";

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
  logitLow: number;
  logitHigh: number;
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

export type NomogramMode = "positive" | "negative";

const MIN_PROBABILITY = 0.01;
const MAX_PROBABILITY = 0.99;
const LOGIT_SPAN = Math.log(MAX_PROBABILITY / MIN_PROBABILITY);

export const probabilityTicks = [
  0.00000001, 0.000001, 0.00001, 0.0001, 0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 0.8,
  0.9, 0.95, 0.99, 0.999, 0.9999, 0.99999, 0.999999,
];
export const positiveRatioTicks = [1, 3, 10, 30, 100];
export const negativeRatioTicks = [1, 0.3, 0.1, 0.03, 0.01];

export function ratioTicksForMode(mode: NomogramMode): number[] {
  return mode === "positive" ? positiveRatioTicks : negativeRatioTicks;
}

export function createNomogramLayout(
  { width, height }: NomogramDimensions,
  probabilities: number[] = [],
): NomogramLayout {
  const scale = Math.min(width / 980, height / 560);
  const top = Math.max(66 * scale, 52);
  const bottom = height - 66;
  const sideMargin = Math.max(70, Math.min(100, width * 0.12));
  const logits = probabilities
    .filter((p) => p > 0 && p < 1)
    .map((p) => Math.log(p) - Math.log1p(-p));
  return {
    top,
    bottom,
    xPre: sideMargin,
    xLr: width / 2,
    xPost: width - sideMargin,
    scale,
    logitLow: Math.min(-LOGIT_SPAN, ...logits) - 0.25,
    logitHigh: Math.max(LOGIT_SPAN, ...logits) + 0.25,
  };
}

export function probabilityToY(
  probability: number,
  layout: NomogramLayout,
): number {
  const logit = Math.log(probability) - Math.log1p(-probability);
  return (
    layout.bottom -
    ((logit - layout.logitLow) / (layout.logitHigh - layout.logitLow)) *
      (layout.bottom - layout.top)
  );
}

export function ratioToY(
  ratio: number,
  pretestProbability: number,
  layout: NomogramLayout,
): number {
  const pre = { x: layout.xPre, y: probabilityToY(pretestProbability, layout) };
  const post = {
    x: layout.xPost,
    y: probabilityToY(posttestProbability(pretestProbability, ratio), layout),
  };
  return pointOnLineAtX(pre, post, layout.xLr).y;
}

export function nomogramPoints(
  pretestProbability: number,
  likelihoodRatio: number,
  posttestProbability: number,
  layout: NomogramLayout,
): NomogramPoints {
  const pre = { x: layout.xPre, y: probabilityToY(pretestProbability, layout) };
  const post = {
    x: layout.xPost,
    y: probabilityToY(posttestProbability, layout),
  };
  return {
    pre,
    lr: {
      x: layout.xLr,
      y: ratioToY(likelihoodRatio, pretestProbability, layout),
    },
    post,
  };
}

export function pointOnLineAtX(
  start: NomogramPoint,
  end: NomogramPoint,
  x: number,
): NomogramPoint {
  const t = (x - start.x) / (end.x - start.x);
  return {
    x,
    y: start.y + (end.y - start.y) * t,
  };
}
