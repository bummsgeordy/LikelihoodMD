export type SourceKind = 'Leitlinie' | 'Studie' | 'Review' | 'Lehrtext' | 'Lokale Annahme';
export type EvidenceProfileKind = 'curated' | 'custom' | 'scenario';
export type PretestEvidenceLevel = 'direct' | 'fallback' | 'manual';
export type ClinicalModifierDirection = 'increases' | 'decreases' | 'uncertain';
export type ModifierCategory = 'Symptom' | 'Klinisches Zeichen' | 'Anamnese' | 'Kontext' | 'Labor/Vorbefund';
export type ReviewStatus = 'draft' | 'reviewed' | 'needs-review';
export type EvidenceQuality = 'high' | 'moderate' | 'low' | 'expert-opinion' | 'unclear';
export type DataCompleteness = 'complete' | 'partial' | 'minimal';
export type QuantificationStatus = 'qualitative' | 'probability-factor' | 'likelihood-ratio';
export type CalculatorMode = 'diagnostic-tests' | 'physical-exam';
export type PretestEvidenceQualityCode =
  | 'Adirecthighquality'
  | 'Bmoderatedirect'
  | 'Cindirectormixed'
  | 'Dexpertestimate'
  | 'E_uncertain';
export type ProbabilityModifierDirection =
  | 'decreasesstrongly'
  | 'decreasesmoderately'
  | 'neutralorunclear'
  | 'increasesmildly'
  | 'increasesmoderately'
  | 'increasesstrongly'
  | 'increasesvery_strongly';
export type ClinicalDomain = 'endocrinology' | 'cardiology' | 'nephrology' | 'primary_care' | 'emergency';
export type PretestSourceType =
  | 'guideline'
  | 'review'
  | 'cohort'
  | 'metaanalysis'
  | 'educationalreview'
  | 'expert_summary';
export type PretestEstimateType =
  | 'populationprevalence'
  | 'clinicalsettingprevalence'
  | 'highriskgroup'
  | 'riskscorecategory'
  | 'expertestimate';
export type IssueSeverity = 'low' | 'moderate' | 'high';
export type PretestQualitativeAdjustedRisk =
  | 'niedriger als Basis'
  | 'etwa Basisrisiko'
  | 'moderat erhöht'
  | 'deutlich erhöht'
  | 'sehr deutlich erhöht'
  | 'nicht valide berechenbar wegen Präanalytik/Medikamenten';

export const REVIEW_STATUSES: ReviewStatus[] = ['draft', 'reviewed', 'needs-review'];
export const EVIDENCE_QUALITIES: EvidenceQuality[] = ['high', 'moderate', 'low', 'expert-opinion', 'unclear'];
export const DATA_COMPLETENESS_LEVELS: DataCompleteness[] = ['complete', 'partial', 'minimal'];
export const QUANTIFICATION_STATUSES: QuantificationStatus[] = ['qualitative', 'probability-factor', 'likelihood-ratio'];

export interface ReviewMetadata {
  reviewStatus: ReviewStatus;
  evidenceQuality: EvidenceQuality;
  dataCompleteness: DataCompleteness;
  reviewNote?: string;
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

export interface SourceReference {
  id: string;
  title: string;
  year?: number;
  type: PretestSourceType;
  url?: string;
  doi?: string;
  note?: string;
}

export interface ProbabilityModifier {
  factor: string;
  direction: ProbabilityModifierDirection;
  approximateEffect?: string;
  evidenceQuality: PretestEvidenceQualityCode;
  note?: string;
}

export interface PreanalyticalIssue {
  issue: string;
  affectedTests: string[];
  effect: string;
  severity: IssueSeverity;
  mitigation?: string;
}

export interface MedicationInterference {
  medicationOrClass: string;
  affectedTests: string[];
  effect: string;
  severity: IssueSeverity;
  mitigation?: string;
}

export interface PretestProbabilityEstimate {
  id: string;
  diseaseId: string;
  diseaseName: string;
  domain: ClinicalDomain[];
  settingId?: string;
  setting: string;
  baseProbabilityPercent?: number;
  probabilityRangePercent: [number, number];
  estimateType: PretestEstimateType;
  evidenceQuality: PretestEvidenceQualityCode;
  qualityNote: string;
  sources: string[];
  modifiers: ProbabilityModifier[];
  preanalyticalIssues: PreanalyticalIssue[];
  medicationInterferences: MedicationInterference[];
  implementationNotes?: string;
}

export interface PretestProbabilityDataset {
  sources: SourceReference[];
  estimates: PretestProbabilityEstimate[];
}

export interface PretestEstimateResolution {
  estimate: PretestProbabilityEstimate | null;
  baseProbability: number | null;
  probabilityRange: [number, number] | null;
  qualitativeAdjustedRisk: PretestQualitativeAdjustedRisk;
  activeWarnings: string[];
  confidenceLabel: string;
  sources: SourceReference[];
  activeModifiers: ProbabilityModifier[];
  activePreanalyticalIssues: PreanalyticalIssue[];
  activeMedicationInterferences: MedicationInterference[];
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
  method: string;
  cutoff: string;
  procedure?: string;
  sensitivity: number | null;
  specificity: number | null;
  lrPositive?: number;
  lrNegative?: number;
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
  probability: number;
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
  originalFindingLabel: string;
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
  selectedModifierIds: string[];
  modifierListExpanded: boolean;
  pretestStatusExpanded?: boolean;
  pretestEstimateDetailsOpen?: boolean;
  pretestInterferenceDetailsOpen?: boolean;
  pretestInterferenceUserToggled?: boolean;
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
  physicalPretestPercent?: number;
}

export interface DiagnosticChainStage {
  id: string;
  testId: string;
  evidenceProfileId: string;
  label: string;
  expectedUse: 'screening' | 'confirmation' | 'parallel' | 'follow-up';
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

export interface UserDataExport {
  schemaVersion: 5;
  exportedAt: string;
  customTests: DiagnosticTest[];
  customEvidenceProfiles: EvidenceProfile[];
  customAssumptions: PretestAssumption[];
  customModifiers: ClinicalModifier[];
}
