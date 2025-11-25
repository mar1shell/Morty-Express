# 🚀 Morty Express Challenge - Solution Documentation

## 📋 Challenge Overview

**Wubba Lubba Dub Dub!** This repository contains my solutions for the **Morty Express Challenge** by [Sphinx Labs](https://challenge.sphinxhq.com/) - a coding challenge where I had to save 1000 Morties from the Citadel and transport them safely to Planet Jessica through one of three dangerous intermediate planets.

### The Problem

Rick discovered Planet Jessica, populated by emotionally stable Jessicas. The Council of Ricks wants to wipe this knowledge from all Morties' memories. I need to help 1000 Morties escape through portal guns, but they can only travel through one of three intermediate planets:

- **Planet 0**: "On a Cob" Planet
- **Planet 1**: Cronenberg World
- **Planet 2**: The Purge Planet

Each planet has **dynamic risk profiles** that change over time (based on trip count), and I can send 1-3 Morties per trip. The goal is to maximize the number of Morties that reach Planet Jessica safely.

### API Endpoints

- `POST /api/mortys/start/` - Start a new episode
- `POST /api/mortys/portal/` - Send Morties through a planet
- `GET /api/mortys/status/` - Check current status

## 🏗️ Project Structure

```
Morty-Express/
├── planets/           # Baseline experiments per planet
│   ├── planet0/       # Testing Planet 0 only
│   ├── planet1/       # Testing Planet 1 only
│   └── planet2/       # Testing Planet 2 only
├── gready/            # Greedy "Hot Streak" algorithm
├── new_discovery/     # Probe Cycle strategy (12-trip rotation)
├── random/            # Totally random baseline
├── data/              # JSON output files with trip data
├── data8/             # Additional data storage
├── .env               # API token configuration
└── package.json       # Node.js dependencies
```

## 🧪 Algorithms Implemented

### 1. **Baseline Testing** (`planets/`)

**Purpose**: Understand individual planet behavior by forcing all traffic through one planet.

**Approach**:

- Force all 1000 Morties through a single planet (0, 1, or 2)
- Configurable Morty count per trip (1, 2, or 3)
- Collect pure baseline data for each planet's survival rate

**Key Files**:

- `planets/planet0/index.js` - Planet 0 baseline (1 Morty/trip)
- `planets/planet1/index.js` - Planet 1 baseline (1 Morty/trip)
- `planets/planet2/index.js` - Planet 2 baseline (2 Morties/trip)

**Configuration Variables**:

```javascript
const TARGET_PLANET = 0; // Which planet to test
const MORTY_COUNT_PER_TRIP = 1; // Morties per trip
```

**Output**: JSON files with trip-by-trip survival data to understand planet risk patterns.

---

### 2. **Greedy Hot Streak Algorithm** (`gready/`)

**Algorithm Name**: `HotStreak_S2_F1`

**Strategy**: Two-state machine that probes planets and exploits "hot streaks" when found.

**States**:

1. **Probing Mode**: Send 1 Morty at a time to test planet safety
2. **Exploiting Mode**: Send 3 Morties at a time when planet is "hot"

**Parameters**:

- `PROBE_SUCCESS_THRESHOLD = 1` (S2): Switch to exploit after 2 consecutive successes
- `EXPLOIT_FAILURE_THRESHOLD = 3` (F1): Return to probe after 3 failures

**Logic Flow**:

```
Probing Mode:
  - Send 1 Morty
  - If SUCCESS → increment success counter
    - If success_count >= 2 → Switch to EXPLOIT mode
  - If FAILURE → Reset counter, try next planet

Exploiting Mode:
  - Send 3 Morties
  - If SUCCESS → Reset failure counter (keep exploiting)
  - If FAILURE → Increment failure counter
    - If failure_count >= 3 → Switch to PROBE mode, try next planet
```

**Key Insight**: Balances exploration vs exploitation by quickly testing planets and capitalizing on good runs.

---

### 3. **Probe Cycle Algorithm** (`new_discovery/`)

**Algorithm Name**: `ProbeCycle_12`

**Strategy**: Systematic rotation through all planets with fixed trip counts.

**Approach**:

- Send 1 Morty per trip
- Complete 12 trips to Planet 0
- Complete 12 trips to Planet 1
- Complete 12 trips to Planet 2
- Repeat cycle (0 → 1 → 2 → 0...)

**Parameters**:

```javascript
const TRIPS_PER_PLANET = 12; // Trips before switching
const MORTY_COUNT_PER_TRIP = 1; // Always send 1
```

**Key Insight**: Provides balanced data collection across all planets to understand temporal risk changes.

---

### 4. **Random Baseline** (`random/`)

**Algorithm Name**: `TotallyRandom`

**Strategy**: Pure random selection for comparison baseline.

**Approach**:

- Randomly select planet (0, 1, or 2)
- Randomly select Morty count (1, 2, or 3)
- No learning or adaptation

**Purpose**: Establishes a baseline performance floor to measure algorithm effectiveness.

---

## 📊 Data Collection & Analysis

### Data Format

Each run generates a JSON file with the following structure:

```json
{
  "run_number": 1,
  "algo_name": "HotStreak_S2_F1",
  "strategy_params": {
    "probe_success_threshold": 1,
    "exploit_failure_threshold": 3
  },
  "success_percentage": 75.2,
  "final_score": 752,
  "morties_lost": 248,
  "total_trips": 334,
  "trip_data": [
    {
      "trip_number": 1,
      "planet": 0,
      "mortys_sent": 1,
      "survived": true,
      "morties_in_citadel": 999,
      "morties_on_planet_jessica": 1,
      "morties_lost": 0,
      "steps_taken": 1
    }
    // ... more trips
  ]
}
```

### Key Metrics

- **Final Score**: Number of Morties reaching Planet Jessica (out of 1000)
- **Success Percentage**: (final_score / 1000) × 100
- **Morties Lost**: Total casualties during transport
- **Total Trips**: Number of portal trips required
- **Survival Rate**: Per-trip survival tracking

### Data Storage

- All runs save to `data/` folder with timestamped filenames
- Format: `{ALGO_NAME}_Run_{RUN_NUMBER}_{TIMESTAMP}.json`
- Example: `HotStreak_S2_F1_Run_5_2025-11-25T14-30-45-123Z.json`

---

## 🛠️ Technical Implementation

### Dependencies

```json
{
  "axios": "^1.13.1", // HTTP client for API calls
  "dotenv": "^17.2.3", // Environment variable management
  "@stdlib/random-base-beta": "^0.2.1" // Statistical distributions
}
```

### Environment Setup

1. Create `.env` file:

```bash
API_TOKEN=your_api_token_here
```

2. Install dependencies:

```bash
npm install
```

3. Run an algorithm:

```bash
# Baseline testing
node planets/planet0/index.js
node planets/planet1/index.js
node planets/planet2/index.js

# Advanced strategies
node gready/index.js
node new_discovery/index.js
node random/index.js
```

### Core Features

**Automatic Retries**: All scripts run continuously with 5-second delays between runs for extensive data collection.

**Error Handling**: Graceful failure recovery with 30-second retry delays on API errors.

**Data Persistence**: Every run saves complete trip-by-trip data for analysis.

**Progress Logging**: Real-time console output showing trip progress and survival rates.

---

## 🎯 Strategy Insights

### What I Learned

1. **Planet Risk is Dynamic**: Survival rates change based on trip count, not random
2. **Hot Streaks Exist**: Some planets have temporary "safe" periods
3. **Conservative Probing**: Sending 1 Morty to test is safer than blind 3-Morty trips
4. **Adaptive Algorithms Win**: Strategies that learn from failures outperform static approaches

---

## 🏆 Challenge Details

**Hosted By**: Sphinx Labs  
**Challenge Link**: https://challenge.sphinxhq.com  
**API Base URL**: https://challenge.sphinxhq.com/api

**Prizes**:

- 🥇 **1st Place**: $10,000 + Flight to SF + Interview
- 🥈 **2nd Place**: $4,000 + Remote Interview
- 🥉 **3rd Place**: $2,000 + Remote Interview

---

## 📝 Notes

- All algorithms run indefinitely for continuous data collection
- Each algorithm has configurable parameters at the top of the file
- Data files are timestamped to prevent overwrites
- The challenge hints that planet probabilities change with time (trip count)
- Rick's advice: "Visualize the data, Morty!"
- I didn't have the time to utilize my findings into a final hybrid algorithm combining the best strategies because of time constraints.

---

## 🙏 Acknowledgements

Special thanks to the Sphinx Labs team for organizing this exciting challenge.

---

<p align="center">Created with ❤️ by mar1shell</p>
