/* ============================================
   PVL 13PV — charts.js
   Chart.js visualizations, scroll animations, count-ups
   ============================================ */

// ─── Mobile Menu ───────────────────────────────
const menuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  navLinks.classList.toggle('active');
});
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('nav')) {
    navLinks.classList.remove('active');
  }
});

// ─── Mobile Helpers ──────────────────────────────
const isMobile = () => window.innerWidth < 768;

// ─── Chart.js Global Theme ────────────────────
Chart.defaults.color = '#A8A29E';
Chart.defaults.borderColor = 'rgba(68, 64, 60, 0.4)';
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(28, 25, 23, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(196, 104, 73, 0.3)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { family: "'DM Sans', sans-serif", weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 12 };
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.interaction = { mode: 'nearest', intersect: false };

// ─── Palette ──────────────────────────────────
const PALETTE = {
  terracotta: '#C46849',
  terracottaLight: '#D4785A',
  sand: '#E8A87C',
  sandLight: '#F0C9A8',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  textMain: '#FAFAF9',
  textMuted: '#A8A29E',
  textDim: '#78716C',
  surface: '#1C1917',
};

const STAGE_COLORS = {
  filing: '#E8A87C',
  doc_drop: '#D4785A',
  pre_confirmation: '#C46849',
  confirmation_cliff: '#EF4444',
  early_attrition: '#F59E0B',
  life_friction: '#A8A29E',
  fatigue: '#78716C',
  major_life_events: '#C46849',
  final_stretch: '#10B981',
};

// ─── Hardcoded Data ───────────────────────────

// Chart A: National Survival Curve (61 data points)
const SURVIVAL_DATA = {
  months: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60],
  survival: [100,92,89.7,87.46,85.27,83.14,78.15,76.98,75.82,74.69,73.57,72.46,71.38,70.31,69.25,68.21,67.19,66.18,65.19,64.21,63.25,62.3,61.36,60.44,59.54,58.7,57.88,57.07,56.27,55.48,54.71,53.94,53.19,52.44,51.71,50.98,50.27,49.62,48.97,48.33,47.71,47.09,46.47,45.87,45.27,44.69,44.1,43.53,42.97,42.45,41.94,41.44,40.94,40.45,39.96,39.48,39.01,38.54,38.08,37.62,37.17],
  stages: ['filing','doc_drop','pre_confirmation','pre_confirmation','pre_confirmation','pre_confirmation','confirmation_cliff','early_attrition','early_attrition','early_attrition','early_attrition','early_attrition','early_attrition','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','life_friction','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','fatigue','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','major_life_events','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch','final_stretch'],
};

// Chart B: Monthly Cashflow (6 months)
const CASHFLOW_DATA = {
  labels: ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026'],
  receipts: [1902.02, 4730.68, 8599.72, 3472.49, 3682.02],
  claims: [70, 74, 93, 91, 98],
};

// Chart C: Monte Carlo Confidence
const MC_DATA = {
  p10: 1778159,
  p50: 1801273,
  p90: 1822388,
  mean: 1800919,
  var95: 1771184,
  var99: 1758609,
  bidRiskAdj: 1664251,
  bidFairVal: 1683753,
};

// Chart D: Priority Stack — real case ATLN3-2540124
// A→P→S→U recovery by tier from waterfall_audit.csv
const PRIORITY_STACK_DATA = {
  tiers: ['Admin (Trustee Fees)', 'Priority (IRS / Tax)', 'Secured (Mortgage / Auto)', 'Unsecured — Your Position'],
  filed:     [4965, 6924, 11734, 25745],  // filed claim amounts by tier
  recovered: [4965, 6924, 12223,  1815],  // actual/projected recovery
  // Recovery rates: 100%, 100%, 104%, 7¢/$
};

// Chart E: Risk Signals — from valuation memo (1,937 cases)
const RISK_SIGNALS_DATA = {
  // Sorted by case count, risk drivers first then protective
  labels: [
    'Wage Order',
    'Mortgage Curve',
    'Repeat Filer',
    'Erratic Payments',
    'Plan Modifications',
    'Conduit Mortgage',
    'Consistent Payer',
    'Relief from Stay',
    'Lien Strip',
    'Pro Se Filer',
  ],
  counts: [945, 577, 428, 381, 328, 273, 141, 82, 14, 11],
  // true = protective (green), false = risk driver (red)
  protective: [true, true, false, false, false, true, true, false, true, false],
};

// ─── Chart Instances ──────────────────────────
const chartInstances = {};

