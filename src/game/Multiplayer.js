/**
 * Multiplayer Manager
 * Supports room codes + WebSocket scaffolding for Cloudflare Durable Objects
 */

export class MultiplayerManager {
  constructor(app) {
    this.app = app;
    this.roomCode = null;
    this.isHost = false;
    this.players = [];
    this.ws = null;
    this.connected = false;
    this.useLocalFallback = true;
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  createRoom() {
    this.roomCode = this.generateCode();
    this.isHost = true;
    this.players = [{ id: 'local', name: this.app.settings.playerName || 'You', team: 'home', ready: true }];

    const roomInfo = document.getElementById('room-info');
    const playersList = document.getElementById('players-list');
    roomInfo.classList.remove('hidden');
    playersList.classList.remove('hidden');

    document.getElementById('room-code').textContent = this.roomCode;
    const link = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}`;
    document.getElementById('share-link').value = link;

    this.updateLobbyUI();
    document.getElementById('start-match-btn').disabled = false;

    this.tryConnect(`wss://${window.location.host}/ws/${this.roomCode}?host=1`);
  }

  joinRoom(code) {
    this.roomCode = code.toUpperCase();
    this.isHost = false;
    this.players = [
      { id: 'host', name: 'Host', team: 'home', ready: true },
      { id: 'local', name: this.app.settings.playerName || 'You', team: 'away', ready: true }
    ];

    document.getElementById('room-info').classList.remove('hidden');
    document.getElementById('players-list').classList.remove('hidden');
    document.getElementById('room-code').textContent = this.roomCode;
    document.getElementById('share-link').value = `${window.location.origin}?room=${this.roomCode}`;

    this.updateLobbyUI();
    document.getElementById('start-match-btn').disabled = false;

    this.tryConnect(`wss://${window.location.host}/ws/${this.roomCode}`);
  }

  tryConnect(url) {
    try {
      if (!this.useLocalFallback) {
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
          this.connected = true;
          console.log('Multiplayer connected');
        };
        this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data));
        this.ws.onclose = () => {
          this.connected = false;
        };
        this.ws.onerror = () => {
          this.connected = false;
        };
      }
    } catch (e) {
      console.warn('WebSocket unavailable, using local multiplayer simulation');
    }
  }

  onMessage(msg) {
    switch (msg.type) {
      case 'state':
        break;
      case 'player_joined':
        this.players.push(msg.player);
        this.updateLobbyUI();
        break;
      case 'start':
        this.app.startGame('multiplayer', { isHost: this.isHost, room: this.roomCode });
        break;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  updateLobbyUI() {
    const ul = document.getElementById('lobby-players');
    if (!ul) return;
    ul.innerHTML = this.players.map(p => `
      <li>
        <span>${p.name} ${p.id === 'local' ? '(You)' : ''}</span>
        <span style="color:${p.team === 'home' ? '#3b82f6' : '#ef4444'}">${p.team.toUpperCase()}</span>
      </li>
    `).join('');
  }

  startMatch() {
    if (this.isHost || this.players.length >= 1) {
      this.app.startGame('multiplayer', {
        isHost: this.isHost,
        roomCode: this.roomCode,
        localMultiplayer: !this.connected
      });
    }
  }

  syncState(state) {
    if (!this.connected) return;
    this.send({ type: 'state', ...state });
  }
}
