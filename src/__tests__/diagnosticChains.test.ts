import { describe, expect, it } from 'vitest';
import chains from '../data/diagnostic-chains.json';
import tests from '../data/tests.json';
import { calculateDiagnosticChain, chainsForContext } from '../app/diagnosticChains';
import { posttestProbability } from '../lib/calculations';
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
    expect(positivePositive?.intermediateProbability).toBeCloseTo(posttestProbability(0.04, 22.25), 5);
    expect(positivePositive?.finalProbability).toBeGreaterThan(0.9);
  });

  it('stops after a negative ARR instead of inventing a confirmation-test path', () => {
    const chain = (chains as DiagnosticChain[]).find(item => item.id === 'pa-arr-to-oral-sodium-loading')!;
    const viewModel = calculateDiagnosticChain(chain, curatedTests, profiles, 0.04);
    expect(viewModel?.paths.map(path => path.label)).toEqual([
      'positiv → positiv',
      'positiv → negativ',
      'negativ → stoppen'
    ]);
    expect(viewModel?.paths.find(path => path.firstResultLabel === 'negativ')?.second).toBeNull();
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
      expect(viewModel?.paths).toHaveLength(3);
      expect(viewModel?.paths.every(path => path.finalProbability >= 0 && path.finalProbability <= 1)).toBe(true);
    });
  });

  it('does not calculate CTPA after a negative D-dimer', () => {
    const chain = (chains as DiagnosticChain[]).find(item => item.id === 'pe-ddimer-to-ctpa')!;
    const viewModel = calculateDiagnosticChain(chain, curatedTests, profiles, 0.1);
    const negativePath = viewModel?.paths.find(path => path.firstResultLabel === 'negativ');
    expect(negativePath?.status).toBe('stopped');
    expect(negativePath?.secondResultLabel).toBeNull();
    expect(negativePath?.finalProbability).toBe(negativePath?.intermediateProbability);
  });
});
