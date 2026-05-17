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
  type PretestAssumption,
  type ReviewMetadata
} from '../types';

export interface ValidationIssue {
  field: string;
  message: string;
}

const profileKinds = new Set(['curated', 'custom', 'scenario']);
const pretestEvidenceLevels = new Set(['direct', 'fallback', 'manual']);
const sourceKinds = new Set(['Leitlinie', 'Studie', 'Review', 'Lehrtext', 'Lokale Annahme']);
const modifierDirections = new Set(['increases', 'decreases', 'uncertain']);
const modifierCategories = new Set(['Symptom', 'Klinisches Zeichen', 'Anamnese', 'Kontext', 'Labor/Vorbefund']);
const reviewStatuses = new Set(REVIEW_STATUSES);
const evidenceQualities = new Set(EVIDENCE_QUALITIES);
const dataCompletenessLevels = new Set(DATA_COMPLETENESS_LEVELS);
const quantificationStatuses = new Set(QUANTIFICATION_STATUSES);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const preanalyticRisks = new Set(['low', 'moderate', 'high', 'unclear']);
const reviewPriorities = new Set(['low', 'medium', 'high']);

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function probabilityIsValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function sourceIssues(source: EvidenceSource, prefix: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!hasText(source.title)) issues.push({ field: `${prefix}.title`, message: 'Quelle benötigt einen Titel.' });
  if (!Number.isInteger(source.year) || source.year < 1900) {
    issues.push({ field: `${prefix}.year`, message: 'Quelle benötigt ein plausibles Jahr.' });
  }
  if (!hasText(source.url)) {
    issues.push({ field: `${prefix}.url`, message: 'Quelle benötigt eine URL.' });
  } else if (!/^https?:\/\//i.test(source.url)) {
    issues.push({ field: `${prefix}.url`, message: 'Quellen-URL muss mit http:// oder https:// beginnen.' });
  } else if (source.url.includes('pubmed.ncbi.nlm.nih.gov/?term=')) {
    issues.push({ field: `${prefix}.url`, message: 'Kuratierte Quellen dürfen keine PubMed-Suchlinks verwenden.' });
  }
  if (!sourceKinds.has(source.kind)) issues.push({ field: `${prefix}.kind`, message: 'Quelle benötigt einen gültigen Typ.' });
  if (!hasText(source.note)) issues.push({ field: `${prefix}.note`, message: 'Quelle benötigt eine Kurznotiz.' });
  return issues;
}

function reviewIssues(item: ReviewMetadata, prefix = 'review'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!reviewStatuses.has(item.reviewStatus)) {
    issues.push({ field: `${prefix}.reviewStatus`, message: 'Reviewstatus ist ungültig.' });
  }
  if (!evidenceQualities.has(item.evidenceQuality)) {
    issues.push({ field: `${prefix}.evidenceQuality`, message: 'Evidenzqualität ist ungültig.' });
  }
  if (!dataCompletenessLevels.has(item.dataCompleteness)) {
    issues.push({ field: `${prefix}.dataCompleteness`, message: 'Datenvollständigkeit ist ungültig.' });
  }
  if (item.reviewStatus === 'reviewed' && !hasText(item.reviewNote)) {
    issues.push({ field: `${prefix}.reviewNote`, message: 'Reviewed-Daten brauchen eine Reviewnotiz.' });
  }
  return issues;
}

function dateIssue(value: string, field = 'lastReviewed'): ValidationIssue | null {
  return isoDatePattern.test(value) ? null : { field, message: `${field} muss ein ISO-Datum YYYY-MM-DD sein.` };
}

function validateSources(sources: EvidenceSource[], prefix: string): ValidationIssue[] {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [{ field: `${prefix}.sources`, message: 'Mindestens eine Quelle ist erforderlich.' }];
  }
  return sources.flatMap((source, index) => sourceIssues(source, `${prefix}.sources.${index}`));
}

export function validateEvidenceProfile(profile: EvidenceProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  ['id', 'testId', 'label', 'method', 'cutoff', 'population', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(profile[field as keyof EvidenceProfile])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!profileKinds.has(profile.kind)) {
    issues.push({ field: 'kind', message: 'Evidenzprofil benötigt einen gültigen Typ.' });
  }
  if (profile.sensitivity != null && !probabilityIsValid(profile.sensitivity)) {
    issues.push({ field: 'sensitivity', message: 'Sensitivität muss zwischen 0 und 1 liegen.' });
  }
  if (profile.specificity != null && !probabilityIsValid(profile.specificity)) {
    issues.push({ field: 'specificity', message: 'Spezifität muss zwischen 0 und 1 liegen.' });
  }
  if (profile.lrPositive != null && (!Number.isFinite(profile.lrPositive) || profile.lrPositive <= 0)) {
    issues.push({ field: 'lrPositive', message: 'LR+ muss positiv sein.' });
  }
  if (profile.lrNegative != null && (!Number.isFinite(profile.lrNegative) || profile.lrNegative < 0)) {
    issues.push({ field: 'lrNegative', message: 'LR− darf nicht negativ sein.' });
  }
  if (profile.kind === 'scenario' && !hasText(profile.deviationReason)) {
    issues.push({ field: 'deviationReason', message: 'Szenarien brauchen eine Begründung der Abweichung.' });
  }
  if (profile.preanalyticRisk != null && !preanalyticRisks.has(profile.preanalyticRisk)) {
    issues.push({ field: 'preanalyticRisk', message: 'Präanalytik-Risiko ist ungültig.' });
  }
  if (profile.reviewPriority != null && !reviewPriorities.has(profile.reviewPriority)) {
    issues.push({ field: 'reviewPriority', message: 'Review-Priorität ist ungültig.' });
  }
  const profileDateIssue = dateIssue(profile.lastReviewed);
  if (profileDateIssue) issues.push(profileDateIssue);
  issues.push(...reviewIssues(profile, 'profile'));
  issues.push(...validateSources(profile.sources, 'sources'));
  return issues;
}

