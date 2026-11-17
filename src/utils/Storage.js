/**
 * Local storage / IndexedDB helper for saves and settings
 */

const SETTINGS_KEY = 'goalrush_settings';
const PROGRESS_KEY = 'goalrush_progress';

export class Storage {
  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...this.defaultSettings(), ...JSON.parse(raw) };
    } catch (e) {}
    return this.defaultSettings();
  }

  saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  defaultSettings() {
    return {
      graphics: 'medium',
      sfxVolume: 70,
      musicVolume: 40,
      cameraMode: 'follow',
      lighting: 'night',
      playerName: 'Player'
    };
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { matchesPlayed: 0, wins: 0, goals: 0 };
  }

  saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
}
