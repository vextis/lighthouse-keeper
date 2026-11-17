// Lighthouse Keeper — all drawing. A night bay: stars and a moon over a dark
// sea, the lighthouse on its rock sweeping a warm cone of light, little
// ships with lanterns, foam-ringed reefs, and the green harbour light on the
// right. HUD and screens are drawn in the same logical 1280x720 space.
import { FIELD, FONT, LIGHTHOUSE, PALETTE, PORT, SEA, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  window.addEventListener('resize', fit);
  fit();

  function starField() {
    // Deterministic pseudo-stars from a cheap hash, so every frame agrees.
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 90; i += 1) {
      const x = ((i * 733) % 1280);
      const y = ((i * 389) % 210) + 6;
      const r = (i % 3) * 0.5 + 0.6;
      ctx.globalAlpha = 0.35 + ((i * 37) % 60) / 100;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSea(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, 280);
    sky.addColorStop(0, PALETTE.skyTop); sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, FIELD.width, 282);
    starField();
    // Moon
    ctx.fillStyle = '#f4ecd2';
    ctx.beginPath(); ctx.arc(1110, 74, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.skyTop;
    ctx.beginPath(); ctx.arc(1124, 64, 26, 0, Math.PI * 2); ctx.fill();

    const sea = ctx.createLinearGradient(0, 280, 0, FIELD.height);
    sea.addColorStop(0, PALETTE.seaTop); sea.addColorStop(1, PALETTE.seaBottom);
    ctx.fillStyle = sea; ctx.fillRect(0, 282, FIELD.width, FIELD.height - 282);
    // Wave glints
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.13)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 9; row += 1) {
      const y = 306 + row * 46;
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 32) {
        const yy = y + Math.sin(x * 0.02 + state.time * 0.9 + row * 1.7) * 3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function drawBeam(state) {
    const { x, y } = LIGHTHOUSE;
    const a = state.beamAngle;
    const spread = 0.21;
    const len = LIGHTHOUSE.beamLength;
    const grad = ctx.createRadialGradient(x, y, 20, x, y, len);
    grad.addColorStop(0, 'rgba(255, 220, 130, 0.42)');
    grad.addColorStop(1, 'rgba(255, 214, 110, 0.02)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, len, a - spread, a + spread);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PALETTE.beamEdge; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawLighthouse(state) {
    const { x } = LIGHTHOUSE;
    // Rock
    ctx.fillStyle = PALETTE.rock;
    ctx.beginPath();
    ctx.moveTo(x - 92, 282); ctx.lineTo(x - 52, 218); ctx.lineTo(x - 26, 196);
    ctx.lineTo(x + 30, 196); ctx.lineTo(x + 58, 222); ctx.lineTo(x + 96, 282);
    ctx.closePath(); ctx.fill();
    // Tower
    const topY = 96; const baseY = 204;
    ctx.beginPath();
    ctx.moveTo(x - 22, baseY); ctx.lineTo(x - 14, topY); ctx.lineTo(x + 14, topY); ctx.lineTo(x + 22, baseY);
    ctx.closePath();
    ctx.fillStyle = PALETTE.lighthouseBody; ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = PALETTE.lighthouseStripe;
    ctx.fillRect(x - 24, 128, 48, 18); ctx.fillRect(x - 24, 168, 48, 18);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
    // Lamp room
    ctx.fillStyle = '#22293a'; ctx.fillRect(x - 16, 76, 32, 22);
    const glow = ctx.createRadialGradient(x, LIGHTHOUSE.y - 63, 2, x, LIGHTHOUSE.y - 63, 42);
    glow.addColorStop(0, 'rgba(255, 220, 130, 0.95)'); glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, LIGHTHOUSE.y - 63, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.lamp; ctx.beginPath(); ctx.arc(x, LIGHTHOUSE.y - 63, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22293a';
    ctx.beginPath(); ctx.moveTo(x - 20, 76); ctx.lineTo(x, 58); ctx.lineTo(x + 20, 76); ctx.closePath(); ctx.fill();
    void state;
  }

  function drawPort() {
    // Dock on the right edge at the harbour entrance.
    ctx.fillStyle = '#33404f';
    ctx.fillRect(PORT.x - 34, PORT.y - 92, 34, 184);
    ctx.fillStyle = PALETTE.port;
    ctx.fillRect(PORT.x - 34, PORT.y - 92, 6, 184);
    const pulse = 0.6 + Math.sin(performance.now() / 300) * 0.4;
    ctx.fillStyle = PALETTE.portLight; ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.arc(PORT.x - 20, PORT.y - 92, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(PORT.x - 20, PORT.y + 92, 7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.text; ctx.font = `600 17px ${FONT}`; ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(PORT.x - 52, PORT.y); ctx.rotate(-Math.PI / 2);
    ctx.fillText('H A R B O U R', 0, 0);
    ctx.restore();
  }

  function drawReefs(reefs, state) {
    for (const reef of reefs) {
      ctx.fillStyle = PALETTE.reefFoam;
      ctx.beginPath();
      ctx.ellipse(reef.x, reef.y, reef.r + 10 + Math.sin(state.time * 2 + reef.seed) * 2, reef.r * 0.62 + 6, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.reef;
      ctx.beginPath();
      ctx.moveTo(reef.x - reef.r, reef.y + reef.r * 0.45);
      ctx.lineTo(reef.x - reef.r * 0.4, reef.y - reef.r * 0.7);
      ctx.lineTo(reef.x + reef.r * 0.15, reef.y - reef.r * 0.3);
      ctx.lineTo(reef.x + reef.r * 0.55, reef.y - reef.r * 0.85);
      ctx.lineTo(reef.x + reef.r, reef.y + reef.r * 0.45);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawShips(ships, state) {
    for (const ship of ships) {
      if (!ship.active || ship.spawnIn > 0) continue;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.heading);
      // Hull
      ctx.fillStyle = PALETTE.shipHull;
      ctx.beginPath();
      ctx.moveTo(-20, -8); ctx.lineTo(14, -8); ctx.lineTo(22, 0); ctx.lineTo(14, 8); ctx.lineTo(-20, 8);
      ctx.closePath(); ctx.fill();
      // Sail / cabin
      ctx.fillStyle = PALETTE.shipSail;
      ctx.fillRect(-8, -5, 13, 10);
      ctx.restore();
      // Lantern — warm while lit, green once the harbour course is set,
      // blinking pale red while the ship is still in danger in the dark.
      const nearReefDanger = !ship.lit && !ship.guided;
      ctx.fillStyle = ship.guided ? PALETTE.portLight : ship.lit ? PALETTE.shipLight : '#ff8a75';
      ctx.globalAlpha = ship.lit || ship.guided ? 1 : 0.55 + Math.sin(state.time * 5 + ship.wobble) * 0.25;
      ctx.beginPath(); ctx.arc(ship.x, ship.y - 12, ship.lit || ship.guided ? 5 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (nearReefDanger) {
        ctx.fillStyle = PALETTE.danger; ctx.font = `700 18px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText('!', ship.x, ship.y - 24);
      }
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(14, 12, 356, 54);
    ctx.fillStyle = PALETTE.text; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(`Score ${state.score}`, 28, 48);
    ctx.font = `600 19px ${FONT}`; ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Wave ${Math.max(state.wave, 1)}/${WAVES}`, 168, 47);
    // Lives as little lamps
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.lives ? PALETTE.lamp : 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(292 + i * 24, 39, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(FIELD.width - 214, 12, 200, 54);
    ctx.fillStyle = PALETTE.muted; ctx.font = `600 19px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(`Best ${Math.max(best, state.score)}`, FIELD.width - 28, 47);
    if (state.message) {
      ctx.fillStyle = 'rgba(10,20,38,0.65)'; ctx.fillRect(390, 12, 500, 40);
      ctx.fillStyle = PALETTE.text; ctx.font = `600 19px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(state.message, 640, 39);
    }
    ctx.fillStyle = PALETTE.muted; ctx.font = `15px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText('Mouse or ← → sweeps the beam. Hold it on a ship until its lantern turns green — its course is set — then find the next one!', 16, FIELD.height - 14);
    void SEA;
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(4, 10, 22, 0.55)'; ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    const w = 640; const h = 120 + lines.length * 36;
    ctx.fillRect((FIELD.width - w) / 2, (FIELD.height - h) / 2 - 30, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.strokeRect((FIELD.width - w) / 2, (FIELD.height - h) / 2 - 30, w, h);
    ctx.fillStyle = accent; ctx.font = `800 44px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, (FIELD.height - h) / 2 + 38);
    ctx.fillStyle = PALETTE.text; ctx.font = `21px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, (FIELD.height - h) / 2 + 92 + i * 36);
    });
  }

  function draw(state, ships, reefs, screen, best) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    drawSea(state);
    drawBeam(state);
    drawReefs(reefs, state);
    drawPort();
    drawShips(ships, state);
    drawLighthouse(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) {
      panel('LIGHTHOUSE KEEPER', [
        'Ten waves of ships are drifting onto the reefs.',
        'Hold your beam on a ship until its lantern turns green:',
        '+100 for every ship docked · 3 strikes and the night is over.',
        '',
        'Click or press Space to begin',
      ], PALETTE.lamp);
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['Press P or Space to keep watch.'], PALETTE.muted);
    } else if (screen === SCREEN_OVER) {
      panel(state.won ? 'ALL SHIPS HOME — YOU WIN!' : 'THE LIGHT WENT OUT', [
        `Final score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
        `Ships docked ${state.docked}   ·   Ships lost ${state.lost}   ·   Waves cleared ${state.won ? WAVES : Math.max(state.wave - 1, 0)}`,
        '',
        'Click or press Space to play again',
      ], state.won ? PALETTE.portLight : PALETTE.danger);
    }
  }

  return { draw };
}