export function validateDiagnosticTest(test: DiagnosticTest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  ['id', 'name', 'category', 'conditionId', 'condition', 'description'].forEach(field => {
    if (!hasText(test[field as keyof DiagnosticTest])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });

  if (!Array.isArray(test.evidenceProfiles) || test.evidenceProfiles.length === 0) {
    issues.push({ field: 'evidenceProfiles', message: 'Jeder Test benötigt mindestens ein Evidenzprofil.' });
  } else {
    const defaultCount = test.evidenceProfiles.filter(profile => profile.isDefault).length;
    if (defaultCount !== 1) {
      issues.push({ field: 'evidenceProfiles', message: 'Jeder kuratierte Test benötigt genau ein Default-Evidenzprofil.' });
    }
    test.evidenceProfiles.forEach((profile, index) => {
      issues.push(...validateEvidenceProfile(profile).map(issue => ({ ...issue, field: `evidenceProfiles.${index}.${issue.field}` })));
    });
  }

  return issues;
}

export function validatePretestAssumption(assumption: PretestAssumption): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  ['id', 'condition', 'conditionId', 'setting', 'settingId', 'evidenceLevel', 'population', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(assumption[field as keyof PretestAssumption])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });

  if (!profileKinds.has(assumption.kind)) {
    issues.push({ field: 'kind', message: 'Prätest-Annahme benötigt einen gültigen Typ.' });
  }
  if (!assumption.evidenceLevel || !pretestEvidenceLevels.has(assumption.evidenceLevel)) {
    issues.push({ field: 'evidenceLevel', message: 'Prätest-Annahme benötigt ein gültiges Evidenzlevel.' });
  }
  if (!probabilityIsValid(assumption.probability)) {
    issues.push({ field: 'probability', message: 'Prätestwahrscheinlichkeit muss zwischen 0 und 1 liegen.' });
  }
  if (assumption.rangeLow != null && !probabilityIsValid(assumption.rangeLow)) {
    issues.push({ field: 'rangeLow', message: 'Untere Spanne muss zwischen 0 und 1 liegen.' });
  }
  if (assumption.rangeHigh != null && !probabilityIsValid(assumption.rangeHigh)) {
    issues.push({ field: 'rangeHigh', message: 'Obere Spanne muss zwischen 0 und 1 liegen.' });
  }
  if (
    assumption.rangeLow != null &&
    assumption.rangeHigh != null &&
    assumption.rangeLow > assumption.rangeHigh
  ) {
    issues.push({ field: 'range', message: 'Untere Spanne darf nicht über oberer Spanne liegen.' });
  }
  if (assumption.kind === 'scenario' && !hasText(assumption.deviationReason)) {
    issues.push({ field: 'deviationReason', message: 'Szenarien brauchen eine Begründung der Abweichung.' });
  }
  const assumptionDateIssue = dateIssue(assumption.lastReviewed);
  if (assumptionDateIssue) issues.push(assumptionDateIssue);
  issues.push(...reviewIssues(assumption, 'assumption'));
  issues.push(...validateSources(assumption.sources, 'sources'));

  return issues;
}

