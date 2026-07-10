import { describe, expect, it } from 'vitest';
import modifiers from '../data/clinical-modifiers.json';
import conditions from '../data/conditions.json';
import diagnosticChains from '../data/diagnostic-chains.json';
import physicalConditions from '../data/physical-conditions.json';
import physicalFindings from '../data/physical-findings.json';
import physicalSystems from '../data/physical-systems.json';
import assumptions from '../data/pretest-assumptions.json';
import tests from '../data/tests.json';
import {
  validateClinicalModifier,
  validateDiagnosticChain,
  validateDiagnosticTest,
  validateKnownConditionIds,
  validatePhysicalData,
  validatePretestAssumption
} from '../lib/validation';
import type { ClinicalCondition, ClinicalModifier, DiagnosticChain, DiagnosticTest, PhysicalCondition, PhysicalFinding, PhysicalSystem, PretestAssumption } from '../types';

describe('curated data', () => {
  it('validates all curated diagnostic tests', () => {
    const issues = (tests as DiagnosticTest[]).flatMap(validateDiagnosticTest);
    expect(issues).toEqual([]);
  });

  it('validates all curated pretest assumptions', () => {
    const issues = (assumptions as PretestAssumption[]).flatMap(validatePretestAssumption);
    expect(issues).toEqual([]);
  });

  it('validates all curated clinical modifiers', () => {
    const issues = (modifiers as ClinicalModifier[]).flatMap(validateClinicalModifier);
    expect(issues).toEqual([]);
  });

  it('validates all curated diagnostic chains', () => {
    const curatedTests = tests as DiagnosticTest[];
    const issues = (diagnosticChains as DiagnosticChain[]).flatMap(chain =>
      validateDiagnosticChain(chain, conditions as ClinicalCondition[], curatedTests, curatedTests.flatMap(test => test.evidenceProfiles))
    );
    expect(issues).toEqual([]);
  });

  it('validates McGee physical-exam data', () => {
    const issues = validatePhysicalData(
      physicalSystems as PhysicalSystem[],
      physicalConditions as PhysicalCondition[],
      physicalFindings as PhysicalFinding[]
    );
    expect(issues).toEqual([]);
  });

  it('uses known centralized condition ids', () => {
    const issues = validateKnownConditionIds(
      conditions as ClinicalCondition[],
      tests as DiagnosticTest[],
      assumptions as PretestAssumption[],
      modifiers as ClinicalModifier[]
    );
    expect(issues).toEqual([]);
  });

  it('does not use PubMed search URLs as curated sources', () => {
    const sourceUrls = [
      ...(tests as DiagnosticTest[]).flatMap(test => test.evidenceProfiles.flatMap(profile => profile.sources.map(source => source.url))),
      ...(assumptions as PretestAssumption[]).flatMap(assumption => assumption.sources.map(source => source.url)),
      ...(modifiers as ClinicalModifier[]).flatMap(modifier => modifier.sources.map(source => source.url)),
      ...(diagnosticChains as DiagnosticChain[]).flatMap(chain => chain.sources.map(source => source.url))
    ];
    expect(sourceUrls.filter(url => url.includes('pubmed.ncbi.nlm.nih.gov/?term='))).toEqual([]);
  });

  it('has a fallback pretest assumption for every curated test condition', () => {
    const fallbackConditionIds = new Set(
      (assumptions as PretestAssumption[])
        .filter(assumption => assumption.evidenceLevel === 'fallback')
        .map(assumption => assumption.conditionId)
    );
    const testConditionIds = new Set((tests as DiagnosticTest[]).map(test => test.conditionId));
    expect([...testConditionIds].filter(conditionId => !fallbackConditionIds.has(conditionId))).toEqual([]);
  });

  it('does not contain LR 1/1 placeholders or zero LR values', () => {
    const profiles = (tests as DiagnosticTest[]).flatMap(test => test.evidenceProfiles);
    expect(profiles.filter(profile => profile.lrPositive === 1 && profile.lrNegative === 1)).toEqual([]);
    expect(profiles.filter(profile => profile.lrNegative === 0)).toEqual([]);
  });

  it('keeps the documented McGee priority audit groups stable', () => {
    const findings = physicalFindings as PhysicalFinding[];
    expect(findings.filter(finding => (finding.lrPositive.value ?? 0) >= 10)).toHaveLength(99);
    expect(findings.filter(finding => finding.lrNegative.value != null && finding.lrNegative.value <= 0.1)).toHaveLength(51);
    expect(findings.filter(finding => finding.lrNegative.notReported)).toHaveLength(94);
    expect(findings.every(finding => finding.reviewStatus === 'needs-review')).toBe(true);
  });
});
