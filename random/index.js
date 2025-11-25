// --- Imports ---
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import "dotenv/config"; // Loads .env variables

// --- 💡 1. SCRIPT CONFIGURATION ---
const ALGO_NAME = "TotallyRandom"; // Changed algorithm name
const DELAY_BETWEEN_RUNS_MS = 5000; // 5-second polite delay

const apiToken = process.env.API_TOKEN;
if (!apiToken) {
  console.error("Aw, geez! API_TOKEN is missing. Create a .env file.");
  process.exit(1);
}

// --- API Client ---
const api = axios.create({
  baseURL: "https://challenge.sphinxhq.com/api",
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
});

// --- API Functions (Unchanged) ---
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

// --- 💡 2. CORE ALGORITHM (Modified to be Totally Random) ---
async function runChallenge(runNumber) {
  console.log(
    `\n======================================================\n` +
      `   Starting Run ${runNumber} for ${ALGO_NAME}   \n` +
      `======================================================`
  );
  let status = await startEpisode();
  let tripNumber = 0;

  const tripData = [];

  // --- State Variables (Removed) ---

  while (status.morties_in_citadel > 0) {
    // --- 💡 1. CHOOSE RANDOMLY ---
    // Choose a random planet (0, 1, or 2)
    const targetPlanet = Math.floor(Math.random() * 3);
    // Choose a random Morty count (1, 2, or 3)
    const mortysToSend = Math.floor(Math.random() * 3) + 1;

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

    console.log(
      `Trip ${tripNumber} (Run ${runNumber}): [RANDOM] Sent ${result.morties_sent} to P${targetPlanet}. Survived: ${survived}. [Citadel: ${result.morties_in_citadel}]`
    );

    // --- 4. "Hot Streak" logic has been removed ---
  } // End while loop

  console.log(`Run ${runNumber}: All Mortys have left the Citadel!`);

  // --- 💡 5. GET FINAL SCORE AND PREPARE JSON STRUCTURE ---
  const finalStatus = await getEpisodeStatus();
  const successPercentage =
    (finalStatus.morties_on_planet_jessica / 1000) * 100;

  console.log(
    `Run ${runNumber} Final Score: ${
      finalStatus.morties_on_planet_jessica
    } (${successPercentage.toFixed(2)}%)`
  );

  const outputData = {
    run_number: runNumber,
    algo_name: ALGO_NAME,
    strategy_params: {
      strategy: "totally_random", // Updated params
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

  // Create new filename including the run number
  const filename = `${ALGO_NAME}_Run_${runNumber}_${timestamp}.json`;
  const filepath = path.join(dataFolder, filename);

  await fs.writeFile(filepath, JSON.stringify(outputData, null, 2));
  console.log(`Run ${runNumber} data saved to ${filepath}`);
}

// --- 💡 7. MAIN INDEFINITE LOOP (Unchanged) ---
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
      // Wait 5 seconds before starting the next run
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
      // Wait 30 seconds after a failure
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }
}

// Run the main indefinite loop
main();
