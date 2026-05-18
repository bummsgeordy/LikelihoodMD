import { chainPathFinalProbability, type DiagnosticChainPath, type DiagnosticChainViewModel } from '../app/diagnosticChains';
import { formatPercent } from '../lib/calculations';

function resultLabel(path: DiagnosticChainPath): string {
  const first = path.firstResultLabel === 'positiv' ? 'Test 1 positiv' : 'Test 1 negativ';
  const second = path.secondResultLabel === 'positiv' ? 'Test 2 positiv' : 'Test 2 negativ';
  return `${first} → ${second}`;
}

export function renderDiagnosticChains(
  container: HTMLElement,
  viewModels: DiagnosticChainViewModel[],
  startPretestProbability: number
): void {
  container.textContent = '';
  if (viewModels.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Für diese Erkrankung und dieses Setting ist noch keine kuratierte Diagnostikkette hinterlegt.';
    container.append(empty);
    return;
  }

  viewModels.forEach(viewModel => {
    const card = document.createElement('article');
    card.className = 'chain-card';

    const heading = document.createElement('div');
    heading.className = 'chain-heading';
    const title = document.createElement('h3');
    title.textContent = viewModel.chain.label;
    const status = document.createElement('span');
    status.className = 'badge badge-warning';
    status.textContent = viewModel.chain.reviewStatus;
    heading.append(title, status);

    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = `${viewModel.chain.description} Start-Prätest: ${formatPercent(startPretestProbability)}.`;

    const stages = document.createElement('ol');
    stages.className = 'chain-stages';
    viewModel.stages.slice(0, 2).forEach(stage => {
      const item = document.createElement('li');
      item.textContent = `${stage.label}: ${stage.test.name} (${stage.profile.label})`;
      stages.append(item);
    });

    const table = document.createElement('table');
    table.className = 'chain-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pfad</th>
          <th>Posttestwahrscheinlichkeit nach Test 1</th>
          <th>Posttestwahrscheinlichkeit nach Test 2</th>
        </tr>
      </thead>
    `;
    const body = document.createElement('tbody');
    viewModel.paths.forEach(path => {
      const row = document.createElement('tr');
      const finalProbability = chainPathFinalProbability(path);
      row.innerHTML = `
        <td>${resultLabel(path)}</td>
        <td>${formatPercent(path.intermediateProbability)}</td>
        <td>${formatPercent(finalProbability)}</td>
      `;
      body.append(row);
    });
    table.append(body);

    const limitations = document.createElement('p');
    limitations.className = 'chain-limitations';
    limitations.textContent = `Grenzen: ${viewModel.chain.limitations}`;

    card.append(heading, description, stages, table, limitations);
    container.append(card);
  });
}
