import "./simulation.css";
import testsRaw from "./data/tests.json";
import type { DiagnosticTest, EvidenceProfile } from "./types";
import {
  calculateProfileOutcome,
  formatPercent,
  formatRatio,
  parseProbabilityPercent,
  tryResolveLikelihoodRatios,
} from "./lib/calculations";
import { lectureCases } from "./lib/learning";
import { drawNomogramCanvases } from "./ui/renderNomogram";
import { renderFrequencyTree } from "./ui/frequencyTree";
import { element as el, sourceLink } from "./ui/dom";

const tests = testsRaw as DiagnosticTest[];
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const examples = [
  "d-dimer-dvt-high-sensitivity",
  "ntprobnp-400",
  "dst-1mg-statpearls",
  "metanephrines-plasma-fractionated-conservative",
  "trab-third-generation-meta",
  "ttg-iga-adults-meta",
];
const profiles = tests.flatMap((t) => t.evidenceProfiles);
select("exampleSelect").add(
  new Option("Freies LR-Szenario (keine klinische Testgüte)", ""),
);
for (const id of examples) {
  const p = profiles.find((p) => p.id === id);
  const t = tests.find((t) => t.id === p?.testId);
  if (p && t)
    select("exampleSelect").add(new Option(`${t.name} · ${p.label}`, id));
}
let active: EvidenceProfile | undefined;
let frame: number | undefined;
let caseStep = 0;
const numberText = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 8, useGrouping: false });
const logSlider = (value: number, min: number, max: number) =>
  (Math.log(value / min) / Math.log(max / min)) * 1000;
const fromSlider = (value: number, min: number, max: number) =>
  min * Math.pow(max / min, value / 1000);
function syncRanges() {
  const p = parseProbabilityPercent(input("pretestNumber").value);
  if (p !== null) input("pretestRange").value = String(p);
  for (const [suffix, min, max] of [
    ["Positive", 1, 150],
    ["Negative", 0.0001, 1],
  ] as const) {
    const v = parseLR(input("lr" + suffix + "Number").value);
    if (v !== null)
      input("lr" + suffix + "Range").value = String(logSlider(v, min, max));
  }
}
function parseLR(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 && n <= 100000 ? n : null;
}
function hypothetical(positive: number, negative: number): EvidenceProfile {
  return {
    id: "hypothetical",
    testId: "hypothetical",
    label: "Hypothetisches LR-Szenario",
    kind: "scenario",
    calculationMode: "binary-lr",
    lrDerivation: "reported",
    method: "Freie LR-Eingabe",
    cutoff: "Nicht klinisch festgelegt",
    population: "Hypothetisch",
    sensitivity: null,
    specificity: null,
    lrPositive: positive,
    lrNegative: negative,
    rationale: "Didaktische Variation",
    limitations: "Kein klinischer Test; keine belegte Sensitivität/Spezifität.",
    sources: [],
    lastReviewed: "2026-09-05",
    reviewStatus: "needs-review",
    evidenceQuality: "unclear",
    dataCompleteness: "minimal",
  };
}
function summarize(profile: EvidenceProfile, p: number) {
  const o = calculateProfileOutcome(profile, p);
  return o.status === "computed"
    ? `Prätest ${formatPercent(p)} · positiv ${formatPercent(o.result.postPositiveProbability)} · negativ ${formatPercent(o.result.postNegativeProbability)}`
    : "Keine gültige Berechnung";
}
function schedule() {
  if (frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    render();
  });
}
function render() {
  const percent = parseProbabilityPercent(input("pretestNumber").value),
    plus = parseLR(input("lrPositiveNumber").value),
    minus = parseLR(input("lrNegativeNumber").value);
  const valid = percent !== null && plus !== null && minus !== null;
  $("inputError").textContent = valid
    ? ""
    : "Gültige Prätestwahrscheinlichkeit (0–100 %) und positive, endliche LR-Werte erforderlich.";
  if (!valid) {
    $("resultLine").textContent = "Keine Berechnung bei ungültiger Eingabe.";
    for (const id of ["nomogramPositive", "nomogramNegative"]) {
      $<HTMLCanvasElement>(id)
        .getContext("2d")
        ?.clearRect(
          0,
          0,
          $<HTMLCanvasElement>(id).width,
          $<HTMLCanvasElement>(id).height,
        );
    }
    for (const id of ["treeA", "treeB", "scenarioAResult", "scenarioBResult"])
      $(id).replaceChildren();
    return;
  }
  const p = percent / 100,
    profile = active ?? hypothetical(plus, minus),
    outcome = calculateProfileOutcome(profile, p);
  $("parameterMode").textContent = active
    ? "Katalogprofil. Eine LR-Änderung wechselt in ein freies Szenario."
    : "Hypothetisches LR-Szenario; kein klinischer Standard.";
  if (outcome.status !== "computed") return;
  drawNomogramCanvases(
    {
      positive: $<HTMLCanvasElement>("nomogramPositive"),
      negative: $<HTMLCanvasElement>("nomogramNegative"),
    },
    outcome.result,
    { direction: "none" },
  );
  $("resultLine").textContent = summarize(profile, p);
  const mode = select("comparisonMode").value;
  $("comparisonPretest").hidden = mode === "profile";
  $("comparisonProfileWrap").hidden = mode !== "profile";
  const other =
    mode === "profile"
      ? profiles.find(
          (candidate) => candidate.id === select("comparisonProfile").value,
        )
      : profile;
  const otherPercent =
    mode === "profile"
      ? percent
      : parseProbabilityPercent(input("comparisonNumber").value);
  $("comparisonCaution").textContent =
    mode === "profile"
      ? "Profile unterscheiden sich ggf. in Population, Methode und Cut-off. Dies ist kein direkter Überlegenheitsnachweis."
      : "Beide Szenarien verwenden denselben Nenner: 1000 Personen. Die Ausgangswerte sind didaktisch gewählt, keine beobachteten Setting-Prävalenzen.";
  $("scenarioAResult").textContent = summarize(profile, p);
  renderFrequencyTree($("treeA"), profile, p);
  if (other && otherPercent !== null) {
    $("scenarioBResult").textContent =
      summarize(other, otherPercent / 100) +
      " · " +
      other.label +
      " · " +
      other.population;
    renderFrequencyTree($("treeB"), other, otherPercent / 100);
  } else {
    $("scenarioBResult").textContent =
      mode === "profile"
        ? "Ein Katalogprofil auswählen; andere Tests werden nicht als vergleichbar angeboten."
        : "Gültigen Prätestwert für Szenario B eingeben.";
    $("treeB").replaceChildren();
  }
}
function selectExample() {
  active = profiles.find((p) => p.id === select("exampleSelect").value);
  $("exampleEvidence").replaceChildren();
  select("comparisonProfile").replaceChildren();
  if (active) {
    const lr = tryResolveLikelihoodRatios(active);
    if (lr) {
      input("lrPositiveNumber").value = numberText(
        Number(lr.lrPositive.toPrecision(4)),
      );
      input("lrNegativeNumber").value = numberText(
        Number(lr.lrNegative.toPrecision(4)),
      );
    }
    $("exampleEvidence").append(
      el("p", `${active.population} · ${active.method} · ${active.cutoff}`),
      el("p", active.limitations, "muted"),
      el(
        "p",
        `LR+ ${formatRatio(lr?.lrPositive ?? null)} / LR− ${formatRatio(lr?.lrNegative ?? null)} aus dem gemeinsamen Katalog. Quellenübertragbarkeit beachten; menschliche Freigabe offen.`,
        "muted",
      ),
    );
    for (const s of active.sources)
      $("exampleEvidence").append(
        sourceLink(s.title, s.url),
        document.createTextNode(" · "),
      );
    for (const p of profiles.filter(
      (p) => p.testId === active?.testId && tryResolveLikelihoodRatios(p),
    ))
      select("comparisonProfile").add(new Option(p.label, p.id));
  }
  syncRanges();
  schedule();
}
for (const id of [
  "pretestNumber",
  "lrPositiveNumber",
  "lrNegativeNumber",
  "comparisonNumber",
])
  input(id).addEventListener("input", () => {
    if (id.startsWith("lr")) {
      active = undefined;
      select("exampleSelect").value = "";
      $("exampleEvidence").replaceChildren();
      select("comparisonProfile").replaceChildren();
    }
    syncRanges();
    schedule();
  });
