import type {
  ClinicalContext,
  ConditionGuidance,
  EvidenceProfile,
  FindingCategory,
  PracticeQuestion,
} from "../types";
import { contextLabels } from "../app/practice";
import { element as el, sourceLink, textList } from "./dom";

export const findingLabels: Record<FindingCategory, string> = {
  normal: "Unauffällig",
  abnormal: "Auffällig",
  borderline: "Grenzwertig",
  discordant: "Widersprüchlich",
  uninterpretable: "Nicht verwertbar",
};
export function renderPractice(
  host: HTMLElement,
  questions: PracticeQuestion[],
  current: PracticeQuestion | undefined,
  context: ClinicalContext,
  finding: FindingCategory,
  guidance: ConditionGuidance | undefined,
  onQuestion: (q: PracticeQuestion) => void,
  onContext: (c: ClinicalContext) => void,
  onFinding: (f: FindingCategory) => void,
): void {
  host.replaceChildren();
  host.append(el("h2", "Klinische Frage"));
  const controls = el("div", "", "practice-controls");
  const searchLabel = el("label", "Frage suchen");
  const search = el("input");
  search.type = "search";
  search.placeholder = "z. B. TSH, Prolaktin, Testosteron";
  searchLabel.append(search);
  const questionLabel = el("label", "Fragestellung");
  const select = el("select");
  questionLabel.append(select);
  const populate = () => {
    select.replaceChildren(new Option("Erkrankungsbezogene Übersicht", ""));
    for (const q of questions.filter((q) =>
      q.label
        .toLocaleLowerCase("de")
        .includes(search.value.toLocaleLowerCase("de")),
    ))
      select.add(new Option(q.label, q.id));
    select.value = current?.id ?? "";
  };
  populate();
  search.addEventListener("input", populate);
  select.addEventListener("change", () => {
    const q = questions.find((q) => q.id === select.value);
    if (q) onQuestion(q);
  });
  const contextLabel = el("label", "Anlass");
  const contextSelect = el("select");
  contextSelect.setAttribute("aria-label", "Anlass");
  for (const [id, label] of Object.entries(contextLabels))
    contextSelect.add(new Option(label, id));
  contextSelect.value = context;
  contextSelect.addEventListener("change", () =>
    onContext(contextSelect.value as ClinicalContext),
  );
  contextLabel.append(contextSelect);
  controls.append(searchLabel, questionLabel, contextLabel);
  host.append(controls);
  if (!current) {
    host.append(
      el(
        "p",
        guidance?.summary ??
          "Erkrankung unten auswählen. Für diesen Anlass ist noch kein spezifischer Ablauf kuratiert.",
        "muted",
      ),
    );
    if (guidance) {
      const details = el("details");
      details.append(
        el("summary", "Indikation und Voraussetzungen"),
        textList([...guidance.whenToTest, ...guidance.pitfalls]),
      );
      host.append(details);
    }
    return;
  }
  const steps = el("div", "", "practice-steps");
  const indication = el("section");
  indication.append(el("h3", "1 · Wann testen?"), el("p", current.indication));
  const prerequisites = el("section");
  prerequisites.append(
    el("h3", "2 · Voraussetzungen"),
    textList(current.prerequisites),
  );
  const result = el("section");
  result.append(el("h3", "3 · Befund einordnen"));
  const resultLabel = el("label", "Befundkonstellation");
  const resultSelect = el("select");
  resultSelect.setAttribute("aria-label", "Befundkonstellation");
  resultLabel.append(resultSelect);
  for (const [id, label] of Object.entries(findingLabels))
    resultSelect.add(new Option(label, id));
  resultSelect.value = finding;
  resultSelect.addEventListener("change", () =>
    onFinding(resultSelect.value as FindingCategory),
  );
  result.append(resultLabel, el("p", current.results[finding]));
  const next = el("section");
  next.append(
    el("h3", "4 · Nächste Klärung"),
    el("p", current.reflection),
    el("p", current.burden, "muted"),
  );
  steps.append(indication, prerequisites, result, next);
  host.append(steps);
  const urgent = el("details", "", "practice-urgent");
  urgent.append(
    el("summary", "! Dringliche Konstellationen"),
    el("p", current.urgent),
  );
  const sources = el("details");
  sources.append(
    el(
      "summary",
      `${current.sources.length} Quellen · fachliche Freigabe offen`,
    ),
  );
  for (const source of current.sources) {
    const p = el("p");
    p.append(
      sourceLink(source.title, source.url),
      el("span", " · " + source.note),
    );
    sources.append(p);
  }
  host.append(urgent, sources);
}

export function renderProfileCategories(
  host: HTMLElement,
  profile: EvidenceProfile,
): void {
  host.replaceChildren();
  if (!profile.resultCategories?.length) return;
  const label = el("label", "Ergebniskategorie");
  const select = el("select");
  label.append(select);
  select.add(new Option("Kategorie auswählen", ""));
  for (const c of profile.resultCategories)
    select.add(new Option(c.label, c.id));
  const explanation = el("p");
  select.addEventListener("change", () => {
    explanation.textContent =
      profile.resultCategories?.find((c) => c.id === select.value)
        ?.interpretation ?? "";
  });
  host.append(label, explanation);
}
