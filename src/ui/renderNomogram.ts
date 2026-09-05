import type { CalculationResult } from "../types";
import { formatPercent, formatRatio } from "../lib/calculations";
import {
  createNomogramLayout,
  type NomogramMode,
  nomogramPoints,
  probabilityTicks,
  probabilityToY,
  ratioTicksForMode,
  ratioToY,
} from "../lib/nomogram";

export type NomogramModifierDirection =
  | "higher"
  | "lower"
  | "mixed"
  | "uncertain"
  | "none";
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
  ratio: number,
  post: number,
  color: string,
  mode: NomogramMode,
  _impact: NomogramModifierImpact,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(240, rect.width || 720);
  const height = Math.max(300, rect.height || 420);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  const description = `Prätest ${formatPercent(result.pretestProbability)}, LR ${formatRatio(ratio)}, Posttest ${formatPercent(post)}. Logarithmische Odds-Skala; LR-Achse an die Ausgangswahrscheinlichkeit angepasst.`;
  canvas.setAttribute("aria-label", description);
  canvas.textContent = description;
  context.font = "600 14px system-ui";
  context.fillStyle = "#253343";
  if (
    !(
      result.pretestProbability > 0 &&
      result.pretestProbability < 1 &&
      post > 0 &&
      post < 1
    ) ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    context.fillText(
      `Prä ${formatPercent(result.pretestProbability)} · Post ${formatPercent(post)}`,
      14,
      42,
    );
    context.fillText(
      "Kein endlicher Verlauf auf der Odds-Skala.",
      14,
      70,
      width - 28,
    );
    return;
  }
  const layout = createNomogramLayout({ width, height }, [
    result.pretestProbability,
    post,
  ]);
  const points = nomogramPoints(result.pretestProbability, ratio, post, layout);
  const tickFont = width >= 600 ? 16 : 13;
  const axis = (
    x: number,
    title: string,
    ticks: number[],
    mapper: (n: number) => number,
  ): void => {
    context.strokeStyle = "#9daab7";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, layout.top);
    context.lineTo(x, layout.bottom);
    context.stroke();
    context.fillStyle = "#1a2531";
    context.font = "700 18px system-ui";
    context.textAlign = "center";
    context.fillText(title, x, 28);
    context.font = `600 ${tickFont}px system-ui`;
    let lastY = -Infinity;
    ticks
      .map((value) => ({ value, y: mapper(value) }))
      .filter(
        (t) =>
          Number.isFinite(t.y) &&
          t.y >= layout.top + 6 &&
          t.y <= layout.bottom - 6,
      )
      .sort((a, b) => a.y - b.y)
      .forEach(({ value, y }) => {
        if (y - lastY < tickFont + 10) return;
        lastY = y;
        context.strokeStyle = "#9daab7";
        context.beginPath();
        context.moveTo(x - 4, y);
        context.lineTo(x + 4, y);
        context.stroke();
        context.fillStyle = "#344658";
        context.textAlign = x === layout.xPost ? "left" : "right";
        const label =
          title === "LR"
            ? String(value).replace(".", ",")
            : (value * 100).toLocaleString("de-DE", {
                maximumFractionDigits: 6,
              }) + "%";
        context.fillText(
          label,
          x === layout.xPost ? x + 8 : x - 8,
          y + tickFont / 3,
          layout.xPre - 12,
        );
      });
  };
  axis(layout.xPre, "Prä", probabilityTicks, (p) => probabilityToY(p, layout));
  axis(layout.xLr, "LR", ratioTicksForMode(mode), (r) =>
    ratioToY(r, result.pretestProbability, layout),
  );
  axis(layout.xPost, "Post", probabilityTicks, (p) =>
    probabilityToY(p, layout),
  );
  context.strokeStyle = color;
  context.lineWidth = 3.5;
  context.beginPath();
  context.moveTo(points.pre.x, points.pre.y);
  context.lineTo(points.post.x, points.post.y);
  context.stroke();
  context.fillStyle = color;
  for (const point of [points.pre, points.lr, points.post]) {
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, Math.PI * 2);
    context.fill();
  }
  // Exact values remain outside the axis-label area on narrow screens and at extreme probabilities.
  context.textAlign = "center";
  context.font = "750 16px system-ui";
  context.fillText(
    `LR ${formatRatio(ratio)} · Post ${formatPercent(post)}`,
    width / 2,
    height - 32,
    width - 24,
  );
  context.font = "500 12px system-ui";
  context.fillStyle = "#536373";
  context.fillText(
    `Prä ${formatPercent(result.pretestProbability)} · logarithmische Odds`,
    width / 2,
    height - 12,
    width - 24,
  );
}

export function drawNomogramCanvases(
  canvases: NomogramCanvases,
  result: CalculationResult,
  impact: NomogramModifierImpact,
): void {
  drawSingleNomogramOnCanvas(
    canvases.positive,
    result,
    result.lrPositive,
    result.postPositiveProbability,
    "#167044",
    "positive",
    impact,
  );
  drawSingleNomogramOnCanvas(
    canvases.negative,
    result,
    result.lrNegative,
    result.postNegativeProbability,
    "#ad4a0b",
    "negative",
    impact,
  );
}
