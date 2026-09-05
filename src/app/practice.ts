import type {
  ClinicalContext,
  DiagnosticTest,
  PracticeQuestion,
} from "../types";

export const contextLabels: Record<ClinicalContext, string> = {
  screening: "Screening",
  suspicion: "Gezielter Verdacht",
  incidental: "Zufallsbefund",
  "follow-up": "Verlauf",
};

export function applicableQuestion(
  questions: PracticeQuestion[],
  conditionId: string,
  context: ClinicalContext,
  selectedId?: string,
): PracticeQuestion | undefined {
  const matching = questions.filter(
    (q) => q.conditionId === conditionId && q.contexts.includes(context),
  );
  return matching.find((q) => q.id === selectedId) ?? matching[0];
}

export function applicableTests(
  tests: DiagnosticTest[],
  conditionId: string,
  question?: PracticeQuestion,
  settingId = "",
): DiagnosticTest[] {
  return tests
    .filter(
      (t) =>
        t.conditionId === conditionId &&
        (!question || question.testIds.includes(t.id)),
    )
    .filter(
      (t) =>
        !(
          settingId === "thyroid-eu-tirads-1" && t.id === "thyroid-fna-bethesda"
        ),
    );
}
