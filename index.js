// --- Imports ---
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

const apiToken = process.env.API_TOKEN;

if (!apiToken) {
  console.error("Aw, geez! API_TOKEN is missing. Create a .env file.");
  process.exit(1);
}

// --- Strategy Constants ---
const ROLLING_WINDOW_SIZE = 20; // How many recent trips to average
const PROBE_TRIPS_PER_PLANET = 20; // Must match window size
const TOTAL_PROBE_TRIPS = PROBE_TRIPS_PER_PLANET * 3; // 90 total probe trips
const EPSILON = 0.4; // 40% chance to explore, 60% chance to exploit

// --- API Client ---
const api = axios.create({
  baseURL: "https://challenge.sphinxhq.com/api",
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
});

// --- API Functions ---
async function startEpisode() {
  const response = await api.post("/mortys/start/", null, {});
  console.log("Episode started:", response.data);
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
  console.log("Final episode status:", response.data);
  return response.data;
}

// --- Main Script Execution ---
async function runChallenge() {
  console.log("Starting episode...");
  let status = await startEpisode();

  let tripNumber = 0;
  let targetPlanet = 0; // Start with Planet 0
  let mortysToSend = 1; // Start with 1 for probing

  const tripData = [];
  const planet0trips = [];
  const planet1trips = [];
  const planet2trips = [];

  while (status.morties_in_citadel > 0) {
    // 1. Make sure we don't send more Mortys than we have
    const currentMortyCount = Math.min(mortysToSend, status.morties_in_citadel);

    // 2. Send the Mortys
    const result = await sendMortys(targetPlanet, currentMortyCount);
    status = result; // The API result is our new, true status
    tripNumber++;

    // 3. Log data from this trip
    const { survived } = result;
    const tripInfo = {
      trip_number: tripNumber,
      planet: targetPlanet,
      mortys_sent: result.morties_sent,
      survived: survived,
      survival_rate_percentage: survived ? 100 : 0,
      mortys_in_citadel: result.morties_in_citadel,
      mortys_on_planet_jessica: result.morties_on_planet_jessica,
      mortys_lost: result.morties_lost,
      steps_taken: result.steps_taken,
    };
    tripData.push(tripInfo);

    console.log(
      `Trip ${tripNumber}: Sent ${result.morties_sent} to P${targetPlanet}. Survived: ${survived}. [Citadel: ${result.morties_in_citadel}, Jessica: ${result.morties_on_planet_jessica}]`
    );

    // 4. Update the rolling average array for the planet we just visited
    if (targetPlanet === 0) {
      if (planet0trips.length >= ROLLING_WINDOW_SIZE) planet0trips.shift();
      planet0trips.push(survived);
    } else if (targetPlanet === 1) {
      if (planet1trips.length >= ROLLING_WINDOW_SIZE) planet1trips.shift();
      planet1trips.push(survived);
    } else if (targetPlanet === 2) {
      if (planet2trips.length >= ROLLING_WINDOW_SIZE) planet2trips.shift();
      planet2trips.push(survived);
    }

    // 5. Decide parameters for the *NEXT* trip
    if (tripNumber < TOTAL_PROBE_TRIPS) {
      // --- PHASE 1: INITIAL PROBE ---
      // We cycle through the planets to build our first average
      targetPlanet = tripNumber % 3; // e.g., 1%3=1, 2%3=2, 3%3=0
      mortysToSend = 1;
    } else {
      // --- 💡 UPGRADE 3: EPSILON-GREEDY STRATEGY ---
      // This is the most important fix!

      // Calculate fresh survival rates
      // (Use Math.max(1, arr.length) to avoid divide-by-zero errors)
      const survivalRate0 =
        (planet0trips.filter(Boolean).length /
          Math.max(1, planet0trips.length)) *
        100;
      const survivalRate1 =
        (planet1trips.filter(Boolean).length /
          Math.max(1, planet1trips.length)) *
        100;
      const survivalRate2 =
        (planet2trips.filter(Boolean).length /
          Math.max(1, planet2trips.length)) *
        100;

      if (tripNumber % 10 === 0) {
        // Log rates every 10 trips
        console.log(
          `Rates - P0: ${survivalRate0.toFixed(
            1
          )}%, P1: ${survivalRate1.toFixed(1)}%, P2: ${survivalRate2.toFixed(
            1
          )}%`
        );
      }

      if (Math.random() < EPSILON) {
        // 10% of the time: EXPLORE
        // Send a 1-Morty probe to a *random* planet
        console.log("...Exploring random planet...");
        targetPlanet = Math.floor(Math.random() * 3);
        mortysToSend = 1;
      } else {
        // 90% of the time: EXPLOIT
        // Send a 3-Morty group to the *best* planet
        console.log("...Exploiting best planet...");
        if (survivalRate0 >= survivalRate1 && survivalRate0 >= survivalRate2) {
          targetPlanet = 0;
        } else if (
          survivalRate1 >= survivalRate0 &&
          survivalRate1 >= survivalRate2
        ) {
          targetPlanet = 1;
        } else {
          targetPlanet = 2;
        }
        mortysToSend = 3;
      }
    }
  } // End while loop

  console.log("All Mortys have left the Citadel!");

  // --- Save Data (Unchanged, this was good) ---
  const dataFolder = "data";
  await fs.mkdir(dataFolder, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `trip_data_${timestamp}.json`;
  const filepath = path.join(dataFolder, filename);

  await fs.writeFile(filepath, JSON.stringify(tripData, null, 2));
  console.log(`Trip data saved to ${filepath} (${tripData.length} trips)`);

  // --- Get Final Score ---
  await getEpisodeStatus();
}

// Run the script
runChallenge().catch((err) => {
  console.error("Aw, geez, a critical error!", err.message);
  if (err.response) {
    console.error("API Error Data:", err.response.data);
  }
});
