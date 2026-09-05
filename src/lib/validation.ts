import {
  DATA_COMPLETENESS_LEVELS,
  EVIDENCE_QUALITIES,
  QUANTIFICATION_STATUSES,
  REVIEW_STATUSES,
  type ClinicalCondition,
  type DiagnosticChain,
  type ClinicalModifier,
  type DiagnosticTest,
  type EvidenceProfile,
  type EvidenceSource,
  type PhysicalCondition,
  type PhysicalFinding,
  type PhysicalSystem,
  type PretestAssumption,
  type ReviewMetadata,
} from "../types";

export interface ValidationIssue {
  field: string;
  message: string;
}

const profileKinds = new Set(["curated", "custom", "scenario"]);
const pretestEvidenceLevels = new Set(["direct", "fallback", "manual"]);
const sourceKinds = new Set([
  "Leitlinie",
  "Studie",
  "Review",
  "Lehrtext",
  "Lokale Annahme",
]);
const modifierDirections = new Set(["increases", "decreases", "uncertain"]);
const modifierCategories = new Set([
  "Symptom",
  "Klinisches Zeichen",
  "Anamnese",
  "Kontext",
  "Labor/Vorbefund",
]);
const reviewStatuses = new Set(REVIEW_STATUSES);
const evidenceQualities = new Set(EVIDENCE_QUALITIES);
const dataCompletenessLevels = new Set(DATA_COMPLETENESS_LEVELS);
const quantificationStatuses = new Set(QUANTIFICATION_STATUSES);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const preanalyticRisks = new Set(["low", "moderate", "high", "unclear"]);
const reviewPriorities = new Set(["low", "medium", "high"]);
const calculationModes = new Set(["binary-lr", "categorical", "workflow-only"]);
const lrDerivations = new Set(["reported", "derived"]);

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function probabilityIsValid(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function sourceIssues(
  source: EvidenceSource,
  prefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!source || typeof source !== "object")
    return [{ field: prefix, message: "Quelle ist kein Objekt." }];
  if (!hasText(source.title))
    issues.push({
      field: `${prefix}.title`,
      message: "Quelle benötigt einen Titel.",
    });
  if (!Number.isInteger(source.year) || source.year < 1900) {
    issues.push({
      field: `${prefix}.year`,
      message: "Quelle benötigt ein plausibles Jahr.",
    });
  }
  if (!hasText(source.url)) {
    issues.push({
      field: `${prefix}.url`,
      message: "Quelle benötigt eine URL.",
    });
  } else if (!/^https?:\/\//i.test(source.url)) {
    issues.push({
      field: `${prefix}.url`,
      message: "Quellen-URL muss mit http:// oder https:// beginnen.",
    });
  } else if (source.url.includes("pubmed.ncbi.nlm.nih.gov/?term=")) {
    issues.push({
      field: `${prefix}.url`,
      message: "Kuratierte Quellen dürfen keine PubMed-Suchlinks verwenden.",
    });
  }
  if (!sourceKinds.has(source.kind))
    issues.push({
      field: `${prefix}.kind`,
      message: "Quelle benötigt einen gültigen Typ.",
    });
  try {
    const url = new URL(source.url);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
  } catch {
    issues.push({
      field: `${prefix}.url`,
      message: "Quellen-URL ist ungültig.",
    });
  }
  if (!hasText(source.note))
    issues.push({
      field: `${prefix}.note`,
      message: "Quelle benötigt eine Kurznotiz.",
    });
  return issues;
}

