import { describe, expect, it } from 'vitest';
import conditions from '../data/conditions.json';
import { getPretestEstimate, pretestProbabilityDataset } from '../app/pretestEstimates';
import type { PretestProbabilityDataset } from '../types';

describe('extended pretest probability estimates', () => {
  it('loads the curated start-value dataset', () => {
    expect(pretestProbabilityDataset.sources.length).toBeGreaterThan(0);
    expect(pretestProbabilityDataset.estimates.length).toBeGreaterThan(0);
  });

  it('links every estimate to at least one existing source', () => {
    const sourceIds = new Set(pretestProbabilityDataset.sources.map(source => source.id));
    const missing = pretestProbabilityDataset.estimates.flatMap(estimate =>
      estimate.sources.length === 0
        ? [`${estimate.id}:no-source`]
        : estimate.sources.filter(sourceId => !sourceIds.has(sourceId)).map(sourceId => `${estimate.id}:${sourceId}`)
    );
    expect(missing).toEqual([]);
  });

  it('uses centralized condition ids for every curated estimate', () => {
    const conditionIds = new Set(conditions.map(condition => condition.id));
    const unknown = pretestProbabilityDataset.estimates
      .filter(estimate => !conditionIds.has(estimate.diseaseId))
      .map(estimate => `${estimate.id}:${estimate.diseaseId}`);
    expect(unknown).toEqual([]);
  });

  it('uses valid probability ranges', () => {
    const invalidRanges = pretestProbabilityDataset.estimates
      .filter(estimate => {
        const [low, high] = estimate.probabilityRangePercent;
        return low < 0 || high > 100 || low > high;
      })
      .map(estimate => estimate.id);
    expect(invalidRanges).toEqual([]);
  });

  it('creates warnings for active high-severity preanalytical issues', () => {
    const result = getPretestEstimate(
      'primarer-hyperaldosteronismus',
      'hausarztpraxis',
      [],
      ['Kaliumstatus'],
      []
    );
    expect(result.activePreanalyticalIssues.map(issue => issue.issue)).toContain('Kaliumstatus');
    expect(result.activeWarnings).toContain('Präanalytik/Medikamente können Testresultat wesentlich verfälschen.');
    expect(result.qualitativeAdjustedRisk).toBe('nicht valide berechenbar wegen Präanalytik/Medikamenten');
  });

  it('creates warnings for active high-severity medication interferences', () => {
    const result = getPretestEstimate(
      'primarer-hyperaldosteronismus',
      'hausarztpraxis',
      [],
      [],
      ['Spironolacton']
    );
    expect(result.activeMedicationInterferences.map(item => item.medicationOrClass).join(' ')).toContain('Spironolacton');
    expect(result.activeWarnings).toContain('Präanalytik/Medikamente können Testresultat wesentlich verfälschen.');
  });

  it('does not calculate a new percentage for qualitative modifiers', () => {
    const result = getPretestEstimate(
      'primarer-hyperaldosteronismus',
      'hausarztpraxis',
      ['Resistente Hypertonie'],
      [],
      []
    );
    expect(result.baseProbability).toBe(9.4);
    expect(result.qualitativeAdjustedRisk).toBe('sehr deutlich erhöht');
    expect(result.probabilityRange).toEqual([5, 14]);
  });

  it('can operate on injected datasets for future extensions', () => {
    const dataset: PretestProbabilityDataset = {
      sources: [{ id: 'source', title: 'Test source', type: 'review', url: 'https://example.org' }],
      estimates: [
        {
          id: 'estimate',
          diseaseId: 'future-condition',
          diseaseName: 'Future condition',
          domain: ['endocrinology'],
          settingId: 'general',
          setting: 'Allgemein',
          probabilityRangePercent: [1, 2],
          estimateType: 'expertestimate',
          evidenceQuality: 'Dexpertestimate',
          qualityNote: 'Nur Testdaten.',
          sources: ['source'],
          modifiers: [],
          preanalyticalIssues: [],
          medicationInterferences: []
        }
      ]
    };
    const result = getPretestEstimate('future-condition', 'hausarztpraxis', [], [], [], dataset);
    expect(result.estimate?.id).toBe('estimate');
    expect(result.confidenceLabel).toBe('Expertenschätzung');
  });
});