export function validateClinicalModifier(modifier: ClinicalModifier): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  ['id', 'conditionId', 'label', 'category', 'direction', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(modifier[field as keyof ClinicalModifier])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!modifierCategories.has(modifier.category)) {
    issues.push({ field: 'category', message: 'Modifikator benötigt eine gültige Kategorie.' });
  }
  if (!modifierDirections.has(modifier.direction)) {
    issues.push({ field: 'direction', message: 'Modifikator benötigt eine gültige Richtung.' });
  }
  if (!profileKinds.has(modifier.kind)) {
    issues.push({ field: 'kind', message: 'Modifikator benötigt einen gültigen Typ.' });
  }
  if (!quantificationStatuses.has(modifier.quantificationStatus)) {
    issues.push({ field: 'quantificationStatus', message: 'Modifikator benötigt einen gültigen Quantifizierungsstatus.' });
  }
  if (modifier.probabilityFactor != null && (!Number.isFinite(modifier.probabilityFactor) || modifier.probabilityFactor <= 0)) {
    issues.push({ field: 'probabilityFactor', message: 'Wahrscheinlichkeitsfaktor muss positiv sein.' });
  }
  if (modifier.likelihoodRatio != null && (!Number.isFinite(modifier.likelihoodRatio) || modifier.likelihoodRatio <= 0)) {
    issues.push({ field: 'likelihoodRatio', message: 'Modifikator-LR muss positiv sein.' });
  }
  if (modifier.kind === 'scenario' && !hasText(modifier.deviationReason)) {
    issues.push({ field: 'deviationReason', message: 'Szenarien brauchen eine Begründung der Abweichung.' });
  }
  if (modifier.quantificationStatus === 'likelihood-ratio' && modifier.likelihoodRatio == null) {
    issues.push({ field: 'likelihoodRatio', message: 'LR-basierte Modifikatoren brauchen einen Modifikator-LR.' });
  }
  if (modifier.quantificationStatus === 'probability-factor' && modifier.probabilityFactor == null) {
    issues.push({ field: 'probabilityFactor', message: 'Faktorbasierte Modifikatoren brauchen einen Wahrscheinlichkeitsfaktor.' });
  }
  if (modifier.quantificationStatus === 'qualitative' && (modifier.likelihoodRatio != null || modifier.probabilityFactor != null)) {
    issues.push({ field: 'quantificationStatus', message: 'Qualitative Modifikatoren dürfen keinen Rechenfaktor tragen.' });
  }
  if (modifier.mapsToPretestAssumptionId != null && !hasText(modifier.overlapWarning)) {
    issues.push({ field: 'overlapWarning', message: 'Modifikatoren mit Mapping zu Prätest-Annahmen brauchen eine Doppelzählungswarnung.' });
  }
  const modifierDateIssue = dateIssue(modifier.lastReviewed);
  if (modifierDateIssue) issues.push(modifierDateIssue);
  issues.push(...reviewIssues(modifier, 'modifier'));
  issues.push(...validateSources(modifier.sources, 'sources'));
  return issues;
}

export function validateKnownConditionIds(
  conditions: ClinicalCondition[],
  tests: DiagnosticTest[],
  assumptions: PretestAssumption[],
  modifiers: ClinicalModifier[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set(conditions.map(condition => condition.id));
  tests.forEach(test => {
    if (!known.has(test.conditionId)) {
      issues.push({ field: `test.${test.id}.conditionId`, message: 'Test verweist auf unbekannte Erkrankung.' });
    }
  });
  assumptions.forEach(assumption => {
    if (assumption.conditionId && !known.has(assumption.conditionId)) {
      issues.push({ field: `assumption.${assumption.id}.conditionId`, message: 'Prätest-Annahme verweist auf unbekannte Erkrankung.' });
    }
  });
  modifiers.forEach(modifier => {
    if (!known.has(modifier.conditionId)) {
      issues.push({ field: `modifier.${modifier.id}.conditionId`, message: 'Modifikator verweist auf unbekannte Erkrankung.' });
    }
  });
  return issues;
}

export function validateDiagnosticChain(
  chain: DiagnosticChain,
  conditions: ClinicalCondition[],
  tests: DiagnosticTest[],
  profiles: EvidenceProfile[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownConditions = new Set(conditions.map(condition => condition.id));
  ['id', 'conditionId', 'label', 'description', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(chain[field as keyof DiagnosticChain])) {
      issues.push({ field, message: `${field} darf nicht leer sein.` });
    }
  });
  if (!knownConditions.has(chain.conditionId)) {
    issues.push({ field: 'conditionId', message: 'Diagnostikkette verweist auf unbekannte Erkrankung.' });
  }
  if (!Array.isArray(chain.stages) || chain.stages.length < 2) {
    issues.push({ field: 'stages', message: 'Diagnostikketten brauchen mindestens zwei Stufen.' });
  } else {
    chain.stages.forEach((stage, index) => {
      const test = tests.find(candidate => candidate.id === stage.testId);
      const profile = profiles.find(candidate => candidate.id === stage.evidenceProfileId);
      if (!test) issues.push({ field: `stages.${index}.testId`, message: 'Kettenstufe verweist auf unbekannten Test.' });
      if (!profile) issues.push({ field: `stages.${index}.evidenceProfileId`, message: 'Kettenstufe verweist auf unbekanntes Evidenzprofil.' });
      if (test && test.conditionId !== chain.conditionId) {
        issues.push({ field: `stages.${index}.testId`, message: 'Kettenstufe nutzt Test einer anderen Erkrankung.' });
      }
      if (profile && test && profile.testId !== test.id) {
        issues.push({ field: `stages.${index}.evidenceProfileId`, message: 'Evidenzprofil passt nicht zum Test der Kettenstufe.' });
      }
    });
  }
  const chainDateIssue = dateIssue(chain.lastReviewed);
  if (chainDateIssue) issues.push(chainDateIssue);
  issues.push(...reviewIssues(chain, 'chain'));
  issues.push(...validateSources(chain.sources, 'sources'));
  return issues;
}
