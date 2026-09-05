import { describe, expect, it } from 'vitest';
import chainsRaw from '../data/diagnostic-chains.json';
import testsRaw from '../data/tests.json';
import { calculateDiagnosticChain, resolveChainStages } from '../app/diagnosticChains';
import { posttestProbability, tryResolveLikelihoodRatios } from '../lib/calculations';
import type { DiagnosticChain, DiagnosticTest } from '../types';

const chains=chainsRaw as DiagnosticChain[], tests=testsRaw as DiagnosticTest[], profiles=tests.flatMap(t=>t.evidenceProfiles);
describe('clinical pathways',()=>{
  it('never multiplies the current dependent or cross-population profiles',()=>{
    for(const chain of chains){
      const model=calculateDiagnosticChain(chain,tests,profiles,.1);
      expect(model?.stages).toHaveLength(2);
      expect(model?.paths).toEqual([]);
      expect(chain.calculationPolicy).toBe('workflow-only');
    }
  });
  it('retains D-dimer stop decisions without hypothetical imaging probabilities',()=>{
    for(const id of ['pe-ddimer-to-ctpa','dvt-ddimer-to-compression-ultrasound']){
      const chain=chains.find(c=>c.id===id)!;
      expect(chain.decisions?.some(d=>d.status==='stop'&&d.when.includes('Negatives D-Dimer'))).toBe(true);
      expect(calculateDiagnosticChain(chain,tests,profiles,.1)?.paths).toEqual([]);
    }
  });
  it('requires explicit verified conditional evidence before any numerical chain',()=>{
    const base=chains.find(c=>c.id==='cushing-lnsc-to-dst')!;
    const chain:DiagnosticChain={...base,calculationPolicy:'conditional-lr',conditionalEvidence:'Synthetic unit-test fixture; not clinical evidence',sourceCheck:{status:'verified',checkedAt:'2026-09-05',location:'Test fixture',note:'Synthetic'}};
    const model=calculateDiagnosticChain(chain,tests,profiles,.1)!;
    const lr=tryResolveLikelihoodRatios(model.stages[0].profile)!;
    expect(model.paths[0].intermediateProbability).toBeCloseTo(posttestProbability(.1,lr.lrPositive),10);
    expect(calculateDiagnosticChain({...chain,conditionalEvidence:undefined},tests,profiles,.1)?.paths).toEqual([]);
    expect(calculateDiagnosticChain({...chain,sourceCheck:{...chain.sourceCheck!,status:'restricted'}},tests,profiles,.1)?.paths).toEqual([]);
  });
  it('rejects profile/test or disease mismatch',()=>{
    const c=structuredClone(chains[0]);c.stages[0].evidenceProfileId='ntprobnp-400';
    expect(resolveChainStages(c,tests,profiles)).toHaveLength(1);
  });
  it('uses echo for non-acute heart failure and a contextual celiac confirmation',()=>{
    expect(chains.find(c=>c.id.startsWith('hf-'))?.stages[1].testId).toBe('echocardiography-hf');
    expect(chains.find(c=>c.id.startsWith('celiac-'))?.stages[1].testId).toBe('celiac-confirmation-context');
  });
});
