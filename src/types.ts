export type SourceKind = 'Leitlinie' | 'Studie' | 'Review' | 'Lehrtext' | 'Lokale Annahme';
export type EvidenceProfileKind = 'curated' | 'custom' | 'scenario';
export type PretestEvidenceLevel = 'direct' | 'fallback' | 'manual';
export type ClinicalModifierDirection = 'increases' | 'decreases' | 'uncertain';
export type ModifierCategory = 'Symptom' | 'Klinisches Zeichen' | 'Anamnese' | 'Kontext' | 'Labor/Vorbefund';
export type ReviewStatus = 'draft' | 'reviewed' | 'needs-review';
export type EvidenceQuality = 'high' | 'moderate' | 'low' | 'expert-opinion' | 'unclear';
export type DataCompleteness = 'complete' | 'partial' | 'minimal';
export type QuantificationStatus = 'qualitative' | 'probability-factor' | 'likelihood-ratio';
export type CalculationMode = 'binary-lr' | 'categorical' | 'workflow-only';
export type LikelihoodRatioDerivation = 'reported' | 'derived';
export type CalculatorMode = 'diagnostic-tests' | 'physical-exam';
export type ClinicalContext = 'screening' | 'suspicion' | 'incidental' | 'follow-up';
export type FindingCategory = 'normal' | 'abnormal' | 'borderline' | 'discordant' | 'uninterpretable';
export type EstimateOrigin = 'observed' | 'transferred-cohort' | 'guideline-estimate' | 'expert-estimate' | 'unknown';

export interface SourceCheck {
  status: 'verified' | 'restricted' | 'withdrawn';
  checkedAt: string;
  location: string;
  note: string;
}

export const REVIEW_STATUSES: ReviewStatus[] = ['draft', 'reviewed', 'needs-review'];
export const EVIDENCE_QUALITIES: EvidenceQuality[] = ['high', 'moderate', 'low', 'expert-opinion', 'unclear'];
export const DATA_COMPLETENESS_LEVELS: DataCompleteness[] = ['complete', 'partial', 'minimal'];
export const QUANTIFICATION_STATUSES: QuantificationStatus[] = ['qualitative', 'probability-factor', 'likelihood-ratio'];

export interface ReviewMetadata {
  reviewStatus: ReviewStatus;
  evidenceQuality: EvidenceQuality;
  dataCompleteness: DataCompleteness;
  reviewNote?: string;
  sourceCheck?: SourceCheck;
}

export interface ClinicalSetting {
  id: string;
  label: string;
}

export interface ClinicalCondition {
  id: string;
  label: string;
  category?: string;
  synonyms?: string[];
  description?: string;
}

export interface ConditionGuidance extends ReviewMetadata {
  conditionId: string;
  summary: string;
  whenToTest: string[];
  recommendedTests: string[];
  pitfalls: string[];
  settingNotes: string[];
  links: EvidenceSource[];
  lastReviewed: string;
}

export interface EvidenceSource {
  title: string;
  year: number;
  url: string;
  kind: SourceKind;
  note: string;
}

export interface EvidenceProfile extends ReviewMetadata {
  id: string;
  testId: string;
  label: string;
  kind: EvidenceProfileKind;
  purpose?: string;
  specimen?: string;
  intendedUse?: string;
  preanalyticRisk?: 'low' | 'moderate' | 'high' | 'unclear';
  applicabilityWarning?: string;
  reviewPriority?: 'low' | 'medium' | 'high';
  calculationMode: CalculationMode;
  lrDerivation?: LikelihoodRatioDerivation;
  nonComputableReason?: string;
  method: string;
  cutoff: string;
  procedure?: string;
  sensitivity: number | null;
  specificity: number | null;
  sensitivityInterval?: NumericInterval;
  specificityInterval?: NumericInterval;
  lrPositive?: number;
  lrNegative?: number;
  lrPositiveInterval?: NumericInterval;
  lrNegativeInterval?: NumericInterval;
  population: string;
  rationale: string;
  limitations: string;
  preanalytics?: string[];
  medicationInterferences?: string[];
  falsePositiveReasons?: string[];
  falseNegativeReasons?: string[];
  interpretationCautions?: string[];
  implementationNotes?: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  isDefault?: boolean;
  deviationFromProfileId?: string;
  deviationReason?: string;
  resultCategories?: Array<{ id: string; label: string; interpretation: string }>;
}

export interface NumericInterval {
  low: number;
  high: number;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  category: string;
  conditionId: string;
  condition: string;
  description: string;
  evidenceProfiles: EvidenceProfile[];
  custom?: boolean;
}

export interface PretestAssumption extends ReviewMetadata {
  id: string;
  condition: string;
  conditionId?: string;
  setting: string;
  settingId?: string;
  evidenceLevel?: PretestEvidenceLevel;
  population: string;
  probability: number | null;
  origin?: EstimateOrigin;
  rangeLow?: number;
  rangeHigh?: number;
  rationale: string;
  limitations: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  kind: EvidenceProfileKind;
  custom?: boolean;
  deviationReason?: string;
}

export type PretestEvidenceGapStatus =
  | 'no-setting-specific-estimate-found'
  | 'score-or-risk-stratum-required'
  | 'not-clinically-meaningful-as-setting';

