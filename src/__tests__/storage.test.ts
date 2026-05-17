import { describe, expect, it } from 'vitest';
import { buildExport, parseUserDataExport } from '../lib/storage';
import type { ClinicalModifier, DiagnosticTest, EvidenceProfile, PretestAssumption } from '../types';

const customTest: DiagnosticTest = {
  id: 'custom-test',
  name: 'Custom test',
  category: 'Eigene Tests',
  condition: 'Condition',
  description: 'Description',
  evidenceProfiles: [],
  custom: true
};

const customProfile: EvidenceProfile = {
  id: 'custom-profile',
  testId: 'custom-test',
  label: 'Custom profile',
  kind: 'custom',
  method: 'Method',
  cutoff: 'Cutoff',
  sensitivity: 0.9,
  specificity: 0.8,
  lrPositive: 4.5,
  lrNegative: 0.125,
  population: 'Population',
  rationale: 'Rationale',
  limitations: 'Limitations',
  lastReviewed: '2026-05-17',
  sources: [
    {
      title: 'Source',
      year: 2026,
      url: 'https://example.com/source',
      kind: 'Lokale Annahme',
      note: 'Note'
    }
  ]
};

const scenarioProfile: EvidenceProfile = {
  ...customProfile,
  id: 'scenario-profile',
  kind: 'scenario',
  deviationFromProfileId: 'custom-profile',
  deviationReason: 'Lokaler Cut-off weicht ab.'
};

const customAssumption: PretestAssumption = {
  id: 'custom-assumption',
  condition: 'Condition',
  conditionId: 'condition',
  setting: 'Setting',
  settingId: 'setting',
  evidenceLevel: 'direct',
  population: 'Population',
  probability: 0.1,
  rangeLow: 0.05,
  rangeHigh: 0.2,
  rationale: 'Rationale',
  limitations: 'Limitations',
  lastReviewed: '2026-05-17',
  kind: 'custom',
  custom: true,
  sources: [
    {
      title: 'Source',
      year: 2026,
      url: 'https://example.com/source',
      kind: 'Lokale Annahme',
      note: 'Note'
    }
  ]
};

const customModifier: ClinicalModifier = {
  id: 'custom-modifier',
  conditionId: 'condition',
  label: 'Custom modifier',
  category: 'Symptom',
  direction: 'increases',
  likelihoodRatio: 2,
  rationale: 'Rationale',
  limitations: 'Limitations',
  lastReviewed: '2026-05-17',
  kind: 'custom',
  custom: true,
  sources: customProfile.sources
};

describe('user data export', () => {
  it('builds a versioned v3 export bundle', () => {
    const payload = buildExport([customTest], [customProfile, scenarioProfile], [customAssumption], [customModifier]);
    expect(payload.schemaVersion).toBe(3);
    expect(payload.customTests).toHaveLength(1);
    expect(payload.customEvidenceProfiles).toHaveLength(2);
    expect(payload.customAssumptions).toHaveLength(1);
    expect(payload.customModifiers).toHaveLength(1);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('parses a valid v3 export bundle', () => {
    const payload = buildExport([customTest], [customProfile], [customAssumption], [customModifier]);
    const parsed = parseUserDataExport(JSON.stringify(payload));
    expect(parsed.customTests[0].id).toBe('custom-test');
    expect(parsed.customEvidenceProfiles[0].id).toBe('custom-profile');
    expect(parsed.customAssumptions[0].id).toBe('custom-assumption');
    expect(parsed.customModifiers[0].id).toBe('custom-modifier');
  });

  it('migrates a valid v2 export bundle to v3', () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        customTests: [customTest],
        customEvidenceProfiles: [customProfile],
        customAssumptions: [customAssumption]
      })
    );
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.customModifiers).toEqual([]);
  });

  it('migrates a simple v1 export bundle', () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        customTests: [
          {
            id: 'legacy-test',
            name: 'Legacy',
            category: 'Legacy',
            condition: 'Legacy condition',
            method: 'Legacy method',
            cutoff: 'Legacy cutoff',
            sensitivity: 0.9,
            specificity: 0.8,
            population: 'Legacy population',
            rationale: 'Legacy rationale',
            limitations: 'Legacy limitations',
            lastReviewed: '2026-05-17',
            sources: customProfile.sources
          }
        ],
        customAssumptions: [customAssumption],
        selectedAssumptionId: 'pa-resistant-hypertension'
      })
    );
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.customEvidenceProfiles[0].testId).toBe('legacy-test');
    expect(parsed.customAssumptions[0].conditionId).toBe('condition');
    expect(parsed.customAssumptions[0].evidenceLevel).toBe('direct');
    expect(parsed.customModifiers).toEqual([]);
  });

  it('rejects unsupported export versions', () => {
    expect(() =>
      parseUserDataExport(
        JSON.stringify({
          schemaVersion: 999,
          exportedAt: new Date().toISOString(),
          customTests: [],
          customEvidenceProfiles: [],
          customAssumptions: []
        })
      )
    ).toThrow('Nicht unterstützte Export-Version.');
  });
});
