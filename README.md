# GoalRush 3D

**Modern 3D Multiplayer Football Progressive Web App**

Play realistic-feeling 3D football matches against AI or with friends. Built with Three.js, designed for Cloudflare Pages + Workers.

## Features

- **3D Stadium & Pitch** – full-size field, goals, stands, floodlights, day/night lighting
- **Playable Modes**
  - Quick Match (vs AI)
  - Play with Friends (room codes + invite links)
  - Local / LAN style multiplayer scaffolding
  - Penalty Shootout
  - Tournament
  - Practice Mode
- **Gameplay** – movement, sprint, pass, shoot, basic tackling via collisions, goalkeeper AI, opponent AI
- **Controls** – WASD / Arrows, Shift sprint, Space shoot, E pass + full mobile virtual joystick & action buttons
- **UI** – dark sports theme, main menu, lobby, HUD, pause, results
- **PWA** – installable, offline-capable for single-player, local saves
- **Multiplayer Architecture** – WebSocket + Cloudflare Durable Objects ready

## Quick Start (Local)

```bash
cd football-pwa
npm install
npm run dev
```

Open http://localhost:3000

### Controls
| Action       | Desktop          | Mobile              |
|--------------|------------------|---------------------|
| Move         | WASD / Arrows    | Left joystick       |
| Sprint       | Shift            | Sprint button       |
| Shoot        | Space            | Shoot button        |
| Pass         | E                | Pass button         |
| Pause        | (button)         | Pause button        |

## Project Structure

```
football-pwa/
├── index.html
├── package.json
├── vite.config.js
├── wrangler.toml
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── styles/main.css
├── src/
│   ├── main.js
│   ├── game/
│   │   ├── Game.js
│   │   ├── Stadium.js
│   │   ├── Player.js
│   │   ├── Ball.js
│   │   ├── Controls.js
│   │   ├── AI.js
│   │   ├── Camera.js
│   │   └── Multiplayer.js
│   ├── ui/UIManager.js
│   └── utils/Storage.js
└── worker/multiplayer.js
```

## Deploy to Cloudflare Pages

1. Push the project to a Git repository.
2. In Cloudflare Dashboard → Pages → Create project → Connect repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (or the folder containing package.json)
4. Add environment variables if you later add analytics/API keys (never put secrets in frontend code).

### Multiplayer Worker (optional but recommended)

```bash
npx wrangler deploy
```

Then route your Pages domain `/ws/*` to the Worker, or update the WebSocket URL in `Multiplayer.js` to your Worker hostname.

## Icons

Place `icon-192.png` and `icon-512.png` in `public/icons/`.
You can generate them from any 512×512 logo using https://realfavicongenerator.net or similar.

## Notes & Roadmap

- Current AI is competent for a fun 5v5 experience and runs smoothly on mid-range mobiles.
- Full 11v11 + advanced animations require additional 3D models (GLTF) and an animation mixer – the architecture supports swapping the procedural players for loaded models.
- Real-time multiplayer sync is implemented at the protocol level; enable the Worker and set `useLocalFallback = false` once deployed.
- Physics are custom (lightweight) for performance. For more realism you can later integrate `cannon-es` or Rapier.

## License

Original code and assets created for this project. Do not use copyrighted EA / FIFA assets.

Enjoy the beautiful game!
