/**
 * Keyboard + mouse controls
 */

export class Controls {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.enabled = false;

    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  disable() {
    this.enabled = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.keys = {};
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    // Prevent scrolling with arrows/space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const p = this.game.controlledPlayer;
    if (!p) return;

    if (e.code === 'Space') {
      p.shoot(this.game.ball);
    }
    if (e.code === 'KeyE') {
      p.pass(this.game.ball, this.game.homeTeam);
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  update(dt) {
    const p = this.game.controlledPlayer;
    if (!p) return;

    let dx = 0;
    let dz = 0;

    // Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    // Mobile joystick overrides / adds
    dx += this.game.mobileInput.x;
    dz -= this.game.mobileInput.y; // inverted for screen coords

    const sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.game.actionState.sprint;

    if (dx !== 0 || dz !== 0) {
      // Normalize
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      p.move(dx / len, dz / len, sprint);
    }
  }
}
