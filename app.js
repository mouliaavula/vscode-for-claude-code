const els = {
  initial: document.getElementById('initial'),
  initialHint: document.getElementById('initialHint'),
  contribution: document.getElementById('contribution'),
  contributionFreq: document.getElementById('contributionFreq'),
  rate: document.getElementById('rate'),
  compoundFreq: document.getElementById('compoundFreq'),
  years: document.getElementById('years'),
  yearsLabel: document.getElementById('yearsLabel'),
  calcBtn: document.getElementById('calcBtn'),
  statTotal: document.getElementById('statTotal'),
  statInvested: document.getElementById('statInvested'),
  statInterest: document.getElementById('statInterest'),
  statMultiplier: document.getElementById('statMultiplier'),
  toggleTableBtn: document.getElementById('toggleTableBtn'),
  tableWrap: document.getElementById('tableWrap'),
  tableBody: document.querySelector('#breakdownTable tbody'),
};

let chart = null;

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function inWords(value) {
  if (value >= 1e7) return `≈ ${(value / 1e7).toFixed(2)} Crore`;
  if (value >= 1e5) return `≈ ${(value / 1e5).toFixed(2)} Lakh`;
  if (value >= 1e3) return `≈ ${(value / 1e3).toFixed(1)} Thousand`;
  return '';
}

// Month-by-month simulation: contributions are added at their own frequency,
// interest is compounded at the chosen compounding frequency.
function simulate({ initial, contribution, contribFreqMonths, annualRatePercent, compoundFreqMonths, years }) {
  const totalMonths = years * 12;
  const periodsPerYear = 12 / compoundFreqMonths;
  const periodicRate = (annualRatePercent / 100) / periodsPerYear;

  let balance = initial;
  let totalInvested = initial;

  // yearly[0] = starting point, yearly[y] = state at end of year y
  const yearly = [{ year: 0, balance, totalInvested }];

  for (let month = 1; month <= totalMonths; month++) {
    if (contribFreqMonths > 0 && month % contribFreqMonths === 0) {
      balance += contribution;
      totalInvested += contribution;
    }
    if (month % compoundFreqMonths === 0) {
      balance *= 1 + periodicRate;
    }
    if (month % 12 === 0) {
      yearly.push({ year: month / 12, balance, totalInvested });
    }
  }

  return { yearly, finalBalance: balance, totalInvested };
}

function renderResults(result) {
  const { yearly, finalBalance, totalInvested } = result;
  const totalInterest = finalBalance - totalInvested;
  const multiplier = totalInvested > 0 ? finalBalance / totalInvested : 0;

  els.statTotal.textContent = formatINR(finalBalance);
  els.statInvested.textContent = formatINR(totalInvested);
  els.statInterest.textContent = formatINR(totalInterest);
  els.statMultiplier.textContent = `${multiplier.toFixed(2)}x`;

  renderChart(yearly);
  renderTable(yearly);
}

function renderChart(yearly) {
  const labels = yearly.map((r) => `Yr ${r.year}`);
  const investedData = yearly.map((r) => Math.round(r.totalInvested));
  const interestData = yearly.map((r) => Math.round(r.balance - r.totalInvested));

  const ctx = document.getElementById('growthChart').getContext('2d');

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Invested',
          data: investedData,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.35)',
          fill: true,
          stack: 'stack1',
          tension: 0.25,
          pointRadius: 0,
        },
        {
          label: 'Interest Earned',
          data: interestData,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.35)',
          fill: true,
          stack: 'stack1',
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          stacked: true,
          ticks: {
            callback: (v) => formatINR(v),
          },
        },
        x: {
          ticks: { maxTicksLimit: 12 },
        },
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${formatINR(item.raw)}`,
          },
        },
      },
    },
  });
}

function renderTable(yearly) {
  els.tableBody.innerHTML = '';
  for (let i = 1; i < yearly.length; i++) {
    const cur = yearly[i];
    const prev = yearly[i - 1];
    const investedThisYear = cur.totalInvested - prev.totalInvested;
    const interestThisYear = cur.balance - prev.balance - investedThisYear;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cur.year}</td>
      <td>${formatINR(investedThisYear)}</td>
      <td>${formatINR(cur.totalInvested)}</td>
      <td>${formatINR(interestThisYear)}</td>
      <td>${formatINR(cur.balance)}</td>
    `;
    els.tableBody.appendChild(tr);
  }
}

function calculate() {
  const initial = parseFloat(els.initial.value) || 0;
  const contribution = parseFloat(els.contribution.value) || 0;
  const contribFreqMonths = parseInt(els.contributionFreq.value, 10);
  const annualRatePercent = parseFloat(els.rate.value) || 0;
  const compoundFreqMonths = parseInt(els.compoundFreq.value, 10);
  const years = parseInt(els.years.value, 10);

  const result = simulate({
    initial,
    contribution,
    contribFreqMonths,
    annualRatePercent,
    compoundFreqMonths,
    years,
  });

  renderResults(result);
}

els.initial.addEventListener('input', () => {
  els.initialHint.textContent = inWords(parseFloat(els.initial.value) || 0);
});

els.years.addEventListener('input', () => {
  els.yearsLabel.textContent = els.years.value;
});

els.calcBtn.addEventListener('click', calculate);

els.toggleTableBtn.addEventListener('click', () => {
  const isHidden = els.tableWrap.hidden;
  els.tableWrap.hidden = !isHidden;
  els.toggleTableBtn.textContent = isHidden ? 'Hide' : 'Show';
});

// initial render on load
els.initialHint.textContent = inWords(parseFloat(els.initial.value) || 0);
calculate();
