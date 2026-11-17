/**
 * UI Manager - handles all screens, menus and HUD
 */

export class UIManager {
  constructor(app) {
    this.app = app;
    this.screens = [
      'loading-screen', 'main-menu', 'lobby-screen',
      'settings-screen', 'pause-menu', 'results-screen'
    ];
  }

  async showLoading() {
    const progress = document.getElementById('load-progress');
    const text = document.getElementById('load-text');
    const steps = [
      { p: 20, t: 'Loading stadium...' },
      { p: 45, t: 'Loading players...' },
      { p: 70, t: 'Initializing physics...' },
      { p: 90, t: 'Preparing pitch...' },
      { p: 100, t: 'Ready!' }
    ];
    for (const s of steps) {
      progress.style.width = s.p + '%';
      text.textContent = s.t;
      await new Promise(r => setTimeout(r, 180));
    }
    await new Promise(r => setTimeout(r, 200));
    this.hideScreen('loading-screen');
  }

  showScreen(id) {
    this.screens.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('active', s === id);
    });
  }

  hideScreen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  hideAllScreens() {
    this.screens.forEach(s => this.hideScreen(s));
  }

  showHUD() {
    document.getElementById('hud').classList.remove('hidden');
  }

  hideHUD() {
    document.getElementById('hud').classList.add('hidden');
  }

  updateScore(home, away) {
    document.getElementById('home-score').textContent = home;
    document.getElementById('away-score').textContent = away;
  }

  updateTimer(seconds, period) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    document.getElementById('match-timer').textContent = `${m}:${s}`;
    document.getElementById('match-period').textContent = period;
  }

  showResults(result) {
    this.hideHUD();
    document.getElementById('result-title').textContent =
      result.homeScore > result.awayScore ? 'Victory!' :
      result.homeScore < result.awayScore ? 'Defeat' : 'Draw';
    document.getElementById('result-home-name').textContent = result.homeName || 'HOME';
    document.getElementById('result-away-name').textContent = result.awayName || 'AWAY';
    document.getElementById('result-home-score').textContent = result.homeScore;
    document.getElementById('result-away-score').textContent = result.awayScore;
    
    const stats = document.getElementById('match-stats');
    stats.innerHTML = `
      <div>Possession: ${result.stats?.possession || '50%'} – ${result.stats?.possessionAway || '50%'}</div>
      <div>Shots: ${result.stats?.shots || 0} – ${result.stats?.shotsAway || 0}</div>
      <div>Duration: ${result.duration || '90:00'}</div>
    `;
    this.showScreen('results-screen');
  }

  bindEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleAction(btn.dataset.action);
      });
    });

    document.getElementById('create-room-btn')?.addEventListener('click', () => {
      this.app.multiplayer.createRoom();
    });
    document.getElementById('join-room-btn')?.addEventListener('click', () => {
      const code = document.getElementById('join-code').value.trim().toUpperCase();
      if (code.length >= 4) this.app.multiplayer.joinRoom(code);
    });
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      const input = document.getElementById('share-link');
      input.select();
      navigator.clipboard?.writeText(input.value);
    });
    document.getElementById('start-match-btn')?.addEventListener('click', () => {
      this.app.multiplayer.startMatch();
    });

    document.getElementById('save-settings')?.addEventListener('click', () => {
      const settings = {
        graphics: document.getElementById('graphics-quality').value,
        sfxVolume: +document.getElementById('sfx-volume').value,
        musicVolume: +document.getElementById('music-volume').value,
        cameraMode: document.getElementById('camera-mode').value,
        lighting: document.getElementById('lighting-mode').value
      };
      this.app.saveSettings(settings);
      this.showScreen('main-menu');
    });

    document.getElementById('pause-btn')?.addEventListener('click', () => {
      this.app.pauseGame();
    });

    this.setupMobileControls();
  }

  handleAction(action) {
    switch (action) {
      case 'quick-match': this.app.startGame('quick'); break;
      case 'multiplayer': this.showScreen('lobby-screen'); break;
      case 'local': this.app.startGame('local'); break;
      case 'penalties': this.app.startGame('penalties'); break;
      case 'tournament': this.app.startGame('tournament'); break;
      case 'practice': this.app.startGame('practice'); break;
      case 'settings': this.showScreen('settings-screen'); this.populateSettings(); break;
      case 'back-menu': this.showScreen('main-menu'); break;
      case 'resume': this.app.resumeGame(); break;
      case 'restart': this.app.quitToMenu(); setTimeout(() => this.app.startGame(this.app.currentMode), 100); break;
      case 'quit-menu': this.app.quitToMenu(); break;
      case 'play-again': this.app.quitToMenu(); setTimeout(() => this.app.startGame(this.app.currentMode), 100); break;
    }
  }

  populateSettings() {
    const s = this.app.settings;
    document.getElementById('graphics-quality').value = s.graphics || 'medium';
    document.getElementById('sfx-volume').value = s.sfxVolume ?? 70;
    document.getElementById('music-volume').value = s.musicVolume ?? 40;
    document.getElementById('camera-mode').value = s.cameraMode || 'follow';
    document.getElementById('lighting-mode').value = s.lighting || 'night';
  }

  setupMobileControls() {
    const stick = document.getElementById('joystick-stick');
    const base = stick?.parentElement;
    if (!base) return;

    let active = false;
    let origin = { x: 0, y: 0 };

    const getPos = (e) => {
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    };

    const onStart = (e) => {
      e.preventDefault();
      active = true;
      const rect = base.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      onMove(e);
    };

    const onMove = (e) => {
      if (!active) return;
      e.preventDefault();
      const pos = getPos(e);
      let dx = pos.x - origin.x;
      let dy = pos.y - origin.y;
      const max = 40;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      if (window.app?.game) {
        window.app.game.setMobileInput(dx / max, -dy / max);
      }
    };

    const onEnd = () => {
      active = false;
      stick.style.transform = 'translate(-50%, -50%)';
      if (window.app?.game) window.app.game.setMobileInput(0, 0);
    };

    base.addEventListener('touchstart', onStart, { passive: false });
    base.addEventListener('touchmove', onMove, { passive: false });
    base.addEventListener('touchend', onEnd);
    base.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    const bindBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => { e.preventDefault(); if (window.app?.game) window.app.game.triggerAction(action, true); };
      const end = () => { if (window.app?.game) window.app.game.triggerAction(action, false); };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end);
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
    };
    bindBtn('btn-shoot', 'shoot');
    bindBtn('btn-pass', 'pass');
    bindBtn('btn-sprint', 'sprint');
  }
}
