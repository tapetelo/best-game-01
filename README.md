# EMBERWARDEN

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/tapetelo/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/tapetelo/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**EMBERWARDEN** — carry the last lantern through seven nights. An entry for
[make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

Light is both weapon and resource. Shadow wisps only move in the dark and
freeze in light. Light the five braziers to push the dark back, gather embers
to feed the lantern, and survive all seven nights until dawn breaks.

## How to play

- **WASD / arrow keys** — move the warden
- **Mouse** — aim the lantern beam
- **Click / Space** — flare: a cone of light that freezes wisps (costs fuel)
- **Stand by a brazier** — it lights after a short channel
- **Walk over embers** — they refill lantern fuel
- **P** — pause, **M** — mute, **Enter / R** — start / restart

Lose a life when a wisp touches you (3 lives). Run out of fuel in the dark
and the lantern goes out. Survive night 7 and dawn breaks — you win.

## Run it

Serve `game/` with any static server and open `index.html` in desktop
Chrome. No build step, no network requests, no libraries — plain 2D canvas
and vanilla JavaScript, with WebAudio oscillator sound only.

```sh
node serve.ts   # then open http://localhost:8080
```

## Layout

- `game/src/config.js` — all tuning numbers and colours
- `game/src/random.js` — seeded random generator
- `game/src/input.js` — keyboard + mouse input
- `game/src/world.js` — the night simulation (wisps, braziers, embers, fuel)
- `game/src/render.js` — all drawing, one painter per screen
- `game/src/audio.js` — WebAudio oscillator sound
- `game/src/shots.js` — deterministic screenshot states
- `game/src/main.js` — boot and the game loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
