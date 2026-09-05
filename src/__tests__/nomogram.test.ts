import { describe, expect, it } from 'vitest';
import {
  createNomogramLayout,
  nomogramPoints,
  pointOnLineAtX,
  probabilityToY,
  ratioTicksForMode,
  ratioToY
} from '../lib/nomogram';
import { posttestProbability } from '../lib/calculations';

function expectVisible(y: number, top: number, bottom: number): void {
  expect(y).toBeGreaterThanOrEqual(top);
  expect(y).toBeLessThanOrEqual(bottom);
}

describe('Nomogram geometry', () => {
  it('places the LR point on the straight line between pretest and posttest', () => {
    const layout = createNomogramLayout({ width: 720, height: 405 });
    const pretest = 0.08;
    const lr = 16.2;
    const posttest = posttestProbability(pretest, lr);
    const points = nomogramPoints(pretest, lr, posttest, layout);
    const expectedLrPoint = pointOnLineAtX(points.pre, points.post, layout.xLr);

    expect(points.lr.y).toBeCloseTo(expectedLrPoint.y, 5);
  });

  it('draws LR+ as a visually rising line', () => {
    const layout = createNomogramLayout({ width: 720, height: 405 });
    const pretest = 0.08;
    const lr = 16.2;
    const posttest = posttestProbability(pretest, lr);
    const points = nomogramPoints(pretest, lr, posttest, layout);

    expect(points.post.y).toBeLessThan(points.pre.y);
  });

  it('draws LR− as a visually falling line', () => {
    const pretest = 0.08;
    const lr = 0.03;
    const layout = createNomogramLayout({ width: 720, height: 405 }, [pretest, posttestProbability(pretest, lr)]);
    const posttest = posttestProbability(pretest, lr);
    const points = nomogramPoints(pretest, lr, posttest, layout);

    expect(points.post.y).toBeGreaterThan(points.pre.y);
  });

  it('keeps very low likelihood ratios visible', () => {
    const pretest = 0.08;
    const lr = 0.03;
    const posttest = posttestProbability(pretest, lr);
    const layout = createNomogramLayout({ width: 720, height: 405 }, [pretest, posttest]);
    const points = nomogramPoints(pretest, lr, posttest, layout);

    expectVisible(points.pre.y, layout.top, layout.bottom);
    expectVisible(points.lr.y, layout.top, layout.bottom);
    expectVisible(points.post.y, layout.top, layout.bottom);
  });

  it('keeps high likelihood ratios and all configured ratio ticks visible', () => {
    const layout = createNomogramLayout({ width: 720, height: 405 });
    const pretest = 0.08;
    const lr = 16.2;
    const posttest = posttestProbability(pretest, lr);
    const points = nomogramPoints(pretest, lr, posttest, layout);

    expectVisible(points.pre.y, layout.top, layout.bottom);
    expectVisible(points.lr.y, layout.top, layout.bottom);
    expectVisible(points.post.y, layout.top, layout.bottom);
    ratioTicksForMode('positive').forEach(tick => expectVisible(ratioToY(tick, pretest, layout), layout.top, layout.bottom));
  });

  it('uses the same probability orientation on both probability axes', () => {
    const layout = createNomogramLayout({ width: 720, height: 405 });

    expect(probabilityToY(0.99, layout)).toBeLessThan(probabilityToY(0.01, layout));
  });
});
