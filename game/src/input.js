// Input: the mouse aims the beam (its position, mapped into the logical
// field, becomes the beam's target angle), the arrow / A-D keys swing it,
// Space or Enter confirms, P or Esc pauses. Touch drags aim too.
import { FIELD, LIGHTHOUSE } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  let actions = 0;
  let keyDir = 0;
  let mouseAngle = null;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  function aim(event) {
    const p = toField(event);
    mouseAngle = Math.atan2(p.y - LIGHTHOUSE.y, p.x - LIGHTHOUSE.x);
  }

  canvas.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerdown', (event) => { aim(event); actions |= ACTION_CONFIRM; });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') { keyDir = -1; event.preventDefault(); }
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') { keyDir = 1; event.preventDefault(); }
    else if (event.code === 'Space' || event.code === 'Enter') { actions |= ACTION_CONFIRM; event.preventDefault(); }
    else if (event.code === 'KeyP' || event.code === 'Escape') { actions |= ACTION_PAUSE; }
  });
  window.addEventListener('keyup', (event) => {
    if ((event.code === 'ArrowLeft' || event.code === 'KeyA') && keyDir === -1) keyDir = 0;
    if ((event.code === 'ArrowRight' || event.code === 'KeyD') && keyDir === 1) keyDir = 0;
  });

  return {
    /** The beam's target angle this frame, or null to leave it alone. */
    beamTarget(currentAngle, dt) {
      if (keyDir !== 0) {
        mouseAngle = null;
        return currentAngle + keyDir * 1.9 * dt * 4;
      }
      return mouseAngle;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
