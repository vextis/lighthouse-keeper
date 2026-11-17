// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused and game over (win or lose).
//
// ?seed=N fixes the reef layout. ?shot=start|play|danger|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CRASHED, EVENT_DOCKED, EVENT_OVER, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
world.reset();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off: best lasts this visit */ }
}

// Tiny WebAudio blips: a bright ping on a docking, a low thud on a crash.
// Created lazily on the first user gesture so browsers allow it.
let audio = null;
function blip(freq, seconds, type) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + seconds);
  } catch { /* no audio: the game plays silently */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.ships, world.reefs, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. Guide the ships home.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    announce(world.state.won ? `You win. Score ${best}.` : `Game over. Score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      accumulator += dt;
      while (accumulator >= STEP) { world.step(STEP, world.state.beamAngle + Math.sin(now / 2400) * 0.002, true); accumulator -= STEP; }
    } else if (screen === SCREEN_PLAY) {
      accumulator += dt;
      const target = input.beamTarget(world.state.beamAngle, STEP);
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const events = world.step(STEP, target, false);
        accumulator -= STEP;
        if (events & EVENT_DOCKED) blip(880, 0.18, 'sine');
        if (events & EVENT_CRASHED) { blip(120, 0.35, 'sawtooth'); announce(`${world.state.lives} lives left.`); }
        if (events & (EVENT_OVER | EVENT_WON)) { endGame(); break; }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, world.ships, world.reefs, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Lighthouse Keeper. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
