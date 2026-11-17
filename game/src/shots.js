// The screenshot scenes behind ?shot=start|play|danger|end. Each plays the
// real rules forward from a fresh world, steered by a simple keeper
// autopilot (keep the beam on the ship closest to a reef), so the frame is
// what a real game looks like and the same seed always gives the same frame.
import { LIGHTHOUSE, STEP } from './config.js';
import { EVENT_OVER, EVENT_WON } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Angle from the lighthouse to the unguided ship nearest a reef (most in need of light). */
function autopilot(world) {
  let best = null;
  let bestDanger = Infinity;
  for (const ship of world.ships) {
    if (!ship.active || ship.spawnIn > 0 || ship.guided) continue;
    let nearest = Infinity;
    for (const reef of world.reefs) {
      nearest = Math.min(nearest, Math.hypot(ship.x - reef.x, ship.y - reef.y));
    }
    if (nearest < bestDanger) { bestDanger = nearest; best = ship; }
  }
  if (!best) return null;
  return Math.atan2(best.y - LIGHTHOUSE.y, best.x - LIGHTHOUSE.x);
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play' || name === 'danger') {
    // Play: a competent keeper for a while. Danger: the same, then the beam
    // is dragged away to the far left for the last seconds, so a ship is
    // caught in the dark close to its reef.
    const seconds = name === 'play' ? 22 : 38;
    for (let i = 0; i < seconds / STEP; i += 1) {
      const away = name === 'danger' && i > (seconds - 9) / STEP;
      world.step(STEP, away ? 2.6 : autopilot(world), false);
      if (world.state.over) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // An absent keeper: the beam never moves, ships strike, the night ends.
    for (let i = 0; i < 900 / STEP; i += 1) {
      const events = world.step(STEP, Math.PI / 2, false);
      if (events & (EVENT_OVER | EVENT_WON)) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // start: ambient title scene — ships sail themselves home under the light.
  for (let i = 0; i < 6 / STEP; i += 1) world.step(STEP, autopilot(world), true);
  return { screen: SCREEN_TITLE, best: 0 };
}
