// --- Imports ---
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import "dotenv/config"; // Loads .env variables

// --- 💡 1. SCRIPT CONFIGURATION ---
const ALGO_NAME = "ProbeCycle_12"; // 💡 New Algorithm Name
const DELAY_BETWEEN_RUNS_MS = 5000;

const apiToken = process.env.API_TOKEN;
if (!apiToken) {
  console.error("Aw, geez! API_TOKEN is missing. Create a .env file.");
  process.exit(1);
}

// --- 💡 2. Strategy Constants ---
const TRIPS_PER_PLANET = 12; // How many trips before switching
const MORTY_COUNT_PER_TRIP = 1; // Always send 1

// --- API Client (Unchanged) ---
const api = axios.create({
  baseURL: "https://challenge.sphinxhq.com/api",
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
});
async function startEpisode() {
  const response = await api.post("/mortys/start/", null, {});
  return response.data;
}
async function sendMortys(planet, morty_count) {
  const response = await api.post(
    "/mortys/portal/",
    { planet, morty_count },
    {}
  );
  return response.data;
}
async function getEpisodeStatus() {
  const response = await api.get("/mortys/status/");
  return response.data;
}

// --- 💡 3. CORE ALGORITHM (Probe Cycle) ---
async function runChallenge(runNumber) {
  console.log(
    `\n======================================================\n` +
      `   Starting Run ${runNumber} for ${ALGO_NAME} (12-Trip Cycle) \n` +
      `======================================================`
  );
  let status = await startEpisode();
  let tripNumber = 0;
  const tripData = [];

  // --- State Variables ---
  let targetPlanet = 0; // Start at Planet 0
  let tripsToCurrentPlanet = 0; // Counter for the 12 trips

  while (status.morties_in_citadel > 0) {
    // 1. Determine Mortys to send
    const mortysToSend = MORTY_COUNT_PER_TRIP;
    const currentMortyCount = Math.min(mortysToSend, status.morties_in_citadel);

    // 2. Send the Mortys
    const result = await sendMortys(targetPlanet, currentMortyCount);
    status = result;
    tripNumber++;
    const { survived } = result;

    // 3. Log data
    const tripInfo = {
      trip_number: tripNumber,
      planet: targetPlanet,
      mortys_sent: result.morties_sent,
      survived: survived,
      morties_in_citadel: result.morties_in_citadel,
      morties_on_planet_jessica: result.morties_on_planet_jessica,
      morties_lost: result.morties_lost,
      steps_taken: result.steps_taken,
    };
    tripData.push(tripInfo);

    if (tripNumber % 25 == 0) {
      // Log every 25 trips
      console.log(
        `Trip ${tripNumber} (Run ${runNumber}): [PROBE CYCLE] Sent ${result.morties_sent} to P${targetPlanet}. Survived: ${survived}. [Citadel: ${result.morties_in_citadel}]`
      );
    }

    // --- 4. The "Probe Cycle" Logic ---
    tripsToCurrentPlanet++; // Add to our 12-trip counter

    // Check if we've completed the 12 trips for this planet
    if (tripsToCurrentPlanet >= TRIPS_PER_PLANET) {
      console.log(
        `*** (Trip ${tripNumber}) Completed ${TRIPS_PER_PLANET} trips to P${targetPlanet}. Cycling to next planet. ***`
      );
      // Reset counter
      tripsToCurrentPlanet = 0;
      // Move to next planet (0 -> 1 -> 2 -> 0)
      targetPlanet = (targetPlanet + 1) % 3;
    }
  } // End while loop

  console.log(`Run ${runNumber}: All Mortys have left the Citadel!`);

  // --- 5. GET FINAL SCORE AND PREPARE JSON STRUCTURE ---
  const finalStatus = await getEpisodeStatus();
  const successPercentage =
    (finalStatus.morties_on_planet_jessica / 1000) * 100;

  console.log(
    `\n--- Run ${runNumber} COMPLETE --- \n` +
      `Final Score: ${finalStatus.morties_on_planet_jessica} \n` +
      `Success Rate: ${successPercentage.toFixed(2)}% \n` +
      "-------------------------\n"
  );

  const outputData = {
    run_number: runNumber,
    algo_name: ALGO_NAME,
    strategy_params: {
      trips_per_planet: TRIPS_PER_PLANET,
      morty_count: MORTY_COUNT_PER_TRIP,
    },
    success_percentage: successPercentage,
    final_score: finalStatus.morties_on_planet_jessica,
    morties_lost: finalStatus.morties_lost,
    total_trips: tripData.length,
    trip_data: tripData,
  };

  // --- 6. SAVE FILE WITH NEW FILENAME ---
  const dataFolder = "data";
  await fs.mkdir(dataFolder, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const filename = `${ALGO_NAME}_Run_${runNumber}_${timestamp}.json`;
  const filepath = path.join(dataFolder, filename);

  await fs.writeFile(filepath, JSON.stringify(outputData, null, 2));
  console.log(`Run ${runNumber} data saved to ${filepath}`);
}

// --- 7. MAIN INDEFINITE LOOP ---
async function main() {
  let runCounter = 1;
  while (true) {
    try {
      await runChallenge(runCounter);
      runCounter++;
      console.log(
        `\nRun complete. Waiting ${
          DELAY_BETWEEN_RUNS_MS / 1000
        } seconds before next run...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_RUNS_MS)
      );
    } catch (err) {
      console.error(
        `!!! (Run ${runCounter}) FAILED: ${err.message}. Retrying in 30s...`
      );
      if (err.response) {
        console.error("API Error Data:", err.response.data);
      }
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }
}

// Run the main indefinite loop
main();
