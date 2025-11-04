import axios from "axios";
import fs from "fs/promises";
import path from "path";

const apiToken = "92796bf7de2afc9f6c6eb9553add3f0b3a9e93ad";

const api = axios.create({
  baseURL: "https://challenge.sphinxhq.com/api",
  headers: {
    Authorization: `Bearer ${apiToken}`,
  },
});

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

  console.log("Episode status:", response.data);

  return response.data;
}

// script execution

console.log("Starting episode...");

await startEpisode();

let totalMortys = 1000;
let mortysToSend;
let tripNumber = 0;
const tripData = [];
let targetPlanet = 0;
let exploringPlanet = true;
let currentRun = 0;
while (totalMortys > 0) {
  if (exploringPlanet) {
    mortysToSend = Math.min(1, totalMortys);
  } else {
    mortysToSend = Math.min(3, totalMortys);
  }

  tripNumber++;

  // if last 4 trips were 1 or we hit a zero we change to next planet
  const result = await sendMortys(targetPlanet, mortysToSend);

  // Calculate survival rate for this trip
  const mortysSent = result.morties_sent;
  const survived = result.survived;
  const survivalRate = survived ? 100 : 0;

  const tripInfo = {
    trip_number: tripNumber,
    planet: targetPlanet,
    mortys_sent: mortysSent,
    survived: survived,
    survival_rate_percentage: survivalRate,
    mortys_in_citadel: result.morties_in_citadel,
    mortys_on_planet_jessica: result.morties_on_planet_jessica,
    mortys_lost: result.morties_lost,
    steps_taken: result.steps_taken,
  };

  tripData.push(tripInfo);

  totalMortys -= mortysToSend;

  console.log(
    `Trip ${tripNumber}: ${mortysToSend} Mortys sent to Planet ${targetPlanet}, Survival: ${survivalRate}%, ${totalMortys} remaining...`
  );

  if (survived == 1 && currentRun < 15) {
    exploringPlanet = false;
    currentRun++;
  } else {
    currentRun = 0;
    exploringPlanet = true;
    targetPlanet = (targetPlanet + 1) % 3;
  }
}

// Create data folder if it doesn't exist
const dataFolder = "data";
await fs.mkdir(dataFolder, { recursive: true });

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filename = `trip_data_${timestamp}.json`;
const filepath = path.join(dataFolder, filename);

// Save to JSON file with timestamp
await fs.writeFile(filepath, JSON.stringify(tripData, null, 2));
console.log(`Trip data saved to ${filepath} (${tripData.length} trips)`);

console.log("Final episode status...");

await getEpisodeStatus();
