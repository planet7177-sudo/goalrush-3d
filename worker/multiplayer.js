/**
 * Cloudflare Worker + Durable Object for real-time multiplayer rooms
 */

export class RoomDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      await this.handleSession(server, url);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('GoalRush Multiplayer Worker', { status: 200 });
  }

  async handleSession(ws, url) {
    ws.accept();
    const id = crypto.randomUUID().slice(0, 8);
    const isHost = url.searchParams.get('host') === '1';
    const name = url.searchParams.get('name') || `Player_${id}`;

    const session = { id, name, team: isHost ? 'home' : 'away', ws };
    this.sessions.set(ws, session);

    ws.send(JSON.stringify({
      type: 'welcome',
      id,
      players: [...this.sessions.values()].map(s => ({ id: s.id, name: s.name, team: s.team }))
    }));

    this.broadcast({ type: 'player_joined', player: { id, name, team: session.team } }, ws);

    ws.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') {
          this.broadcast({ type: 'state', from: id, ...msg }, ws);
        } else if (msg.type === 'start' && isHost) {
          this.broadcast({ type: 'start' });
        } else if (msg.type === 'chat') {
          this.broadcast({ type: 'chat', from: name, text: msg.text });
        }
      } catch (e) {
        console.error('Message error', e);
      }
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
      this.broadcast({ type: 'player_left', id });
    });
  }

  broadcast(data, except = null) {
    const payload = JSON.stringify(data);
    for (const [ws] of this.sessions) {
      if (ws !== except && ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/ws\/([A-Z0-9]+)/i);
    if (match) {
      const roomCode = match[1].toUpperCase();
      const id = env.ROOMS.idFromName(roomCode);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }
    return new Response('GoalRush Multiplayer – use /ws/ROOMCODE', { status: 200 });
  }
};
