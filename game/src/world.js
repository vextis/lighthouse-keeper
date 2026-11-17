// Lighthouse Keeper — the simulation. No drawing, no DOM: just ships, reefs,
// the beam, and the rules. Ships enter from the left on a course that takes
// them onto a reef; while the player's beam covers a ship it steers for the
// harbour and speeds up. A ship that reaches the harbour scores; a ship that
// touches a reef is lost and costs a life.
import {
  DOCK_POINTS, FIELD, LIVES, LIGHTHOUSE, PORT, POOL_SIZE, SEA, SHIP,
  WAVES, WAVE_BONUS, shipsForWave,
} from './config.js';

export const EVENT_DOCKED = 1;
export const EVENT_CRASHED = 2;
export const EVENT_OVER = 4;
export const EVENT_WON = 8;
export const EVENT_WAVE = 16;

function angleDelta(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createWorld(random) {
  const ships = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    ships.push({ active: false, x: 0, y: 0, heading: 0, speed: 0, reefY: 0, lit: false, guided: false, litTime: 0, wobble: 0, spawnIn: 0 });
  }
  const reefs = [];

  const state = {
    time: 0,
    score: 0,
    lives: LIVES,
    wave: 0,
    beamAngle: Math.PI / 2, // pointing straight down at the sea
    shipsLeftToSpawn: 0,
    shipsAtSea: 0,
    docked: 0,
    lost: 0,
    over: false,
    won: false,
    message: '',
  };

  function layoutReefs() {
    reefs.length = 0;
    const count = 4 + Math.min(state.wave, 3); // 5 reefs on wave 1, up to 7
    for (let i = 0; i < count; i += 1) {
      // Rejection-sample a spot: reefs keep clear of each other, and east of
      // x=650 they also keep clear of the harbour lane (PORT.y ± 100), so a
      // guided ship always has a fair channel home.
      let x = 430; let y = SEA.top + 40;
      for (let tries = 0; tries < 24; tries += 1) {
        x = 420 + random() * 400;
        y = SEA.top + 30 + random() * (SEA.bottom - SEA.top - 60);
        const inLane = x > 650 && Math.abs(y - PORT.y) <= 100;
        const crowded = reefs.some((r) => Math.hypot(r.x - x, r.y - y) < 105);
        if (!inLane && !crowded) break;
      }
      reefs.push({ x, y, r: 24 + random() * 14, seed: random() * 10 });
    }
  }

  function startWave() {
    state.wave += 1;
    layoutReefs();
    state.shipsLeftToSpawn = shipsForWave(state.wave);
    state.shipsAtSea = 0;
    let delay = 0.4;
    for (const ship of ships) {
      if (state.shipsLeftToSpawn <= 0) break;
      if (ship.active) continue;
      // Each new ship sails east just off a reef's line and drifts onto it:
      // ignored, it will strike when it reaches the reef; lit for a moment,
      // its crew fixes the harbour course (guided) and it stays on it.
      const reef = reefs[Math.floor(random() * reefs.length)];
      ship.active = true;
      ship.x = -30;
      const offset = (random() < 0.5 ? -1 : 1) * (46 + random() * 64);
      ship.y = Math.max(SEA.top, Math.min(SEA.bottom, reef.y + offset));
      ship.reefY = reef.y;
      ship.heading = Math.atan2(reef.y - ship.y, 700);
      ship.speed = SHIP.baseSpeed + (state.wave - 1) * SHIP.speedPerWave + random() * 12;
      ship.lit = false;
      ship.guided = false;
      ship.litTime = 0;
      ship.wobble = random() * Math.PI * 2;
      ship.spawnIn = delay;
      delay += 5.5 + random() * 3.0;
      state.shipsLeftToSpawn -= 1;
      state.shipsAtSea += 1;
    }
    state.message = `Wave ${state.wave} of ${WAVES}`;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 0;
    state.beamAngle = Math.PI / 2;
    state.docked = 0;
    state.lost = 0;
    state.over = false;
    state.won = false;
    state.message = '';
    for (const ship of ships) ship.active = false;
    startWave();
  }

  /** Is the point inside the beam cone right now? */
  function inBeam(x, y) {
    const dx = x - LIGHTHOUSE.x;
    const dy = y - LIGHTHOUSE.y;
    const dist = Math.hypot(dx, dy);
    if (dist > LIGHTHOUSE.beamLength || dist < 10) return false;
    const ang = Math.atan2(dy, dx);
    return Math.abs(angleDelta(ang, state.beamAngle)) <= LIGHTHOUSE.beamHalfAngle;
  }

  /**
   * Advance one fixed step. `beamTarget` is the angle the player wants the
   * beam at (mouse aim or key rotation is resolved by the caller into an
   * absolute angle), or null to leave the beam where it is. In `ambient`
   * mode (title screen) ships sail and dock on their own and nothing scores
   * or is lost.
   */
  function step(dt, beamTarget, ambient) {
    let events = 0;
    state.time += dt;
    if (beamTarget !== null && beamTarget !== undefined) {
      const turn = 3.2 * dt; // beam slew rate, rad/s
      const d = angleDelta(beamTarget, state.beamAngle);
      state.beamAngle += Math.max(-turn, Math.min(turn, d));
    }
    if (state.over) return events;

    let anyActive = false;
    for (const ship of ships) {
      if (!ship.active) continue;
      anyActive = true;
      if (ship.spawnIn > 0) { ship.spawnIn -= dt; continue; }

      ship.lit = inBeam(ship.x, ship.y);
      if (ambient) { ship.lit = true; ship.guided = true; } // title-screen ships always find the harbour
      if (ship.lit && !ship.guided) {
        ship.litTime += dt;
        if (ship.litTime >= 1.1) { ship.guided = true; state.message = 'Course set — ship is steering for the harbour!'; }
      }

      const headingHome = ship.lit || ship.guided;
      const target = headingHome
        ? { x: PORT.x, y: PORT.y }
        : { x: FIELD.width + 60, y: ship.reefY };
      let want = Math.atan2(target.y - ship.y, target.x - ship.x);
      if (headingHome) {
        // A guided crew also watches the water: veer around any reef that
        // lies close ahead, then settle back onto the harbour course.
        for (const reef of reefs) {
          const d = Math.hypot(reef.x - ship.x, reef.y - ship.y);
          if (d < 120 && reef.x > ship.x - 10) {
            const away = Math.atan2(ship.y - reef.y, ship.x - reef.x);
            const blend = (120 - d) / 120;
            want += angleDelta(away, want) * blend * 0.9;
          }
        }
      }
      const steer = headingHome ? 1.5 : 0.38;
      ship.heading += Math.max(-steer * dt, Math.min(steer * dt, angleDelta(want, ship.heading)));
      const speed = ship.speed * (ship.lit ? SHIP.litBoost : 1);
      ship.x += Math.cos(ship.heading) * speed * dt;
      ship.y += Math.sin(ship.heading) * speed * dt + (headingHome ? 0 : Math.sin(state.time * 1.7 + ship.wobble) * 7 * dt);
      ship.y = Math.max(SEA.top - 24, Math.min(SEA.bottom + 10, ship.y));

      // Docked?
      if (Math.hypot(ship.x - PORT.x, ship.y - PORT.y) <= PORT.radius || ship.x > FIELD.width - 8) {
        ship.active = false;
        state.shipsAtSea -= 1;
        if (!ambient) {
          if (ship.guided || Math.abs(ship.y - PORT.y) < 60) {
            state.score += DOCK_POINTS;
            state.docked += 1;
            events |= EVENT_DOCKED;
          } else {
            // Sailed past the harbour into the dark: no points, no life lost.
            state.message = 'A ship slipped past the harbour…';
          }
        }
        continue;
      }

      // Struck a reef?
      if (!ambient) {
        for (const reef of reefs) {
          if (Math.hypot(ship.x - reef.x, ship.y - reef.y) < reef.r * 0.72 + SHIP.radius * 0.6) {
            ship.active = false;
            state.shipsAtSea -= 1;
            state.lives -= 1;
            state.lost += 1;
            state.message = 'A ship struck the reef!';
            events |= EVENT_CRASHED;
            if (state.lives <= 0) {
              state.over = true;
              state.won = false;
              events |= EVENT_OVER;
            }
            break;
          }
        }
      }
    }

    if (!ambient && !state.over && state.shipsAtSea <= 0) {
      if (state.wave >= WAVES) {
        state.over = true;
        state.won = true;
        state.score += 0; // win bonus is the surviving score itself
        events |= EVENT_WON;
      } else {
        state.score += WAVE_BONUS;
        events |= EVENT_WAVE;
        // Clearing every third wave relights a spare lamp: one life back.
        if (state.wave % 3 === 0 && state.lives < LIVES) state.lives += 1;
        startWave();
      }
    }
    void anyActive;
    return events;
  }

  return { state, ships, reefs, reset, step, inBeam };
}