function reviewIssues(
  item: ReviewMetadata,
  prefix = "review",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (item.sourceCheck != null) {
    const check = item.sourceCheck;
    if (
      !["verified", "restricted", "withdrawn"].includes(check.status) ||
      !isoDatePattern.test(check.checkedAt) ||
      !hasText(check.location) ||
      !hasText(check.note)
    ) {
      issues.push({
        field: `${prefix}.sourceCheck`,
        message:
          "Quellenprüfung benötigt Status, Datum, Fundstelle und Einordnung.",
      });
    }
  }
  if (!reviewStatuses.has(item.reviewStatus)) {
    issues.push({
      field: `${prefix}.reviewStatus`,
      message: "Reviewstatus ist ungültig.",
    });
  }
  if (!evidenceQualities.has(item.evidenceQuality)) {
    issues.push({
      field: `${prefix}.evidenceQuality`,
      message: "Evidenzqualität ist ungültig.",
    });
  }
  if (!dataCompletenessLevels.has(item.dataCompleteness)) {
    issues.push({
      field: `${prefix}.dataCompleteness`,
      message: "Datenvollständigkeit ist ungültig.",
    });
  }
  if (item.reviewStatus === "reviewed" && !hasText(item.reviewNote)) {
    issues.push({
      field: `${prefix}.reviewNote`,
      message: "Reviewed-Daten brauchen eine Reviewnotiz.",
    });
  }
  return issues;
}

function dateIssue(
  value: string,
  field = "lastReviewed",
): ValidationIssue | null {
  return isoDatePattern.test(value)
    ? null
    : { field, message: `${field} muss ein ISO-Datum YYYY-MM-DD sein.` };
}

function validateSources(
  sources: EvidenceSource[],
  prefix: string,
): ValidationIssue[] {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [
      {
        field: `${prefix}.sources`,
        message: "Mindestens eine Quelle ist erforderlich.",
      },
    ];
  }
  return sources.flatMap((source, index) =>
    sourceIssues(source, `${prefix}.sources.${index}`),
  );
}