// ─── Chart A: Survival Curve ──────────────────
function initSurvivalChart() {
  const ctx = document.getElementById('survivalChart');
  if (!ctx || chartInstances.survival) return;

  // Build segment colors based on stage transitions
  const segmentColors = SURVIVAL_DATA.stages.map(s => STAGE_COLORS[s]);

  chartInstances.survival = new Chart(ctx, {
    type: 'line',
    data: {
      labels: SURVIVAL_DATA.months,
      datasets: [{
        label: 'Survival %',
        data: SURVIVAL_DATA.survival,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHitRadius: 20,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: PALETTE.terracotta,
        tension: 0.3,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(196, 104, 73, 0.15)');
          gradient.addColorStop(1, 'rgba(196, 104, 73, 0.0)');
          return gradient;
        },
        segment: {
          borderColor: (ctx) => {
            const idx = ctx.p0DataIndex;
            return segmentColors[idx] || PALETTE.terracotta;
          },
        },
      }],
    },
    options: {
      animation: {
        duration: 2500,
        easing: 'easeOutQuart',
      },
      scales: {
        x: {
          title: { display: true, text: 'Plan Month', color: PALETTE.textDim },
          ticks: {
            callback: (val) => {
              const v = SURVIVAL_DATA.months[val];
              return [0,6,12,18,24,36,48,60].includes(v) ? v : '';
            },
            maxRotation: 0,
          },
          grid: { display: false },
        },
        y: {
          title: { display: true, text: 'Survival %', color: PALETTE.textDim },
          min: 30,
          max: 100,
          ticks: { callback: (v) => v + '%' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => 'Month ' + items[0].label,
            label: (item) => {
              const stage = SURVIVAL_DATA.stages[item.dataIndex]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
              return [
                'Survival: ' + item.raw.toFixed(1) + '%',
                'Stage: ' + stage,
              ];
            },
          },
        },
      },
    },
  });
}

// ─── Chart B: Monthly Cashflow ────────────────
function initCashflowChart() {
  const ctx = document.getElementById('cashflowChart');
  if (!ctx || chartInstances.cashflow) return;

  chartInstances.cashflow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: CASHFLOW_DATA.labels,
      datasets: [
        {
          label: 'Cash Received ($)',
          data: CASHFLOW_DATA.receipts,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return PALETTE.terracotta;
            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, PALETTE.terracotta);
            gradient.addColorStop(1, PALETTE.sand);
            return gradient;
          },
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: 'y',
        },
        {
          label: 'Unique Claims Paid',
          data: CASHFLOW_DATA.claims,
          type: 'line',
          borderColor: PALETTE.textMuted,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: PALETTE.textMain,
          pointBorderColor: PALETTE.textMuted,
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      animation: {
        duration: 1500,
        easing: 'easeOutQuart',
        delay: (context) => context.dataIndex * 150,
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: window.innerWidth < 768 ? 45 : 0,
          },
        },
        y: {
          position: 'left',
          title: { display: true, text: 'Cash Received ($)', color: PALETTE.textDim },
          ticks: {
            callback: (v) => '$' + (v / 1000).toFixed(1) + 'k',
          },
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Claims Paid', color: PALETTE.textDim },
          grid: { drawOnChartArea: false },
          min: 50,
          max: 120,
        },
      },
      plugins: {
        legend: {
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              if (item.datasetIndex === 0)
                return 'Cash: $' + item.raw.toLocaleString();
              return 'Claims: ' + item.raw;
            },
          },
        },
      },
    },
  });
}

// ─── Chart C: Monte Carlo Confidence ──────────
function initMCChart() {
  const ctx = document.getElementById('mcChart');
  if (!ctx || chartInstances.mc) return;

  const labels = ['Portfolio NPV'];
  const p10 = MC_DATA.p10;
  const p50 = MC_DATA.p50;
  const p90 = MC_DATA.p90;

  chartInstances.mc = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: isMobile()
        ? ['VaR99', 'VaR95', 'P10', 'P50', 'Mean', 'P90']
        : ['VaR 99%', 'VaR 95%', 'P10', 'P50 (Median)', 'Mean', 'P90'],
      datasets: [{
        label: 'Portfolio NPV',
        data: [MC_DATA.var99, MC_DATA.var95, p10, p50, MC_DATA.mean, p90],
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',     // VaR99 - red
          'rgba(245, 158, 11, 0.6)',    // VaR95 - amber
          'rgba(196, 104, 73, 0.5)',    // P10
          'rgba(16, 185, 129, 0.7)',    // P50 - green
          'rgba(212, 120, 90, 0.6)',    // Mean
          'rgba(232, 168, 124, 0.6)',   // P90
        ],
        borderColor: [
          'rgba(239, 68, 68, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(196, 104, 73, 0.8)',
          'rgba(16, 185, 129, 1)',
          'rgba(212, 120, 90, 0.9)',
          'rgba(232, 168, 124, 0.9)',
        ],
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      animation: {
        duration: 2000,
        easing: 'easeOutQuart',
      },
      scales: {
        x: {
          title: { display: true, text: 'Portfolio NPV ($)', color: PALETTE.textDim },
          ticks: {
            callback: (v) => '$' + (v / 1000000).toFixed(2) + 'M',
          },
          min: 1650000,
          max: 1850000,
        },
        y: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => '$' + item.raw.toLocaleString(),
          },
        },
      },
    },
  });
}

