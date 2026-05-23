// filename: lib/seed_telemetry.js
// purpose: Seed Supabase database with realistic regional telemetry for satellite anomalies, demand signals, FAO benchmarks, and waste events.
// dependencies: @supabase/supabase-js, dotenv (or read from process.env)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://blzsyikioefpnigzagxn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsenN5aWtpb2VmcG5pZ3phZ3huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2MTkwMiwiZXhwIjoyMDk1MTM3OTAyfQ.MfnhoFrxIY7_zdRD_FXBL3v1xtcW1cCAtPwOYGAyVbo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log("Seeding telemetry data...");

  // 1. Seed loss_rate_coefficients
  const lossCoeffs = [
    {
      stage: "storage",
      commodity: "Grains",
      region: "South Asia Delta",
      country: "India",
      rate_pct: 14.5,
      source_study: "FAO Post-Harvest Grains Report 2024",
      confidence: "High",
      year: 2025,
      source_type: "published"
    },
    {
      stage: "storage",
      commodity: "Rice",
      region: "South Asia Delta",
      country: "India",
      rate_pct: 16.2,
      source_study: "FAO Post-Harvest Rice Loss Assessment 2024",
      confidence: "High",
      year: 2025,
      source_type: "published"
    },
    {
      stage: "farm/harvest",
      commodity: "Rice",
      region: "South Asia Delta",
      country: "India",
      rate_pct: 8.4,
      source_study: "Satellite Crop Harvest Loss Study 2025",
      confidence: "Medium",
      year: 2025,
      source_type: "satellite"
    },
    {
      stage: "storage",
      commodity: "Produce",
      region: "East Africa Corridor",
      country: "Kenya",
      rate_pct: 22.8,
      source_study: "UNEP Sub-Saharan Produce Logistics 2024",
      confidence: "High",
      year: 2024,
      source_type: "published"
    },
    {
      stage: "storage",
      commodity: "Maize",
      region: "East Africa Corridor",
      country: "Kenya",
      rate_pct: 18.5,
      source_study: "KARI East Africa Grain Storage Survey 2024",
      confidence: "High",
      year: 2024,
      source_type: "published"
    },
    {
      stage: "retail",
      commodity: "Dairy",
      region: "Latin America Sub-basin",
      country: "Brazil",
      rate_pct: 11.2,
      source_study: "Latin America Cold-Chain Logistics Review 2024",
      confidence: "Medium",
      year: 2025,
      source_type: "published"
    }
  ];

  console.log("Seeding loss coefficients...");
  const { error: errLoss } = await supabase.from('loss_rate_coefficients').upsert(lossCoeffs);
  if (errLoss) console.error("Error loss coefficients:", errLoss);
  else console.log("Loss coefficients seeded!");

  // 2. Seed satellite_anomalies
  const satelliteAnomalies = [
    {
      region: "South Asia Delta",
      commodity: "Rice",
      ndvi_score: 0.38,
      anomaly_zscore: -2.45,
      sensor: "Sentinel-2",
      affected_area_ha: 1420.5
    },
    {
      region: "South Asia Delta",
      commodity: "Grains",
      ndvi_score: 0.42,
      anomaly_zscore: -1.98,
      sensor: "Sentinel-2",
      affected_area_ha: 890.2
    },
    {
      region: "East Africa Corridor",
      commodity: "Maize",
      ndvi_score: 0.31,
      anomaly_zscore: -3.12,
      sensor: "PlanetScope",
      affected_area_ha: 2350.0
    },
    {
      region: "East Africa Corridor",
      commodity: "Produce",
      ndvi_score: 0.45,
      anomaly_zscore: -1.85,
      sensor: "Sentinel-2",
      affected_area_ha: 540.8
    },
    {
      region: "Latin America Sub-basin",
      commodity: "Avocado",
      ndvi_score: 0.52,
      anomaly_zscore: -2.15,
      sensor: "PlanetScope",
      affected_area_ha: 1120.4
    }
  ];

  console.log("Seeding satellite anomalies...");
  const { error: errSat } = await supabase.from('satellite_anomalies').upsert(satelliteAnomalies);
  if (errSat) console.error("Error satellite anomalies:", errSat);
  else console.log("Satellite anomalies seeded!");

  // 3. Seed demand_signals
  const today = new Date();
  const getPastDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const demandSignals = [
    {
      commodity: "Rice",
      region: "South Asia Delta",
      search_velocity_index: 48.2,
      week_start: getPastDateStr(1),
      source: "google_trends",
      pct_change_wow: -34.5
    },
    {
      commodity: "Rice",
      region: "South Asia Delta",
      search_velocity_index: 73.6,
      week_start: getPastDateStr(8),
      source: "google_trends",
      pct_change_wow: -2.1
    },
    {
      commodity: "Grains",
      region: "South Asia Delta",
      search_velocity_index: 52.4,
      week_start: getPastDateStr(1),
      source: "google_trends",
      pct_change_wow: -28.0
    },
    {
      commodity: "Maize",
      region: "East Africa Corridor",
      search_velocity_index: 39.5,
      week_start: getPastDateStr(1),
      source: "google_trends",
      pct_change_wow: -31.2
    },
    {
      commodity: "Produce",
      region: "East Africa Corridor",
      search_velocity_index: 58.0,
      week_start: getPastDateStr(1),
      source: "google_trends",
      pct_change_wow: -18.5
    },
    {
      commodity: "Dairy",
      region: "Latin America Sub-basin",
      search_velocity_index: 64.2,
      week_start: getPastDateStr(1),
      source: "google_trends",
      pct_change_wow: -22.4
    }
  ];

  console.log("Seeding demand signals...");
  const { error: errDem } = await supabase.from('demand_signals').upsert(demandSignals);
  if (errDem) console.error("Error demand signals:", errDem);
  else console.log("Demand signals seeded!");

  // 4. Seed waste_events
  const wasteEvents = [
    {
      stage: "storage",
      category: "Grains",
      quantity_tonnes: 4.2,
      region: "South Asia Delta",
      country: "India",
      source: "local_monitoring",
      operator_id: "00000000-0000-0000-0000-000000000000"
    },
    {
      stage: "storage",
      category: "Rice",
      quantity_tonnes: 8.5,
      region: "South Asia Delta",
      country: "India",
      source: "warehouse_rejection",
      operator_id: "00000000-0000-0000-0000-000000000000"
    },
    {
      stage: "farm/harvest",
      category: "Maize",
      quantity_tonnes: 12.4,
      region: "East Africa Corridor",
      country: "Kenya",
      source: "harvest_failure_log",
      operator_id: "00000000-0000-0000-0000-000000000000"
    },
    {
      stage: "retail",
      category: "Dairy",
      quantity_tonnes: 3.1,
      region: "Latin America Sub-basin",
      country: "Brazil",
      source: "supermarket_dumpster_log",
      operator_id: "00000000-0000-0000-0000-000000000000"
    }
  ];

  console.log("Seeding waste events...");
  const { error: errW } = await supabase.from('waste_events').upsert(wasteEvents);
  if (errW) console.error("Error waste events:", errW);
  else console.log("Waste events seeded!");

  console.log("All telemetry seeded successfully!");
}

seed();
