// savings-de.js
// Vergleich: aktuelles System (Verbrauch laut Rechnung) vs. neue Wärmepumpe + optional PV

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("savings-form");
  if (!form) return;

  const inputSystem           = document.getElementById("current-system");
  const inputConsumption      = document.getElementById("annual-consumption");
  const inputCurrentPrice     = document.getElementById("current-price");
  const inputPvShare          = document.getElementById("pv-share");

  const outCurrentCost        = document.getElementById("current-cost-display");
  const outHpCostGrid         = document.getElementById("hp-cost-grid-display");
  const outHpCostPv           = document.getElementById("hp-cost-pv-display");
  const outSavingsText        = document.getElementById("savings-amount");
  const outCaption            = document.getElementById("savings-caption");
  const pvShareValueLabel     = document.getElementById("pv-share-value");

  // Annahmen
  const etaBySystem = {
    gas: 0.9,              // Gasheizung
    oil: 0.85,             // Ölheizung
    "direct-electric": 1,  // Direktstrom
    "old-heat-pump": 2.2,  // alte WP, "effizienzähnlich"
    district: 0.95         // Fernwärme
  };

  const scopWp = 3.0;      // grobe Jahresarbeitszahl der neuen WP
  const hpElectricityPrice = 0.30; // €/kWh für WP-Strom (vereinfacht)

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

  // PV-Slider live aktualisieren
  if (inputPvShare && pvShareValueLabel) {
    pvShareValueLabel.textContent = inputPvShare.value;
    inputPvShare.addEventListener("input", () => {
      pvShareValueLabel.textContent = inputPvShare.value;
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const system         = inputSystem ? inputSystem.value : "gas";
    const consumption    = parseNumber(inputConsumption);  // kWh/Jahr lt. Rechnung
    const currentPrice   = parseNumber(inputCurrentPrice); // €/kWh
    const pvSharePercent = inputPvShare ? parseNumber(inputPvShare) : 0;

    if (!consumption || !currentPrice) {
      if (outCurrentCost) outCurrentCost.textContent = "—";
      if (outHpCostGrid)  outHpCostGrid.textContent  = "—";
      if (outHpCostPv)    outHpCostPv.textContent    = "—";
      if (outSavingsText) {
        outSavingsText.textContent =
          "Bitte Jahresverbrauch und aktuellen Energiepreis eingeben, um eine grobe Einschätzung zu erhalten.";
      }
      if (outCaption) {
        outCaption.textContent =
          "Die Berechnung ist eine vereinfachte Orientierung und ersetzt keine detaillierte Heizlast- und Wirtschaftlichkeitsberechnung.";
      }
      return;
    }

    // 1️⃣ Kosten aktuelles System
    const currentCost = consumption * currentPrice;

    // 2️⃣ Wärmebedarf des Gebäudes aus Verbrauch & typischem Wirkungsgrad
    let eta = etaBySystem[system];
    if (!eta) eta = 0.9; // Fallback

    let heatDemand = consumption * eta; // kWh Nutzwärme/Jahr

    if (!heatDemand || !isFinite(heatDemand)) {
      heatDemand = consumption; // absolute Notlösung
    }

    // 3️⃣ Strombedarf der neuen WP
    const hpConsumption = heatDemand / (scopWp || 3.0); // kWh/Jahr WP-Strom

    // 4️⃣ PV-Anteil: welcher Anteil des WP-Stroms kommt "gratis" von PV?
    let pvShare = 0;
    if (pvSharePercent && isFinite(pvSharePercent)) {
      pvShare = Math.min(Math.max(pvSharePercent, 0), 80) / 100; // 0–0,8
    }

    const hpCostGridOnly = hpConsumption * hpElectricityPrice;
    const hpCostWithPv   = hpCostGridOnly * (1 - pvShare); // PV-Anteil als 0 €/kWh

    const savings = currentCost - hpCostWithPv;

    if (outCurrentCost) outCurrentCost.textContent = formatEuro(currentCost);
    if (outHpCostGrid)  outHpCostGrid.textContent  = formatEuro(hpCostGridOnly);
    if (outHpCostPv)    outHpCostPv.textContent    = formatEuro(hpCostWithPv);

    if (!outSavingsText || !outCaption) return;

    if (savings > 0) {
      outSavingsText.textContent =
        `Geschätzte jährliche Ersparnis: ${formatEuro(savings)} gegenüber Ihrem aktuellen System.`;

      outCaption.textContent =
        `Wir gehen vereinfacht von einem typischen Wirkungsgrad Ihres aktuellen Systems von ca. ${(eta * 100).toFixed(0)} % und einer Jahresarbeitszahl der neuen Wärmepumpe von etwa ${scopWp} aus. ` +
        `Für den Wärmepumpenstrom rechnen wir mit ${hpElectricityPrice.toFixed(2)} €/kWh und setzen den PV-Anteil in diesem Modell mit 0 €/kWh an. Vor Ort prüfen wir Heizlast, Vorlauftemperaturen, Heizflächen, PV-Potenzial und Tarife im Detail.`;
    } else if (savings < 0) {
      outSavingsText.textContent =
        `Mit diesen Annahmen wäre die Wärmepumpe inkl. PV-Anteil etwa ${formatEuro(Math.abs(savings))} pro Jahr teurer im Betrieb.`;

      outCaption.textContent =
        "Das bedeutet nicht automatisch, dass eine Wärmepumpe unpassend ist. Über Systemanpassungen (niedrigere Vorlauftemperaturen, größere Heizflächen, höherer PV-Anteil, andere Tarife) kann sich das Bild deutlich verbessern – das klären wir gemeinsam im Vor-Ort-Termin.";
    } else {
      outSavingsText.textContent =
        "Mit diesen Annahmen liegen die jährlichen Kosten ungefähr gleich.";
      outCaption.textContent =
        "Schon kleine Änderungen bei Energiepreisen, Systemtemperaturen oder der Auslegung können das Ergebnis in die eine oder andere Richtung verschieben. Eine genaue Berechnung erstellen wir auf Basis Ihrer Gebäudedaten.";
    }
  });
});