export interface PretestEvidenceGap extends ReviewMetadata {
  id: string;
  conditionId: string;
  settingIds: string[];
  status: PretestEvidenceGapStatus;
  summary: string;
  searchedQuestion: string;
  searchedSources: EvidenceSource[];
  recommendedNextStep: string;
  lastReviewed: string;
}

export interface ClinicalModifier extends ReviewMetadata {
  role?: 'disease-risk' | 'test-validity' | 'both';
  id: string;
  conditionId: string;
  label: string;
  category: ModifierCategory;
  direction: ClinicalModifierDirection;
  probabilityFactor?: number;
  likelihoodRatio?: number;
  quantificationStatus: QuantificationStatus;
  riskStratum?: string;
  mapsToPretestAssumptionId?: string;
  overlapWarning?: string;
  rationale: string;
  limitations: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  kind: EvidenceProfileKind;
  custom?: boolean;
  deviationReason?: string;
}

export interface PhysicalSystem {
  id: string;
  label: string;
  sortOrder: number;
}

export interface PhysicalCondition {
  id: string;
  systemId: string;
  label: string;
  sourceBox: string;
}

export interface PhysicalLikelihoodRatio {
  value: number | null;
  notReported: boolean;
  ciLow?: number;
  ciHigh?: number;
}

export interface PhysicalPretestRange {
  low: number;
  high: number;
}

export interface PhysicalFinding {
  id: string;
  systemId: string;
  conditionId: string;
  findingLabel: string;
  positiveCriterion: string;
  negativeCriterion: string;
  lrPositive: PhysicalLikelihoodRatio;
  lrNegative: PhysicalLikelihoodRatio;
  pretestRange: PhysicalPretestRange;
  source: {
    title: string;
    sourceBox: string;
    sourcePage: number;
    note: string;
  };
  limitations: string;
  reviewStatus: ReviewStatus;
  reviewNote?: string;
}

export interface CalculatorState {
  appMode: CalculatorMode;
  selectedTestId: string;
  selectedEvidenceProfileId: string;
  selectedAssumptionId: string;
  selectedSettingId: string;
  selectedConditionId: string;
  manualPretestPercent: number;
  pretestInputSource?: 'unset' | 'manual' | 'assumption';
  clinicalContext?: ClinicalContext;
  selectedPracticeQuestionId?: string;
  selectedFindingCategory?: FindingCategory;
  pretestInterferencesOpen?: boolean;
  selectedModifierIds: string[];
  modifierListExpanded: boolean;
  pretestStatusExpanded?: boolean;
  pretestEstimateDetailsOpen?: boolean;
  customTests: DiagnosticTest[];
  customEvidenceProfiles: EvidenceProfile[];
  customAssumptions: PretestAssumption[];
  customModifiers: ClinicalModifier[];
  drawerOpen: boolean;
  adminMode: 'test' | 'profile' | 'assumption' | 'scenario' | 'modifier' | 'data' | 'catalog';
  catalogFullscreen?: boolean;
  catalogVisibleColumns?: string[];
  selectedDiagnosticChainId?: string;
  selectedPhysicalSystemId?: string;
  selectedPhysicalConditionId?: string;
  selectedPhysicalFindingId?: string;
  physicalPretestPercent?: number | null;
}

export interface DiagnosticChainStage {
  id: string;
  testId: string;
  evidenceProfileId: string;
  label: string;
  expectedUse: 'screening' | 'confirmation' | 'parallel' | 'follow-up';
  continueOn?: Array<'positive' | 'negative'>;
  stopAfter?: Partial<Record<'positive' | 'negative', string>>;
}

export interface DiagnosticChain extends ReviewMetadata {
  id: string;
  conditionId: string;
  settingIds: string[];
  label: string;
  description: string;
  rationale: string;
  limitations: string;
  pathNotes?: Record<string, string>;
  stages: DiagnosticChainStage[];
  sources: EvidenceSource[];
  lastReviewed: string;
  kind: EvidenceProfileKind;
  calculationPolicy?: 'workflow-only' | 'conditional-lr';
  conditionalEvidence?: string;
  decisions?: Array<{ when: string; action: string; status: 'continue' | 'stop' | 'clarify' | 'urgent' }>;
}

export interface CalculationResult {
  pretestProbability: number;
  lrPositive: number;
  lrNegative: number;
  postPositiveProbability: number;
  postNegativeProbability: number;
  ppv: number | null;
  npv: number | null;
}

export type ProfileCalculationOutcome =
  | { status: 'computed'; result: CalculationResult }
  | { status: 'not-computable'; reason: string };

export interface UserDataExport {
  schemaVersion: 7;
  exportedAt: string;
  customTests: DiagnosticTest[];
  customEvidenceProfiles: EvidenceProfile[];
  customAssumptions: PretestAssumption[];
  customModifiers: ClinicalModifier[];
}

export interface PracticeQuestion extends ReviewMetadata {
  id: string;
  conditionId: string;
  label: string;
  contexts: ClinicalContext[];
  testIds: string[];
  indication: string;
  prerequisites: string[];
  results: Record<FindingCategory, string>;
  urgent: string;
  burden: string;
  reflection: string;
  sources: EvidenceSource[];
  lastReviewed: string;
}