// ─── Chart D: Priority Stack ──────────────────
function initWaterfallChart() {
  const ctx = document.getElementById('waterfallChart');
  if (!ctx || chartInstances.waterfall) return;

  const d = PRIORITY_STACK_DATA;

  // Abbreviate labels on mobile
  const labels = isMobile()
    ? ['Admin', 'Priority (IRS)', 'Secured', 'Unsecured — You']
    : d.tiers;

  // Colors: senior tiers muted, unsecured highlighted
  const filedColors = [
    'rgba(120, 113, 108, 0.35)',
    'rgba(120, 113, 108, 0.35)',
    'rgba(120, 113, 108, 0.35)',
    'rgba(196, 104, 73, 0.2)',
  ];
  const recoveredColors = [
    'rgba(168, 162, 158, 0.7)',
    'rgba(168, 162, 158, 0.7)',
    'rgba(245, 158, 11, 0.7)',
    'rgba(196, 104, 73, 0.85)',
  ];
  const recoveredBorders = [
    'rgba(168, 162, 158, 0.9)',
    'rgba(168, 162, 158, 0.9)',
    'rgba(245, 158, 11, 0.9)',
    'rgba(196, 104, 73, 1)',
  ];

  chartInstances.waterfall = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Filed Amount',
          data: d.filed,
          backgroundColor: filedColors,
          borderColor: filedColors.map(c => c.replace('0.35', '0.5').replace('0.2', '0.4')),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Projected Recovery',
          data: d.recovered,
          backgroundColor: recoveredColors,
          borderColor: recoveredBorders,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      animation: {
        duration: 1800,
        easing: 'easeOutQuart',
        delay: (context) => context.dataIndex * 200,
      },
      scales: {
        x: {
          title: { display: true, text: 'Claim Value ($)', color: PALETTE.textDim },
          ticks: {
            callback: (v) => {
              if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
              if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'k';
              return '$' + v;
            },
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: (context) => ({
              size: context.index === 3 ? 13 : 12,
              weight: context.index === 3 ? '700' : '400',
            }),
            color: (context) => context.index === 3 ? '#D4785A' : '#A8A29E',
          },
        },
      },
      plugins: {
        legend: {
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const idx = item.dataIndex;
              const filed = d.filed[idx];
              const recovered = d.recovered[idx];
              const rate = ((recovered / filed) * 100).toFixed(0);
              if (item.datasetIndex === 0)
                return 'Filed: $' + filed.toLocaleString();
              return 'Recovery: $' + recovered.toLocaleString() + ' (' + rate + '%)';
            },
          },
        },
      },
    },
  });
}

// ─── Chart E: Risk Signals ────────────────────
function initRiskSignalsChart() {
  const ctx = document.getElementById('riskSignalsChart');
  if (!ctx || chartInstances.riskSignals) return;

  const d = RISK_SIGNALS_DATA;

  const bgColors = d.protective.map(p =>
    p ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.55)'
  );
  const borderColors = d.protective.map(p =>
    p ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.85)'
  );

  chartInstances.riskSignals = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: 'Cases',
        data: d.counts,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      animation: {
        duration: 1800,
        easing: 'easeOutQuart',
        delay: (context) => context.dataIndex * 100,
      },
      scales: {
        x: {
          title: { display: true, text: 'Cases Flagged', color: PALETTE.textDim },
          grid: { color: 'rgba(68, 64, 60, 0.3)' },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: (context) => {
              return d.protective[context.index]
                ? 'rgba(16, 185, 129, 0.9)'
                : 'rgba(239, 68, 68, 0.85)';
            },
            font: { weight: '600', size: 12 },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const idx = item.dataIndex;
              const type = d.protective[idx] ? 'Protective' : 'Risk Driver';
              return item.raw + ' cases — ' + type;
            },
          },
        },
      },
    },
  });
}

// ─── Chart Initialization Map ─────────────────
const CHART_INIT_MAP = {
  survivalChart: initSurvivalChart,
  cashflowChart: initCashflowChart,
  mcChart: initMCChart,
  waterfallChart: initWaterfallChart,
  riskSignalsChart: initRiskSignalsChart,
};

// ─── Count-Up Animation ───────────────────────
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCountUp(el) {
  const target = parseFloat(el.dataset.countTarget);
  const prefix = el.dataset.countPrefix || '';
  const suffix = el.dataset.countSuffix || '';
  const decimals = parseInt(el.dataset.countDecimals || '0');
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = target * eased;

    if (decimals > 0) {
      el.textContent = prefix + current.toFixed(decimals) + suffix;
    } else {
      el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ─── Scroll Observers ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Section fade-in observer
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.fade-up, .fade-left, .fade-right, .stagger-children').forEach((el) => {
    sectionObserver.observe(el);
  });

  // Chart observer — init chart when container scrolls into view
  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const canvasId = entry.target.id;
          if (CHART_INIT_MAP[canvasId]) {
            CHART_INIT_MAP[canvasId]();
          }
          chartObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('canvas[id]').forEach((canvas) => {
    chartObserver.observe(canvas);
  });

  // Count-up observer
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCountUp(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-count-target]').forEach((el) => {
    countObserver.observe(el);
  });
});