input("pretestRange").addEventListener("input", () => {
  input("pretestNumber").value = numberText(
    Number(input("pretestRange").value),
  );
  schedule();
});
for (const [suffix, min, max] of [
  ["Positive", 1, 150],
  ["Negative", 0.0001, 1],
] as const)
  input("lr" + suffix + "Range").addEventListener("input", () => {
    active = undefined;
    select("exampleSelect").value = "";
    $("exampleEvidence").replaceChildren();
    select("comparisonProfile").replaceChildren();
    input("lr" + suffix + "Number").value = numberText(
      fromSlider(Number(input("lr" + suffix + "Range").value), min, max),
    );
    schedule();
  });
document.querySelectorAll("input").forEach((i) =>
  i.addEventListener("change", () => {
    $("resultAnnouncement").textContent = $("resultLine").textContent;
  }),
);
select("exampleSelect").addEventListener("change", selectExample);
for (const id of ["comparisonMode", "comparisonProfile"])
  select(id).addEventListener("change", schedule);
$("lectureToggle").addEventListener("click", () => {
  const enabled = document.body.classList.toggle("lecture");
  $("lectureToggle").setAttribute("aria-pressed", String(enabled));
  schedule();
});
$("printButton").addEventListener("click", () => window.print());
for (const [i, c] of lectureCases.entries())
  select("caseSelect").add(new Option(c.title, String(i)));
function renderCase() {
  const c = lectureCases[Number(select("caseSelect").value) ?? 0];
  $("caseContent").replaceChildren(el("p", c.question));
  if (caseStep >= 1) $("caseContent").append(el("p", c.clue, "reveal-step"));
  if (caseStep >= 2) $("caseContent").append(el("p", c.answer, "reveal-step"));
  if (caseStep >= 3)
    $("caseContent").append(
      el("p", c.transfer, "reveal-step"),
      sourceLink("Quelle", c.source),
    );
  $<HTMLButtonElement>("revealCase").disabled = caseStep >= 3;
}
select("caseSelect").addEventListener("change", () => {
  caseStep = 0;
  renderCase();
});
$("revealCase").addEventListener("click", () => {
  caseStep = Math.min(3, caseStep + 1);
  renderCase();
});
$("resetCase").addEventListener("click", () => {
  caseStep = 0;
  renderCase();
});
window.addEventListener("resize", schedule);
window.addEventListener("beforeprint", render);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("../sw.js").catch(() => {});
  });
select("exampleSelect").value = "ntprobnp-400";
selectExample();
renderCase();
