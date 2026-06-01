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

  it('calculates the added diagnostic chain examples with valid second stages', () => {
    const expectedChains = [
      'dvt-ddimer-to-compression-ultrasound',
      'pe-ddimer-to-ctpa',
      'hf-ntprobnp-to-lung-ultrasound',
      'celiac-ttg-iga-to-ema-iga',
      'graves-trab-to-doppler'
    ];

    expectedChains.forEach(chainId => {
      const chain = (chains as DiagnosticChain[]).find(item => item.id === chainId);
      expect(chain, chainId).toBeDefined();
      const viewModel = calculateDiagnosticChain(chain!, curatedTests, profiles, 0.1);
      expect(viewModel?.stages).toHaveLength(2);
      expect(viewModel?.paths).toHaveLength(4);
      expect(viewModel?.paths.every(path => path.finalProbability >= 0 && path.finalProbability <= 1)).toBe(true);
    });
  });
});
