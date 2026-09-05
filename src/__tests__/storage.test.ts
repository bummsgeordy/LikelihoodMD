import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildExport,
  defaultState,
  loadState,
  mergeUserData,
  parseUserDataExport,
  saveState,
} from "../lib/storage";
import type {
  ClinicalModifier,
  DiagnosticTest,
  EvidenceProfile,
  PretestAssumption,
} from "../types";

const reviewFields = {
  reviewStatus: "draft" as const,
  evidenceQuality: "expert-opinion" as const,
  dataCompleteness: "partial" as const,
  reviewNote: "Test fixture.",
};

const customTest: DiagnosticTest = {
  id: "custom-test",
  name: "Custom test",
  category: "Eigene Tests",
  conditionId: "condition",
  condition: "Condition",
  description: "Description",
  evidenceProfiles: [],
  custom: true,
};

const customProfile: EvidenceProfile = {
  id: "custom-profile",
  testId: "custom-test",
  label: "Custom profile",
  kind: "custom",
  calculationMode: "binary-lr",
  lrDerivation: "derived",
  method: "Method",
  cutoff: "Cutoff",
  sensitivity: 0.9,
  specificity: 0.8,
  lrPositive: 4.5,
  lrNegative: 0.125,
  population: "Population",
  rationale: "Rationale",
  limitations: "Limitations",
  lastReviewed: "2026-05-17",
  ...reviewFields,
  sources: [
    {
      title: "Source",
      year: 2026,
      url: "https://example.com/source",
      kind: "Lokale Annahme",
      note: "Note",
    },
  ],
};

const scenarioProfile: EvidenceProfile = {
  ...customProfile,
  id: "scenario-profile",
  kind: "scenario",
  deviationFromProfileId: "custom-profile",
  deviationReason: "Lokaler Cut-off weicht ab.",
};

const customAssumption: PretestAssumption = {
  id: "custom-assumption",
  condition: "Condition",
  conditionId: "condition",
  setting: "Setting",
  settingId: "setting",
  evidenceLevel: "direct",
  population: "Population",
  probability: 0.1,
  rangeLow: 0.05,
  rangeHigh: 0.2,
  rationale: "Rationale",
  limitations: "Limitations",
  lastReviewed: "2026-05-17",
  kind: "custom",
  custom: true,
  ...reviewFields,
  sources: [
    {
      title: "Source",
      year: 2026,
      url: "https://example.com/source",
      kind: "Lokale Annahme",
      note: "Note",
    },
  ],
};

const customModifier: ClinicalModifier = {
  id: "custom-modifier",
  conditionId: "condition",
  label: "Custom modifier",
  category: "Symptom",
  direction: "increases",
  likelihoodRatio: 2,
  quantificationStatus: "likelihood-ratio",
  rationale: "Rationale",
  limitations: "Limitations",
  lastReviewed: "2026-05-17",
  kind: "custom",
  custom: true,
  ...reviewFields,
  sources: customProfile.sources,
};

