/* ============================================
   SP500 DEMO — Client-Side Simulation Engine
   Ports the Flask app logic to pure browser JS.
   Data loaded from /data/sp500_demo.json
   ============================================ */
(function () {
  "use strict";

  let DATA = null;
  let simResults = null;

  const $ = (id) => document.getElementById(id);

  function fmtMoney(x) {
    return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function fmtPct(x) {
    return x.toFixed(4);
  }

  // --- Weight computation strategies ---

  function mlWeights(riskProbs, mom20d, riskCap) {
    const n = riskProbs.length;
    const riskAdj = riskProbs.map((p) => Math.max(riskCap - p, 0) / riskCap);
    const momPos = mom20d.map((m) => Math.max(m, 0));
    const scores = riskAdj.map((r, i) => r * momPos[i]);
    const sum = scores.reduce((a, b) => a + b, 0);
    if (sum <= 0) return new Array(n).fill(1 / n);
    return scores.map((s) => s / sum);
  }

  function momentumWeights(mom20d) {
    const n = mom20d.length;
    const momPos = mom20d.map((m) => Math.max(m, 0));
    const sum = momPos.reduce((a, b) => a + b, 0);
    if (sum <= 0) return new Array(n).fill(1 / n);
    return momPos.map((m) => m / sum);
  }

  function equalWeights(n) {
    return new Array(n).fill(1 / n);
  }

  // --- Risk stats ---

  function computeRiskStats(weeklyValues) {
    if (weeklyValues.length < 2) {
      return { volatility_pct: 0, max_drawdown_pct: 0, return_per_risk: null };
    }
    const rets = [];
    for (let i = 1; i < weeklyValues.length; i++) {
      rets.push(weeklyValues[i] / weeklyValues[i - 1] - 1);
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const vol = Math.sqrt(
      rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length
    );

    let peak = weeklyValues[0];
    let maxDD = 0;
    for (const v of weeklyValues) {
      if (v > peak) peak = v;
      const dd = v / peak - 1;
      if (dd < maxDD) maxDD = dd;
    }

    const totalRet = weeklyValues[weeklyValues.length - 1] / weeklyValues[0] - 1;
    const retPerRisk = vol > 0 ? totalRet / vol : null;

    return {
      volatility_pct: +(vol * 100).toFixed(4),
      max_drawdown_pct: +(maxDD * 100).toFixed(4),
      return_per_risk: retPerRisk !== null ? +retPerRisk.toFixed(4) : null,
    };
  }

  // --- Full simulation ---

  function runSimulation(initialValue, costRate) {
    const strategies = ["ML", "MOMENTUM", "EQUAL"];
    const portfolioValues = {};
    const prevWeights = {};
    const totalTurnover = {};
    const finalWeightsData = {};

    strategies.forEach((s) => {
      portfolioValues[s] = [initialValue];
      prevWeights[s] = null;
      totalTurnover[s] = 0;
      finalWeightsData[s] = null;
    });

    const periods = DATA.periods;

    for (let k = 0; k < periods.length; k++) {
      const p = periods[k];
      const n = p.tickers.length;

      const wML = mlWeights(p.riskProbs, p.mom20d, DATA.riskCap);
      const wMom = momentumWeights(p.mom20d);
      const wEq = equalWeights(n);

      const weightsNow = { ML: wML, MOMENTUM: wMom, EQUAL: wEq };

      strategies.forEach((s) => {
        const wNew = weightsNow[s];
        let wPrev = prevWeights[s];
        if (!wPrev) wPrev = new Array(n).fill(1 / n);

        let turnover = 0;
        for (let i = 0; i < n; i++) turnover += Math.abs(wNew[i] - wPrev[i]);
        totalTurnover[s] += turnover;

        let grossR = 0;
        for (let i = 0; i < n; i++) grossR += wNew[i] * (p.returns[i] || 0);
        const cost = costRate * turnover;
        const netR = grossR - cost;

        const prevVal = portfolioValues[s][portfolioValues[s].length - 1];
        portfolioValues[s].push(prevVal * (1 + netR));

        prevWeights[s] = wNew;

        if (k === periods.length - 1) {
          finalWeightsData[s] = { tickers: p.tickers, names: p.names, weights: wNew };
        }
      });
    }

    const out = {};
    strategies.forEach((s) => {
      const vals = portfolioValues[s];
      const finalVal = vals[vals.length - 1];
      const netRet = finalVal / initialValue - 1;
      const netProfit = finalVal - initialValue;

      const fw = finalWeightsData[s];
      const finalWeights = fw.tickers.map((t, i) => ({
        ticker: t,
        name: fw.names[i],
        weight_pct: +(fw.weights[i] * 100).toFixed(4),
        capital: +(fw.weights[i] * finalVal).toFixed(2),
      }));

      out[s] = {
        final_net_value: +finalVal.toFixed(2),
        net_return_pct: +(netRet * 100).toFixed(4),
        net_profit: +netProfit.toFixed(2),
        total_turnover: +totalTurnover[s].toFixed(4),
        final_weights: finalWeights,
        weekly_values: vals,
        risk_stats: computeRiskStats(vals),
      };
    });

    return out;
  }

  // --- UI helpers ---

  function renderMetrics(containerId, metrics) {
    const el = $(containerId);
    el.innerHTML = metrics
      .map(
        (m) =>
          `<div class="demo-metric"><span class="demo-metric__label">${m.label}</span><span class="demo-metric__value">${m.value}</span></div>`
      )
      .join("");
  }

  function renderTable(tbodyId, rows) {
    const tbody = $(tbodyId);
    tbody.innerHTML = rows
      .map(
        (r) =>
          `<tr><td>${r.ticker}</td><td>${r.name}</td><td>${fmtPct(r.weight_pct)}</td><td>$${fmtMoney(r.capital)}</td></tr>`
      )
      .join("");
  }

  function renderCelebrate(elId, profit, strategyName) {
    const el = $(elId);
    if (profit >= 0) {
      el.textContent = `${strategyName}: +$${fmtMoney(profit)} in June 2025`;
      el.className = "demo-celebrate demo-celebrate--up";
    } else {
      el.textContent = `${strategyName}: -$${fmtMoney(Math.abs(profit))} in June 2025`;
      el.className = "demo-celebrate demo-celebrate--down";
    }
  }

  function clearResults() {
    ["demoMLSection", "demoMomSection", "demoEqSection"].forEach(
      (id) => ($(id).style.display = "none")
    );
    simResults = null;
  }

  // --- Load data ---

  async function loadData() {
    const resp = await fetch("/data/sp500_demo.json");
    DATA = await resp.json();
  }

  // --- Event handlers ---

  function onLoad() {
    const initialValue = parseFloat($("demoInitial").value) || 1000000;
    const period0 = DATA.periods[0];
    const n = period0.tickers.length;

    const wML = mlWeights(period0.riskProbs, period0.mom20d, DATA.riskCap);
    let displayWeights;

    if ($("demoRandomize").checked) {
      const rands = Array.from({ length: n }, () => Math.random());
      const rSum = rands.reduce((a, b) => a + b, 0);
      displayWeights = period0.tickers.map((t, i) => ({
        ticker: t,
        name: period0.names[i],
        weight_pct: +((rands[i] / rSum) * 100).toFixed(4),
        capital: +((rands[i] / rSum) * initialValue).toFixed(2),
      }));
    } else {
      displayWeights = period0.tickers.map((t, i) => ({
        ticker: t,
        name: period0.names[i],
        weight_pct: +(wML[i] * 100).toFixed(4),
        capital: +(wML[i] * initialValue).toFixed(2),
      }));
    }

    renderTable("demoInitBody", displayWeights);
    $("demoInitInfo").textContent = `Date: ${period0.t0} · Value: $${fmtMoney(initialValue)} · Universe: ${n} stocks`;
    $("demoInitSection").style.display = "";
    $("demoSimBtn").disabled = false;

    clearResults();
  }

  function onSimulate() {
    const initialValue = parseFloat($("demoInitial").value) || 1000000;
    const tcPct = parseFloat($("demoCost").value) || 0.1;
    const costRate = tcPct / 100;

    clearResults();
    simResults = runSimulation(initialValue, costRate);

    const ml = simResults.ML;

    // ML metrics
    renderMetrics("demoMLMetrics", [
      { label: "Initial Value", value: "$" + fmtMoney(initialValue) },
      { label: "Final Net Value", value: "$" + fmtMoney(ml.final_net_value) },
      { label: "Net Return (%)", value: ml.net_return_pct.toFixed(4) + "%" },
      { label: "Net Return ($)", value: "$" + fmtMoney(ml.net_profit) },
    ]);
    renderCelebrate("demoMLCelebrate", ml.net_profit, "ML Risk-Adjusted");

    // Risk comparison
    const mlR = ml.risk_stats;
    const momR = simResults.MOMENTUM.risk_stats;
    renderMetrics("demoRiskMetrics", [
      { label: "ML Volatility", value: (mlR.volatility_pct || 0).toFixed(4) + "%" },
      { label: "Momentum Volatility", value: (momR.volatility_pct || 0).toFixed(4) + "%" },
      { label: "ML Max Drawdown", value: (mlR.max_drawdown_pct || 0).toFixed(4) + "%" },
      { label: "Momentum Max Drawdown", value: (momR.max_drawdown_pct || 0).toFixed(4) + "%" },
      { label: "ML Return/Risk", value: mlR.return_per_risk !== null ? mlR.return_per_risk.toFixed(2) : "N/A" },
      { label: "Momentum Return/Risk", value: momR.return_per_risk !== null ? momR.return_per_risk.toFixed(2) : "N/A" },
    ]);

    renderTable("demoMLBody", ml.final_weights);
    $("demoMLSection").style.display = "";
    $("demoCompareMom").disabled = false;
    $("demoCmpEq").disabled = false;
  }

  function onCompareMom() {
    if (!simResults) return;
    const mom = simResults.MOMENTUM;
    const iv = parseFloat($("demoInitial").value) || 1000000;

    renderMetrics("demoMomMetrics", [
      { label: "Initial Value", value: "$" + fmtMoney(iv) },
      { label: "Final Net Value", value: "$" + fmtMoney(mom.final_net_value) },
      { label: "Net Return (%)", value: mom.net_return_pct.toFixed(4) + "%" },
      { label: "Net Return ($)", value: "$" + fmtMoney(mom.net_profit) },
    ]);
    renderCelebrate("demoMomCelebrate", mom.net_profit, "Momentum");
    renderTable("demoMomBody", mom.final_weights);
    $("demoMomSection").style.display = "";
  }

  function onCompareEq() {
    if (!simResults) return;
    const eq = simResults.EQUAL;
    const iv = parseFloat($("demoInitial").value) || 1000000;

    renderMetrics("demoEqMetrics", [
      { label: "Initial Value", value: "$" + fmtMoney(iv) },
      { label: "Final Net Value", value: "$" + fmtMoney(eq.final_net_value) },
      { label: "Net Return (%)", value: eq.net_return_pct.toFixed(4) + "%" },
      { label: "Net Return ($)", value: "$" + fmtMoney(eq.net_profit) },
    ]);
    renderCelebrate("demoEqCelebrate", eq.net_profit, "Equal-Weight");
    renderTable("demoEqBody", eq.final_weights);
    $("demoEqSection").style.display = "";
  }

  // --- Search ---

  function onSearch() {
    const q = $("demoSearch").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#demoInitBody tr");
    rows.forEach((row) => {
      const ticker = row.children[0].textContent.toLowerCase();
      const name = row.children[1].textContent.toLowerCase();
      if (q && (ticker.includes(q) || name.includes(q))) {
        row.classList.add("demo-highlight");
      } else {
        row.classList.remove("demo-highlight");
      }
    });
  }

  // --- Init ---

  async function init() {
    await loadData();
    $("demoLoadBtn").addEventListener("click", onLoad);
    $("demoSimBtn").addEventListener("click", onSimulate);
    $("demoCompareMom").addEventListener("click", onCompareMom);
    $("demoCmpEq").addEventListener("click", onCompareEq);
    $("demoSearch").addEventListener("input", onSearch);
  }

  init();
})();
