import { describe, expect, it } from 'vitest';
import chains from '../data/diagnostic-chains.json';
import tests from '../data/tests.json';
import { calculateDiagnosticChain, chainsForContext } from '../app/diagnosticChains';
import type { DiagnosticChain, DiagnosticTest } from '../types';

const curatedTests = tests as DiagnosticTest[];
const profiles = curatedTests.flatMap(test => test.evidenceProfiles);

describe('diagnostic chains', () => {
  it('filters chains by condition and setting', () => {
    const result = chainsForContext(
      chains as DiagnosticChain[],
      'primarer-hyperaldosteronismus',
      'ambulant-nephrologie'
    );
    expect(result.map(chain => chain.id)).toContain('pa-arr-to-oral-sodium-loading');
  });

  it('uses posttest probability from stage one as pretest probability for stage two', () => {
    const chain = (chains as DiagnosticChain[]).find(item => item.id === 'pa-arr-to-oral-sodium-loading');
    expect(chain).toBeDefined();
    const viewModel = calculateDiagnosticChain(chain!, curatedTests, profiles, 0.04);
    expect(viewModel).not.toBeNull();
    const positivePositive = viewModel!.paths.find(path => path.id.endsWith('pos-pos'));
    expect(positivePositive?.intermediateProbability).toBeCloseTo(0.4030, 3);
    expect(positivePositive?.finalProbability).toBeGreaterThan(0.9);
  });

  it('calculates all four path combinations', () => {
    const chain = (chains as DiagnosticChain[]).find(item => item.id === 'pa-arr-to-oral-sodium-loading')!;
    const viewModel = calculateDiagnosticChain(chain, curatedTests, profiles, 0.04);
    expect(viewModel?.paths.map(path => path.label)).toEqual(['+ dann +', '+ dann −', '− dann +', '− dann −']);
  });
});
