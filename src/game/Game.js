/**
 * GoalRush 3D - Core Game Engine
 */

import * as THREE from 'three';
import { Stadium } from './Stadium.js';
import { Player } from './Player.js';
import { Ball } from './Ball.js';
import { Controls } from './Controls.js';
import { AIController } from './AI.js';
import { CameraController } from './Camera.js';

const FIELD_LENGTH = 105;
const FIELD_WIDTH = 68;

export class Game {
  constructor(options) {
    this.canvas = options.canvas;
    this.mode = options.mode || 'quick';
    this.settings = options.settings || {};
    this.multiplayer = options.multiplayer;
    this.onScore = options.onScore || (() => {});
    this.onTimer = options.onTimer || (() => {});
    this.onMatchEnd = options.onMatchEnd || (() => {});

    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.running = false;
    this.paused = false;

    this.homeScore = 0;
    this.awayScore = 0;
    this.matchTime = 0;
    this.halfDuration = this.mode === 'practice' ? 9999 : 180;
    this.period = '1st Half';
    this.matchEnded = false;

    this.players = [];
    this.homeTeam = [];
    this.awayTeam = [];
    this.controlledPlayer = null;
    this.ball = null;
    this.stadium = null;
    this.controls = null;
    this.ai = null;
    this.cameraCtrl = null;

    this.mobileInput = { x: 0, y: 0 };
    this.actionState = { shoot: false, pass: false, sprint: false };

    this.stats = { shots: 0, shotsAway: 0, possession: 50 };
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.settings.graphics !== 'low',
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.graphics === 'high' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = this.settings.graphics !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.lighting === 'day' ? 0x87ceeb : 0x0a1628);
    this.scene.fog = new THREE.Fog(this.scene.background, 80, 180);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 25, 40);

    this.stadium = new Stadium(this.scene, {
      lighting: this.settings.lighting || 'night',
      quality: this.settings.graphics || 'medium'
    });
    await this.stadium.build();

    this.ball = new Ball(this.scene);
    this.ball.reset(0, 0.2, 0);

    this.createTeams();

    this.controls = new Controls(this);
    this.controls.enable();

    this.ai = new AIController(this);

    this.cameraCtrl = new CameraController(this.camera, this);

    window.addEventListener('resize', this.onResize.bind(this));

    this.onScore(0, 0);
    this.onTimer(0, this.period);
  }

  createTeams() {
    const homePositions = [
      { x: 0, z: 18, role: 'gk' },
      { x: -12, z: 8, role: 'def' },
      { x: 12, z: 8, role: 'def' },
      { x: -6, z: -2, role: 'mid' },
      { x: 6, z: -2, role: 'fwd' }
    ];
    const awayPositions = [
      { x: 0, z: -18, role: 'gk' },
      { x: -12, z: -8, role: 'def' },
      { x: 12, z: -8, role: 'def' },
      { x: -6, z: 2, role: 'mid' },
      { x: 6, z: 2, role: 'fwd' }
    ];

    homePositions.forEach((pos, i) => {
      const p = new Player(this.scene, {
        team: 'home',
        color: 0x3b82f6,
        position: new THREE.Vector3(pos.x, 0, pos.z),
        role: pos.role,
        id: `home_${i}`,
        isUser: i === 4
      });
      this.homeTeam.push(p);
      this.players.push(p);
      if (p.isUser) this.controlledPlayer = p;
    });

    awayPositions.forEach((pos, i) => {
      const p = new Player(this.scene, {
        team: 'away',
        color: 0xef4444,
        position: new THREE.Vector3(pos.x, 0, pos.z),
        role: pos.role,
        id: `away_${i}`,
        isUser: false
      });
      this.awayTeam.push(p);
      this.players.push(p);
    });
  }

  start() {
    this.running = true;
    this.paused = false;
    this.clock.start();
    this.animate();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.clock.start();
  }

  destroy() {
    this.running = false;
    this.controls?.disable();
    window.removeEventListener('resize', this.onResize);
    this.scene?.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.renderer?.dispose();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setMobileInput(x, y) {
    this.mobileInput.x = x;
    this.mobileInput.y = y;
  }

  triggerAction(action, pressed) {
    this.actionState[action] = pressed;
    if (pressed && this.controlledPlayer) {
      if (action === 'shoot') this.controlledPlayer.shoot(this.ball);
      if (action === 'pass') this.controlledPlayer.pass(this.ball, this.homeTeam);
    }
  }

  applySettings(settings) {
    this.settings = settings;
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    if (this.paused || this.matchEnded) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.matchTime += dt;
    const displayTime = Math.floor(this.matchTime);
    if (displayTime !== this._lastDisplayTime) {
      this._lastDisplayTime = displayTime;
      this.onTimer(displayTime, this.period);
    }

    if (this.mode !== 'practice' && this.matchTime >= this.halfDuration && this.period === '1st Half') {
      this.period = '2nd Half';
      this.matchTime = 0;
      this.resetPositions(true);
    } else if (this.mode !== 'practice' && this.matchTime >= this.halfDuration && this.period === '2nd Half') {
      this.endMatch();
      return;
    }

    this.controls.update(dt);
    this.players.forEach(p => p.update(dt, this.ball, this));
    this.ball.update(dt, this.players, this);
    this.ai.update(dt);
    this.cameraCtrl.update(dt);
    this.checkGoals();

    this.players.forEach(p => {
      p.position.x = THREE.MathUtils.clamp(p.position.x, -FIELD_WIDTH / 2 + 1, FIELD_WIDTH / 2 - 1);
      p.position.z = THREE.MathUtils.clamp(p.position.z, -FIELD_LENGTH / 2 + 1, FIELD_LENGTH / 2 - 1);
    });

    this.renderer.render(this.scene, this.camera);
  }

  checkGoals() {
    const goalWidth = 7.32 / 2;
    const ballPos = this.ball.position;

    if (ballPos.z > FIELD_LENGTH / 2 + 0.5 && Math.abs(ballPos.x) < goalWidth && ballPos.y < 2.5) {
      this.awayScore++;
      this.onScore(this.homeScore, this.awayScore);
      this.stats.shotsAway++;
      this.goalScored('away');
    } else if (ballPos.z < -FIELD_LENGTH / 2 - 0.5 && Math.abs(ballPos.x) < goalWidth && ballPos.y < 2.5) {
      this.homeScore++;
      this.onScore(this.homeScore, this.awayScore);
      this.stats.shots++;
      this.goalScored('home');
    }
  }

  goalScored(team) {
    this.paused = true;
    setTimeout(() => {
      this.resetPositions(team === 'home');
      this.paused = false;
    }, 2000);
  }

  resetPositions(homeKickoff = true) {
    this.ball.reset(0, 0.2, 0);
    this.ball.velocity.set(0, 0, 0);

    this.homeTeam.forEach((p, i) => {
      const base = [{ x: 0, z: 18 }, { x: -12, z: 8 }, { x: 12, z: 8 }, { x: -6, z: -2 }, { x: 6, z: -2 }][i];
      p.setPosition(base.x, 0, base.z);
      p.velocity.set(0, 0, 0);
    });
    this.awayTeam.forEach((p, i) => {
      const base = [{ x: 0, z: -18 }, { x: -12, z: -8 }, { x: 12, z: -8 }, { x: -6, z: 2 }, { x: 6, z: 2 }][i];
      p.setPosition(base.x, 0, base.z);
      p.velocity.set(0, 0, 0);
    });
  }

  endMatch() {
    this.matchEnded = true;
    this.running = false;
    this.onMatchEnd({
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      homeName: 'HOME',
      awayName: 'AWAY',
      stats: this.stats,
      duration: '90:00'
    });
  }
}
