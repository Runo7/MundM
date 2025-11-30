// savings.js
// Simple online check: current heating system vs. modern heat pump + optional PV

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("savings-form");
  if (!form) return;

  const systemSelect = document.getElementById("current-system");
  const annualInput = document.getElementById("annual-consumption");
  const priceInput = document.getElementById("current-price");

  const pvSlider = document.getElementById("pv-share");
  const pvShareValue = document.getElementById("pv-share-value");

  const currentCostDisplay = document.getElementById("current-cost-display");
  const hpCostGridDisplay = document.getElementById("hp-cost-grid-display");
  const hpCostPvDisplay = document.getElementById("hp-cost-pv-display");

  const savingsAmount = document.getElementById("savings-amount");
  const savingsCaption = document.getElementById("savings-caption");

  // Assumptions
  const HP_ELECTRICITY_PRICE = 0.30; // €/kWh for heat pump tariff
  const SCOP_HP = 3.0;               // seasonal efficiency of modern HP

  // Approximate efficiencies for current systems
  const systemEfficiencies = {
    gas: 0.9,             // 90% boiler efficiency
    oil: 0.87,
    "direct-electric": 1, // 1 kWh electricity ≈ 1 kWh heat
    district: 1,          // billed as heat
    "old-heat-pump": 2.5  // seasonal COP of old HP
  };

  function parseNumber(input) {
    if (!input) return 0;
    const raw = (input.value || "").toString().replace(",", ".");
    const value = parseFloat(raw);
    return isNaN(value) ? 0 : value;
  }

  function formatEuro(value) {
    if (!isFinite(value)) return "—";
    return value.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    });
  }

  // Update PV label when slider moves
  if (pvSlider && pvShareValue) {
    pvSlider.addEventListener("input", () => {
      pvShareValue.textContent = pvSlider.value;
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const system = systemSelect ? systemSelect.value : "gas";
    const annualConsumption = parseNumber(annualInput); // kWh of current system per year
    const currentPrice = parseNumber(priceInput);       // €/kWh of current system
    const pvSharePercent = pvSlider ? parseFloat(pvSlider.value) || 0 : 0;
    const pvShare = Math.min(Math.max(pvSharePercent, 0), 100) / 100; // 0–1

    // Basic validation
    if (!annualConsumption || !currentPrice) {
      if (currentCostDisplay) currentCostDisplay.textContent = "—";
      if (hpCostGridDisplay) hpCostGridDisplay.textContent = "—";
      if (hpCostPvDisplay) hpCostPvDisplay.textContent = "—";
      if (savingsAmount) {
        savingsAmount.textContent =
          "Please fill in all fields to see an estimate.";
      }
      if (savingsCaption) {
        savingsCaption.textContent =
          "This tool is a simplified orientation and does not replace a detailed on-site calculation.";
      }
      return;
    }

    // 1️⃣ Current system: yearly running cost directly from bill
    const currentCost = annualConsumption * currentPrice;

    // 2️⃣ Estimate building heat demand from current system
    let heatDemand;
    const eff = systemEfficiencies[system];

    if (system === "old-heat-pump") {
      // User already pays for electricity -> delivered heat ≈ consumption * COP
      heatDemand = annualConsumption * (eff || 2.5);
    } else if (eff) {
      // e.g. gas, oil
      heatDemand = annualConsumption * eff;
    } else {
      // Fallback
      heatDemand = annualConsumption;
    }

    if (!heatDemand || !isFinite(heatDemand)) {
      heatDemand = annualConsumption;
    }

    // 3️⃣ New heat pump: electricity demand
    const hpElectricity = heatDemand / SCOP_HP; // kWh/year electricity for HP

    // a) Without PV: all electricity from grid
    const hpCostGrid = hpElectricity * HP_ELECTRICITY_PRICE;

    // b) With PV share: only part from grid, PV share assumed "free" in this simple model
    const hpElectricityGrid = hpElectricity * (1 - pvShare);
    const hpCostWithPv = hpElectricityGrid * HP_ELECTRICITY_PRICE;

    // 4️⃣ Savings
    const savingsWithPv = currentCost - hpCostWithPv;

    // Output costs
    if (currentCostDisplay) {
      currentCostDisplay.textContent = formatEuro(currentCost);
    }
    if (hpCostGridDisplay) {
      hpCostGridDisplay.textContent = formatEuro(hpCostGrid);
    }
    if (hpCostPvDisplay) {
      hpCostPvDisplay.textContent = formatEuro(hpCostWithPv);
    }

    if (!savingsAmount || !savingsCaption) return;

    if (savingsWithPv > 0) {
      savingsAmount.textContent =
        `Estimated yearly saving with heat pump and PV share: ${formatEuro(
          savingsWithPv
        )}`;
      savingsCaption.textContent =
        `We assume a boiler efficiency of around ${
          (systemEfficiencies[system] || 1) * 100
        }% for your current system and a seasonal efficiency (SCOP) of ${SCOP_HP} for the new heat pump. ` +
        `For the heat pump we use an electricity price of ${HP_ELECTRICITY_PRICE.toFixed(
          2
        )} €/kWh and treat the PV share of ${pvSharePercent}% as 0 €/kWh in this simplified model.`;
    } else if (savingsWithPv < 0) {
      savingsAmount.textContent =
        `With these assumptions, the heat pump + PV setup would be about ${formatEuro(
          Math.abs(savingsWithPv)
        )} per year more expensive in operation.`;
      savingsCaption.textContent =
        "This does not automatically mean a heat pump is a bad fit. Lower flow temperatures, larger radiators or a different tariff/ PV setup can change the result significantly. We go through the details together on site.";
    } else {
      savingsAmount.textContent =
        "With these assumptions, yearly running costs are roughly the same.";
      savingsCaption.textContent =
        "Small changes in prices, temperatures or PV share can move the result in either direction. We provide a detailed calculation for your specific property on request.";
    }
  });
});
