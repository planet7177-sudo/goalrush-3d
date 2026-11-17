/**
 * GoalRush 3D - Main Entry Point
 * Modern 3D Football PWA
 */

import { Game } from './game/Game.js';
import { UIManager } from './ui/UIManager.js';
import { Storage } from './utils/Storage.js';
import { MultiplayerManager } from './game/Multiplayer.js';

class App {
  constructor() {
    this.game = null;
    this.ui = new UIManager(this);
    this.storage = new Storage();
    this.multiplayer = new MultiplayerManager(this);
    this.settings = this.storage.loadSettings();
    this.currentMode = null;
  }

  async init() {
    // Simulate loading
    await this.ui.showLoading();
    
    // Initialize UI events
    this.ui.bindEvents();
    
    // Show main menu
    this.ui.showScreen('main-menu');
    
    // Check for room code in URL
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      this.ui.showScreen('lobby-screen');
      document.getElementById('join-code').value = room.toUpperCase();
    }

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (e) {
        console.warn('SW registration failed:', e);
      }
    }
  }

  async startGame(mode, options = {}) {
    this.currentMode = mode;
    this.ui.hideAllScreens();
    this.ui.showHUD();
    
    const container = document.getElementById('game-container');
    container.classList.remove('hidden');
    
    // Destroy previous game if any
    if (this.game) {
      this.game.destroy();
    }

    this.game = new Game({
      canvas: document.getElementById('game-canvas'),
      mode,
      settings: this.settings,
      multiplayer: this.multiplayer,
      onScore: (home, away) => this.ui.updateScore(home, away),
      onTimer: (time, period) => this.ui.updateTimer(time, period),
      onMatchEnd: (result) => this.onMatchEnd(result),
      ...options
    });

    await this.game.init();
    this.game.start();
    
    // Show mobile controls on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.getElementById('mobile-controls').classList.remove('hidden');
      document.getElementById('controls-hint').classList.add('hidden');
    }
  }

  onMatchEnd(result) {
    this.ui.showResults(result);
  }

  pauseGame() {
    if (this.game) {
      this.game.pause();
      this.ui.showScreen('pause-menu');
    }
  }

  resumeGame() {
    if (this.game) {
      this.game.resume();
      this.ui.hideScreen('pause-menu');
    }
  }

  quitToMenu() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    document.getElementById('game-container').classList.add('hidden');
    this.ui.hideHUD();
    this.ui.showScreen('main-menu');
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.storage.saveSettings(this.settings);
    if (this.game) {
      this.game.applySettings(this.settings);
    }
  }
}

// Boot
const app = new App();
window.app = app; // for debugging
app.init().catch(console.error);
