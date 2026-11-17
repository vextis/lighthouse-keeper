// Lighthouse Keeper — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The lighthouse stands on its rock at the top centre of the bay. */
export const LIGHTHOUSE = { x: 640, y: 150, beamLength: 780, beamHalfAngle: 0.21 };

/** The harbour entrance on the right edge: guided ships dock here. */
export const PORT = { x: 1246, y: 470, radius: 46 };

/** The sea lanes ships may spawn in. */
export const SEA = { top: 300, bottom: 660 };

export const SHIP = {
  radius: 16,
  baseSpeed: 52,
  speedPerWave: 3,
  litBoost: 1.45, // speed multiplier while inside the beam
};

export const LIVES = 3;
export const WAVES = 10;
export const DOCK_POINTS = 100;
export const WAVE_BONUS = 50;

/** Ships per wave: wave 1 sends 3, each later wave one more. */
export function shipsForWave(wave) {
  return Math.min(3 + (wave - 1), 8);
}

export const POOL_SIZE = 24;

export const PALETTE = {
  skyTop: '#070d1f',
  skyBottom: '#10233f',
  seaTop: '#0d2c47',
  seaBottom: '#061a2e',
  beam: 'rgba(255, 214, 110, 0.20)',
  beamEdge: 'rgba(255, 224, 150, 0.55)',
  lighthouseBody: '#e8e3d5',
  lighthouseStripe: '#c8433c',
  lamp: '#ffd66e',
  rock: '#2c3444',
  reef: '#1a2231',
  reefFoam: 'rgba(210, 235, 255, 0.75)',
  shipHull: '#8a5a33',
  shipSail: '#e9e2cf',
  shipLight: '#ffca7a',
  port: '#3f7d4e',
  portLight: '#7dff9a',
  danger: '#ff5d4d',
  text: '#eef3fa',
  muted: '#93a5bd',
  panel: 'rgba(10, 20, 38, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lighthouse-keeper.best';