describe("user data export", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("repairs the former empty v7 startup without reusing its misleading slider value", () => {
    const previous = {
      ...defaultState,
      pretestInputVersion: undefined,
      pretestInputSource: "unset",
      manualPretestPercent: 50,
    };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) =>
          key.endsWith("-v7") ? JSON.stringify(previous) : null,
      },
    });
    expect(loadState()).toMatchObject({
      pretestInputSource: "illustrative",
      manualPretestPercent: 5,
      pretestInputVersion: 2,
    });
  });

  it("preserves a valid manually entered rare probability", () => {
    const previous = {
      ...defaultState,
      pretestInputSource: "manual",
      manualPretestPercent: 0.006,
    };
    vi.stubGlobal("window", {
      localStorage: { getItem: () => JSON.stringify(previous) },
    });
    expect(loadState()).toMatchObject({
      pretestInputSource: "manual",
      manualPretestPercent: 0.006,
    });
  });

  it("does not replace a deliberately cleared input with an illustrative value after reload", () => {
    const previous = {
      ...defaultState,
      pretestInputSource: "unset",
      manualPretestPercent: 12.3,
    };
    vi.stubGlobal("window", {
      localStorage: { getItem: () => JSON.stringify(previous) },
    });
    expect(loadState().pretestInputSource).toBe("unset");
  });

  it("preserves missing probabilities instead of replacing them with zero", () => {
    const payload = buildExport(
      [],
      [],
      [{ ...customAssumption, probability: null }],
    );
    expect(
      parseUserDataExport(JSON.stringify(payload)).customAssumptions[0]
        .probability,
    ).toBeNull();
  });

  it("rejects malformed, duplicate, orphaned and unsafe source data", () => {
    expect(() => parseUserDataExport("null")).toThrow("Datenstruktur");
    expect(() =>
      parseUserDataExport('{"schemaVersion":7,"__proto__":{}}'),
    ).toThrow("Unzulässiger Schlüssel");
    expect(() =>
      parseUserDataExport(
        JSON.stringify(
          buildExport([], [], [customAssumption, customAssumption]),
        ),
      ),
    ).toThrow("doppelte ID");
    expect(() =>
      parseUserDataExport(
        JSON.stringify(buildExport([], [customProfile], [])),
        [],
      ),
    ).toThrow("unbekannten Test");
    for (const url of [
      "javascript:alert(1)",
      "https://",
      "https://name:secret@example.com/",
    ]) {
      const profile = {
        ...customProfile,
        sources: [{ ...customProfile.sources[0], url }],
      };
      expect(() =>
        parseUserDataExport(
          JSON.stringify(buildExport([customTest], [profile], [])),
        ),
      ).toThrow("URL");
    }
  });

  it("rejects incomplete source checks and duplicate categories", () => {
    const p = { ...customProfile, sourceCheck: { status: "verified" } };
    expect(() =>
      parseUserDataExport(
        JSON.stringify(buildExport([customTest], [p as EvidenceProfile], [])),
      ),
    ).toThrow("Quellenprüfung");
    const categories = [
      { id: "I", label: "I", interpretation: "Kontext" },
      { id: "I", label: "I", interpretation: "Kontext" },
    ];
    expect(() =>
      parseUserDataExport(
        JSON.stringify(
          buildExport(
            [customTest],
            [{ ...customProfile, resultCategories: categories }],
            [],
          ),
        ),
      ),
    ).toThrow("Ergebniskategorien");
  });

  it("measures the import limit in UTF-8 bytes", () => {
    expect(() => parseUserDataExport("ä".repeat(1024 * 1024 + 1))).toThrow(
      "größer als 2 MiB",
    );
  });

  it.each([2, 3, 4, 5, 6])(
    "preserves local separate profiles from storage v%s",
    (version) => {
      const previous = {
        ...defaultState,
        customTests: [customTest],
        customEvidenceProfiles: [customProfile],
        customAssumptions: [customAssumption],
      };
      vi.stubGlobal("window", {
        localStorage: {
          getItem: (key: string) =>
            key === `likelihood-ratio-rechner-state-v${version}`
              ? JSON.stringify(previous)
              : null,
        },
      });
      expect(loadState().customEvidenceProfiles[0].id).toBe(customProfile.id);
      expect(loadState().customAssumptions[0].id).toBe(customAssumption.id);
    },
  );

  it("reports a storage quota error without throwing or losing the in-memory state", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
      dispatchEvent,
    });
    expect(saveState({ ...defaultState, customTests: [customTest] })).toBe(
      false,
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  it("builds a versioned v7 export bundle", () => {
    const payload = buildExport(
      [customTest],
      [customProfile, scenarioProfile],
      [customAssumption],
      [customModifier],
    );
    expect(payload.schemaVersion).toBe(7);
    expect(payload.customTests).toHaveLength(1);
    expect(payload.customEvidenceProfiles).toHaveLength(2);
    expect(payload.customAssumptions).toHaveLength(1);
    expect(payload.customModifiers).toHaveLength(1);
    expect(new Date(payload.exportedAt).toString()).not.toBe("Invalid Date");
  });

  it("preserves embedded profiles in a custom test export", () => {
    const payload = buildExport(
      [{ ...customTest, evidenceProfiles: [customProfile] }],
      [],
      [],
    );
    const parsed = parseUserDataExport(JSON.stringify(payload));
    expect(parsed.customTests[0].evidenceProfiles[0].id).toBe(customProfile.id);
    expect(parsed.customTests[0].evidenceProfiles[0].isDefault).toBe(true);
  });

  it("merges new entries without losing existing data and reports conflicting IDs", () => {
    const current = buildExport(
      [{ ...customTest, evidenceProfiles: [customProfile] }],
      [],
      [customAssumption],
    );
    const incoming = buildExport(
      [],
      [{ ...customProfile, label: "Korrektur" }, scenarioProfile],
      [],
    );
    const merged = mergeUserData(current, incoming);
    expect(merged.data.customAssumptions).toEqual([customAssumption]);
    expect(merged.data.customTests[0].id).toBe(customTest.id);
    expect(merged.data.customEvidenceProfiles.map((p) => p.id)).toEqual([
      customProfile.id,
      scenarioProfile.id,
    ]);
    expect(merged.conflicts).toEqual([customProfile.id]);
    expect(current.customTests[0].evidenceProfiles[0].label).toBe(
      "Custom profile",
    );
  });

  it("parses a valid v6 export bundle", () => {
    const payload = buildExport(
      [customTest],
      [customProfile],
      [customAssumption],
      [customModifier],
    );
    const parsed = parseUserDataExport(JSON.stringify(payload));
    expect(parsed.customTests[0].id).toBe("custom-test");
    expect(parsed.customEvidenceProfiles[0].id).toBe("custom-profile");
    expect(parsed.customAssumptions[0].id).toBe("custom-assumption");
    expect(parsed.customModifiers[0].id).toBe("custom-modifier");
  });

  it("migrates a valid v5 export bundle to v7", () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 5,
        exportedAt: new Date().toISOString(),
        customTests: [customTest],
        customEvidenceProfiles: [
          {
            ...customProfile,
            calculationMode: undefined,
            lrDerivation: undefined,
          },
        ],
        customAssumptions: [customAssumption],
        customModifiers: [customModifier],
      }),
    );
    expect(parsed.schemaVersion).toBe(7);
    expect(parsed.customEvidenceProfiles[0].calculationMode).toBe("binary-lr");
    expect(parsed.customEvidenceProfiles[0].lrDerivation).toBe("derived");
  });

  it("migrates a valid v3 export bundle to v7", () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 3,
        exportedAt: new Date().toISOString(),
        customTests: [customTest],
        customEvidenceProfiles: [
          {
            ...customProfile,
            reviewStatus: undefined,
            evidenceQuality: undefined,
            dataCompleteness: undefined,
          },
        ],
        customAssumptions: [
          {
            ...customAssumption,
            reviewStatus: undefined,
            evidenceQuality: undefined,
            dataCompleteness: undefined,
          },
        ],
        customModifiers: [
          {
            ...customModifier,
            reviewStatus: undefined,
            evidenceQuality: undefined,
            dataCompleteness: undefined,
            quantificationStatus: undefined,
          },
        ],
      }),
    );
    expect(parsed.schemaVersion).toBe(7);
    expect(parsed.customTests[0].conditionId).toBe("condition");
    expect(parsed.customEvidenceProfiles[0].reviewStatus).toBe("draft");
    expect(parsed.customAssumptions[0].dataCompleteness).toBe("minimal");
    expect(parsed.customModifiers[0].quantificationStatus).toBe(
      "likelihood-ratio",
    );
  });

  it("migrates a valid v2 export bundle to v7", () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        customTests: [customTest],
        customEvidenceProfiles: [customProfile],
        customAssumptions: [customAssumption],
      }),
    );
    expect(parsed.schemaVersion).toBe(7);
    expect(parsed.customModifiers).toEqual([]);
    expect(parsed.customEvidenceProfiles[0].reviewStatus).toBe("draft");
  });

  it("migrates a simple v1 export bundle", () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        customTests: [
          {
            id: "legacy-test",
            name: "Legacy",
            category: "Legacy",
            condition: "Legacy condition",
            method: "Legacy method",
            cutoff: "Legacy cutoff",
            sensitivity: 0.9,
            specificity: 0.8,
            population: "Legacy population",
            rationale: "Legacy rationale",
            limitations: "Legacy limitations",
            lastReviewed: "2026-05-17",
            sources: customProfile.sources,
          },
        ],
        customAssumptions: [customAssumption],
        selectedAssumptionId: "pa-resistant-hypertension",
      }),
    );
    expect(parsed.schemaVersion).toBe(7);
    expect(parsed.customEvidenceProfiles[0].testId).toBe("legacy-test");
    expect(parsed.customAssumptions[0].conditionId).toBe("condition");
    expect(parsed.customAssumptions[0].evidenceLevel).toBe("direct");
    expect(parsed.customModifiers).toEqual([]);
  });

  it("rejects unsupported export versions", () => {
    expect(() =>
      parseUserDataExport(
        JSON.stringify({
          schemaVersion: 999,
          exportedAt: new Date().toISOString(),
          customTests: [],
          customEvidenceProfiles: [],
          customAssumptions: [],
        }),
      ),
    ).toThrow("Nicht unterstützte Export-Version.");
  });

  it("rejects oversized or excessively large import collections", () => {
    expect(() => parseUserDataExport("x".repeat(2 * 1024 * 1024 + 1))).toThrow(
      "größer als 2 MiB",
    );
    expect(() =>
      parseUserDataExport(
        JSON.stringify({
          schemaVersion: 6,
          exportedAt: new Date().toISOString(),
          customTests: Array.from({ length: 501 }, () => customTest),
          customEvidenceProfiles: [],
          customAssumptions: [],
          customModifiers: [],
        }),
      ),
    ).toThrow("mehr als 500 Einträge");
  });

  it("migrates legacy tests without accuracy data as non-computable workflows", () => {
    const parsed = parseUserDataExport(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        customTests: [
          {
            id: "legacy-workflow",
            name: "Legacy workflow",
            category: "Legacy",
            condition: "Condition",
            method: "Workflow",
            cutoff: "kein binärer Cut-off",
            population: "Population",
            rationale: "Rationale",
            limitations: "Limitations",
            lastReviewed: "2026-05-17",
            sources: customProfile.sources,
          },
        ],
        customAssumptions: [],
      }),
    );
    expect(parsed.customEvidenceProfiles[0].calculationMode).toBe(
      "workflow-only",
    );
    expect(parsed.customEvidenceProfiles[0].lrPositive).toBeUndefined();
    expect(parsed.customEvidenceProfiles[0].lrNegative).toBeUndefined();
  });
});