export function validateEvidenceProfile(
  profile: EvidenceProfile,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  [
    "id",
    "testId",
    "label",
    "method",
    "cutoff",
    "population",
    "rationale",
    "limitations",
    "lastReviewed",
  ].forEach((field) => {
    if (!hasText(profile[field as keyof EvidenceProfile])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!profileKinds.has(profile.kind)) {
    issues.push({
      field: "kind",
      message: "Evidenzprofil benötigt einen gültigen Typ.",
    });
  }
  if (!calculationModes.has(profile.calculationMode)) {
    issues.push({
      field: "calculationMode",
      message: "Berechnungsmodus ist ungültig.",
    });
  }
  if (profile.sensitivity != null && !probabilityIsValid(profile.sensitivity)) {
    issues.push({
      field: "sensitivity",
      message: "Sensitivität muss zwischen 0 und 1 liegen.",
    });
  }
  if (profile.specificity != null && !probabilityIsValid(profile.specificity)) {
    issues.push({
      field: "specificity",
      message: "Spezifität muss zwischen 0 und 1 liegen.",
    });
  }
  if (
    profile.lrPositive != null &&
    (!Number.isFinite(profile.lrPositive) || profile.lrPositive <= 0)
  ) {
    issues.push({ field: "lrPositive", message: "LR+ muss positiv sein." });
  }
  if (
    profile.lrNegative != null &&
    (!Number.isFinite(profile.lrNegative) || profile.lrNegative <= 0)
  ) {
    issues.push({
      field: "lrNegative",
      message: "LR− muss endlich und größer als null sein.",
    });
  }
  if (
    profile.lrDerivation != null &&
    !lrDerivations.has(profile.lrDerivation)
  ) {
    issues.push({
      field: "lrDerivation",
      message: "LR-Herkunft ist ungültig.",
    });
  }
  if (profile.calculationMode === "binary-lr") {
    const hasRatios = profile.lrPositive != null && profile.lrNegative != null;
    const hasAccuracy =
      profile.sensitivity != null && profile.specificity != null;
    if (!hasRatios && !hasAccuracy) {
      issues.push({
        field: "calculationMode",
        message:
          "Binärprofile brauchen LR-Werte oder Sensitivität und Spezifität.",
      });
    }
    if (!profile.lrDerivation || !lrDerivations.has(profile.lrDerivation)) {
      issues.push({
        field: "lrDerivation",
        message: "Binärprofile müssen die LR-Herkunft angeben.",
      });
    }
    if (profile.lrPositive === 1 && profile.lrNegative === 1) {
      issues.push({
        field: "calculationMode",
        message: "LR 1/1 darf nicht als Platzhalter verwendet werden.",
      });
    }
    if (hasAccuracy) {
      const lrPositive =
        profile.specificity! < 1
          ? profile.sensitivity! / (1 - profile.specificity!)
          : Infinity;
      const lrNegative =
        profile.specificity! > 0
          ? (1 - profile.sensitivity!) / profile.specificity!
          : Infinity;
      if (
        !Number.isFinite(lrPositive) ||
        !Number.isFinite(lrNegative) ||
        lrPositive <= 0 ||
        lrNegative <= 0
      ) {
        issues.push({
          field: "sensitivity",
          message:
            "Sensitivität/Spezifität erzeugen keine endlichen positiven LR-Werte.",
        });
      }
    }
  } else {
    if (profile.lrPositive != null || profile.lrNegative != null) {
      issues.push({
        field: "calculationMode",
        message:
          "Kategorie-/Workflowprofile dürfen keine binären LR-Werte tragen.",
      });
    }
    if (!hasText(profile.nonComputableReason)) {
      issues.push({
        field: "nonComputableReason",
        message: "Nicht berechenbare Profile brauchen eine Begründung.",
      });
    }
  }
  const intervals: Array<
    [
      string,
      { low: number; high: number } | undefined,
      number | null | undefined,
    ]
  > = [
    ["sensitivityInterval", profile.sensitivityInterval, profile.sensitivity],
    ["specificityInterval", profile.specificityInterval, profile.specificity],
    ["lrPositiveInterval", profile.lrPositiveInterval, profile.lrPositive],
    ["lrNegativeInterval", profile.lrNegativeInterval, profile.lrNegative],
  ];
  intervals.forEach(([field, interval, value]) => {
    if (!interval) return;
    if (
      !Number.isFinite(interval.low) ||
      !Number.isFinite(interval.high) ||
      interval.low > interval.high ||
      interval.low < 0 ||
      (field.startsWith("lr") ? interval.low <= 0 : interval.high > 1)
    ) {
      issues.push({ field, message: "Intervall ist ungültig." });
    } else if (
      value != null &&
      (value < interval.low || value > interval.high)
    ) {
      issues.push({
        field,
        message: "Punktwert muss innerhalb des Intervalls liegen.",
      });
    }
  });
  if (profile.kind === "scenario" && !hasText(profile.deviationReason)) {
    issues.push({
      field: "deviationReason",
      message: "Szenarien brauchen eine Begründung der Abweichung.",
    });
  }
  if (
    profile.preanalyticRisk != null &&
    !preanalyticRisks.has(profile.preanalyticRisk)
  ) {
    issues.push({
      field: "preanalyticRisk",
      message: "Präanalytik-Risiko ist ungültig.",
    });
  }
  if (
    profile.reviewPriority != null &&
    !reviewPriorities.has(profile.reviewPriority)
  ) {
    issues.push({
      field: "reviewPriority",
      message: "Review-Priorität ist ungültig.",
    });
  }
  const profileDateIssue = dateIssue(profile.lastReviewed);
  if (profile.resultCategories != null) {
    if (
      !Array.isArray(profile.resultCategories) ||
      profile.resultCategories.length === 0 ||
      new Set(profile.resultCategories.map((c) => c.id)).size !==
        profile.resultCategories.length ||
      profile.resultCategories.some(
        (c) =>
          !hasText(c.id) || !hasText(c.label) || !hasText(c.interpretation),
      )
    ) {
      issues.push({
        field: "resultCategories",
        message:
          "Ergebniskategorien benötigen eindeutige IDs, Label und Interpretation.",
      });
    }
  }
  if (profileDateIssue) issues.push(profileDateIssue);
  issues.push(...reviewIssues(profile, "profile"));
  issues.push(...validateSources(profile.sources, "sources"));
  return issues;
}

export function validateDiagnosticTest(
  test: DiagnosticTest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  ["id", "name", "category", "conditionId", "condition", "description"].forEach(
    (field) => {
      if (!hasText(test[field as keyof DiagnosticTest])) {
        issues.push({ field, message: `${field} darf nicht leer sein.` });
      }
    },
  );

  if (
    !Array.isArray(test.evidenceProfiles) ||
    test.evidenceProfiles.length === 0
  ) {
    issues.push({
      field: "evidenceProfiles",
      message: "Jeder Test benötigt mindestens ein Evidenzprofil.",
    });
  } else {
    const defaultCount = test.evidenceProfiles.filter(
      (profile) => profile.isDefault,
    ).length;
    if (defaultCount !== 1) {
      issues.push({
        field: "evidenceProfiles",
        message:
          "Jeder kuratierte Test benötigt genau ein Default-Evidenzprofil.",
      });
    }
    test.evidenceProfiles.forEach((profile, index) => {
      issues.push(
        ...validateEvidenceProfile(profile).map((issue) => ({
          ...issue,
          field: `evidenceProfiles.${index}.${issue.field}`,
        })),
      );
    });
  }

  return issues;
}

export function validatePretestAssumption(
  assumption: PretestAssumption,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (
    assumption.origin != null &&
    ![
      "observed",
      "transferred-cohort",
      "guideline-estimate",
      "expert-estimate",
      "unknown",
    ].includes(assumption.origin)
  ) {
    issues.push({
      field: "origin",
      message: "Herkunft der Prätestannahme ist ungültig.",
    });
  }
  [
    "id",
    "condition",
    "conditionId",
    "setting",
    "settingId",
    "evidenceLevel",
    "population",
    "rationale",
    "limitations",
    "lastReviewed",
  ].forEach((field) => {
    if (!hasText(assumption[field as keyof PretestAssumption])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });

  if (!profileKinds.has(assumption.kind)) {
    issues.push({
      field: "kind",
      message: "Prätest-Annahme benötigt einen gültigen Typ.",
    });
  }
  if (
    !assumption.evidenceLevel ||
    !pretestEvidenceLevels.has(assumption.evidenceLevel)
  ) {
    issues.push({
      field: "evidenceLevel",
      message: "Prätest-Annahme benötigt ein gültiges Evidenzlevel.",
    });
  }
  if (
    assumption.probability !== null &&
    !probabilityIsValid(assumption.probability)
  ) {
    issues.push({
      field: "probability",
      message: "Prätestwahrscheinlichkeit muss zwischen 0 und 1 liegen.",
    });
  }
  if (assumption.rangeLow != null && !probabilityIsValid(assumption.rangeLow)) {
    issues.push({
      field: "rangeLow",
      message: "Untere Spanne muss zwischen 0 und 1 liegen.",
    });
  }
  if (
    assumption.rangeHigh != null &&
    !probabilityIsValid(assumption.rangeHigh)
  ) {
    issues.push({
      field: "rangeHigh",
      message: "Obere Spanne muss zwischen 0 und 1 liegen.",
    });
  }
  if (
    assumption.rangeLow != null &&
    assumption.rangeHigh != null &&
    assumption.rangeLow > assumption.rangeHigh
  ) {
    issues.push({
      field: "range",
      message: "Untere Spanne darf nicht über oberer Spanne liegen.",
    });
  }
  if (assumption.kind === "scenario" && !hasText(assumption.deviationReason)) {
    issues.push({
      field: "deviationReason",
      message: "Szenarien brauchen eine Begründung der Abweichung.",
    });
  }
  const assumptionDateIssue = dateIssue(assumption.lastReviewed);
  if (assumptionDateIssue) issues.push(assumptionDateIssue);
  issues.push(...reviewIssues(assumption, "assumption"));
  issues.push(...validateSources(assumption.sources, "sources"));

  return issues;
}

export function validateClinicalModifier(
  modifier: ClinicalModifier,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  [
    "id",
    "conditionId",
    "label",
    "category",
    "direction",
    "rationale",
    "limitations",
    "lastReviewed",
  ].forEach((field) => {
    if (!hasText(modifier[field as keyof ClinicalModifier])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!modifierCategories.has(modifier.category)) {
    issues.push({
      field: "category",
      message: "Modifikator benötigt eine gültige Kategorie.",
    });
  }
  if (!modifierDirections.has(modifier.direction)) {
    issues.push({
      field: "direction",
      message: "Modifikator benötigt eine gültige Richtung.",
    });
  }
  if (!profileKinds.has(modifier.kind)) {
    issues.push({
      field: "kind",
      message: "Modifikator benötigt einen gültigen Typ.",
    });
  }
  if (!quantificationStatuses.has(modifier.quantificationStatus)) {
    issues.push({
      field: "quantificationStatus",
      message: "Modifikator benötigt einen gültigen Quantifizierungsstatus.",
    });
  }
  if (
    modifier.probabilityFactor != null &&
    (!Number.isFinite(modifier.probabilityFactor) ||
      modifier.probabilityFactor <= 0)
  ) {
    issues.push({
      field: "probabilityFactor",
      message: "Wahrscheinlichkeitsfaktor muss positiv sein.",
    });
  }
  if (
    modifier.likelihoodRatio != null &&
    (!Number.isFinite(modifier.likelihoodRatio) ||
      modifier.likelihoodRatio <= 0)
  ) {
    issues.push({
      field: "likelihoodRatio",
      message: "Modifikator-LR muss positiv sein.",
    });
  }
  if (modifier.kind === "scenario" && !hasText(modifier.deviationReason)) {
    issues.push({
      field: "deviationReason",
      message: "Szenarien brauchen eine Begründung der Abweichung.",
    });
  }
  if (
    modifier.quantificationStatus === "likelihood-ratio" &&
    modifier.likelihoodRatio == null
  ) {
    issues.push({
      field: "likelihoodRatio",
      message: "LR-basierte Modifikatoren brauchen einen Modifikator-LR.",
    });
  }
  if (
    modifier.quantificationStatus === "probability-factor" &&
    modifier.probabilityFactor == null
  ) {
    issues.push({
      field: "probabilityFactor",
      message:
        "Faktorbasierte Modifikatoren brauchen einen Wahrscheinlichkeitsfaktor.",
    });
  }
  if (
    modifier.quantificationStatus === "qualitative" &&
    (modifier.likelihoodRatio != null || modifier.probabilityFactor != null)
  ) {
    issues.push({
      field: "quantificationStatus",
      message: "Qualitative Modifikatoren dürfen keinen Rechenfaktor tragen.",
    });
  }
  if (
    modifier.mapsToPretestAssumptionId != null &&
    !hasText(modifier.overlapWarning)
  ) {
    issues.push({
      field: "overlapWarning",
      message:
        "Modifikatoren mit Mapping zu Prätest-Annahmen brauchen eine Doppelzählungswarnung.",
    });
  }
  const modifierDateIssue = dateIssue(modifier.lastReviewed);
  if (modifierDateIssue) issues.push(modifierDateIssue);
  issues.push(...reviewIssues(modifier, "modifier"));
  issues.push(...validateSources(modifier.sources, "sources"));
  return issues;
}

export function validateKnownConditionIds(
  conditions: ClinicalCondition[],
  tests: DiagnosticTest[],
  assumptions: PretestAssumption[],
  modifiers: ClinicalModifier[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set(conditions.map((condition) => condition.id));
  tests.forEach((test) => {
    if (!known.has(test.conditionId)) {
      issues.push({
        field: `test.${test.id}.conditionId`,
        message: "Test verweist auf unbekannte Erkrankung.",
      });
    }
  });
  assumptions.forEach((assumption) => {
    if (assumption.conditionId && !known.has(assumption.conditionId)) {
      issues.push({
        field: `assumption.${assumption.id}.conditionId`,
        message: "Prätest-Annahme verweist auf unbekannte Erkrankung.",
      });
    }
  });
  modifiers.forEach((modifier) => {
    if (!known.has(modifier.conditionId)) {
      issues.push({
        field: `modifier.${modifier.id}.conditionId`,
        message: "Modifikator verweist auf unbekannte Erkrankung.",
      });
    }
  });
  return issues;
}

export function validateDiagnosticChain(
  chain: DiagnosticChain,
  conditions: ClinicalCondition[],
  tests: DiagnosticTest[],
  profiles: EvidenceProfile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownConditions = new Set(conditions.map((condition) => condition.id));
  [
    "id",
    "conditionId",
    "label",
    "description",
    "rationale",
    "limitations",
    "lastReviewed",
  ].forEach((field) => {
    if (!hasText(chain[field as keyof DiagnosticChain])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!knownConditions.has(chain.conditionId)) {
    issues.push({
      field: "conditionId",
      message: "Diagnostikkette verweist auf unbekannte Erkrankung.",
    });
  }
  if (!Array.isArray(chain.stages) || chain.stages.length < 2) {
    issues.push({
      field: "stages",
      message: "Diagnostikketten brauchen mindestens zwei Stufen.",
    });
  } else {
    chain.stages.forEach((stage, index) => {
      const test = tests.find((candidate) => candidate.id === stage.testId);
      const profile = profiles.find(
        (candidate) => candidate.id === stage.evidenceProfileId,
      );
      if (!test)
        issues.push({
          field: `stages.${index}.testId`,
          message: "Kettenstufe verweist auf unbekannten Test.",
        });
      if (!profile)
        issues.push({
          field: `stages.${index}.evidenceProfileId`,
          message: "Kettenstufe verweist auf unbekanntes Evidenzprofil.",
        });
      if (test && test.conditionId !== chain.conditionId) {
        issues.push({
          field: `stages.${index}.testId`,
          message: "Kettenstufe nutzt Test einer anderen Erkrankung.",
        });
      }
      if (profile && test && profile.testId !== test.id) {
        issues.push({
          field: `stages.${index}.evidenceProfileId`,
          message: "Evidenzprofil passt nicht zum Test der Kettenstufe.",
        });
      }
      if (
        chain.calculationPolicy === "conditional-lr" &&
        profile &&
        profile.calculationMode !== "binary-lr"
      ) {
        issues.push({
          field: `stages.${index}.evidenceProfileId`,
          message: "Kettenstufen müssen binär berechenbar sein.",
        });
      }
      if (stage.continueOn != null) {
        if (
          stage.continueOn.length === 0 ||
          stage.continueOn.some(
            (result) => result !== "positive" && result !== "negative",
          )
        ) {
          issues.push({
            field: `stages.${index}.continueOn`,
            message: "Fortsetzungspfade sind ungültig.",
          });
        }
      }
    });
  }
  const chainDateIssue = dateIssue(chain.lastReviewed);
  if (chainDateIssue) issues.push(chainDateIssue);
  issues.push(...reviewIssues(chain, "chain"));
  issues.push(...validateSources(chain.sources, "sources"));
  return issues;
}

function lrIssues(
  lr: PhysicalFinding["lrPositive"],
  prefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (typeof lr !== "object" || lr == null) {
    return [{ field: prefix, message: "LR-Struktur fehlt." }];
  }
  if (lr.notReported) {
    if (lr.value != null)
      issues.push({
        field: `${prefix}.value`,
        message: "Nicht berichtete LR darf keinen Wert tragen.",
      });
    return issues;
  }
  if (
    typeof lr.value !== "number" ||
    !Number.isFinite(lr.value) ||
    lr.value <= 0
  ) {
    issues.push({
      field: `${prefix}.value`,
      message:
        "LR-Wert muss positiv sein oder als nicht berichtet markiert werden.",
    });
  }
  if ((lr.ciLow == null) !== (lr.ciHigh == null)) {
    issues.push({
      field: prefix,
      message: "Konfidenzintervall braucht unteren und oberen Wert.",
    });
  }
  if (
    lr.ciLow != null &&
    lr.ciHigh != null &&
    (lr.ciLow < 0 || lr.ciHigh < lr.ciLow)
  ) {
    issues.push({
      field: prefix,
      message: "Konfidenzintervall ist unplausibel.",
    });
  }
  return issues;
}

export function validatePhysicalData(
  systems: PhysicalSystem[],
  conditions: PhysicalCondition[],
  findings: PhysicalFinding[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const systemIds = new Set(systems.map((system) => system.id));
  const conditionIds = new Set(conditions.map((condition) => condition.id));
  const seenFindings = new Set<string>();
  systems.forEach((system, index) => {
    ["id", "label"].forEach((field) => {
      if (!hasText(system[field as keyof PhysicalSystem]))
        issues.push({
          field: `physicalSystems.${index}.${field}`,
          message: "Feld fehlt.",
        });
    });
    if (!Number.isFinite(system.sortOrder))
      issues.push({
        field: `physicalSystems.${index}.sortOrder`,
        message: "Sortierung fehlt.",
      });
  });
  conditions.forEach((condition, index) => {
    ["id", "systemId", "label", "sourceBox"].forEach((field) => {
      if (!hasText(condition[field as keyof PhysicalCondition]))
        issues.push({
          field: `physicalConditions.${index}.${field}`,
          message: "Feld fehlt.",
        });
    });
    if (!systemIds.has(condition.systemId))
      issues.push({
        field: `physicalConditions.${index}.systemId`,
        message: "Unbekanntes Körpersystem.",
      });
  });
  findings.forEach((finding, index) => {
    const prefix = `physicalFindings.${index}`;
    [
      "id",
      "systemId",
      "conditionId",
      "findingLabel",
      "positiveCriterion",
      "negativeCriterion",
      "limitations",
      "reviewStatus",
    ].forEach((field) => {
      if (!hasText(finding[field as keyof PhysicalFinding]))
        issues.push({ field: `${prefix}.${field}`, message: "Feld fehlt." });
    });
    if (!systemIds.has(finding.systemId))
      issues.push({
        field: `${prefix}.systemId`,
        message: "Unbekanntes Körpersystem.",
      });
    if (!conditionIds.has(finding.conditionId))
      issues.push({
        field: `${prefix}.conditionId`,
        message: "Unbekanntes Krankheitsbild.",
      });
    const duplicateKey = `${finding.conditionId}:${finding.id}:${finding.source?.sourceBox ?? ""}`;
    if (seenFindings.has(duplicateKey))
      issues.push({
        field: `${prefix}.id`,
        message: "Doppelter Untersuchungsbefund.",
      });
    seenFindings.add(duplicateKey);
    if (!reviewStatuses.has(finding.reviewStatus))
      issues.push({
        field: `${prefix}.reviewStatus`,
        message: "Reviewstatus ist ungültig.",
      });
    if (
      !Number.isFinite(finding.pretestRange?.low) ||
      !Number.isFinite(finding.pretestRange?.high) ||
      finding.pretestRange.low < 0 ||
      finding.pretestRange.high > 100 ||
      finding.pretestRange.low > finding.pretestRange.high
    ) {
      issues.push({
        field: `${prefix}.pretestRange`,
        message: "Prätestbereich ist unplausibel.",
      });
    }
    ["title", "sourceBox", "note"].forEach((field) => {
      if (!hasText(finding.source?.[field as keyof PhysicalFinding["source"]]))
        issues.push({
          field: `${prefix}.source.${field}`,
          message: "Quelle ist unvollständig.",
        });
    });
    if (!Number.isFinite(finding.source?.sourcePage))
      issues.push({
        field: `${prefix}.source.sourcePage`,
        message: "Quellseite fehlt.",
      });
    issues.push(...lrIssues(finding.lrPositive, `${prefix}.lrPositive`));
    issues.push(...lrIssues(finding.lrNegative, `${prefix}.lrNegative`));
    if (finding.lrPositive?.notReported && finding.lrNegative?.notReported) {
      issues.push({
        field: `${prefix}.lr`,
        message: "Mindestens ein LR-Wert muss berichtet sein.",
      });
    }
  });
  return issues;
}
