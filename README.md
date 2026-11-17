# EMBERWARDEN

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/tapetelo/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/tapetelo/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**EMBERWARDEN** — defend Ashwick's Beacon through seven nights. An entry for
[make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

Light is your only weapon and embers are your budget. The Murk crawls in
from the dark — Gloomites, Gnawers, Dousers, Flickers, Hollows and
Wispmothers, and on night 7 THE LONG DARK itself. Flare them with light,
dash through them, light the six lamps, and spend embers on boons and in
the shop between nights. Keep the Beacon burning until dawn breaks.

## How to play

- **WASD / arrow keys** — move the warden
- **Mouse** — aim the lantern beam
- **Click** — flare: a cone of light that banishes the Murk
- **Shift / Space** — dash through danger (brief invulnerability)
- **E** — light the nearest unlit lamp (costs embers; lit lamps slow the Murk)
- **Q** — pulse: freeze everything nearby (costs embers)
- **1 / 2 / 3** — pick a boon at dawn, **4 / 5 / 6** — buy in the shop
- **P** — pause, **M** — mute, **Enter / R** — start / restart

Kills without taking a hit build a CHAIN multiplier up to ×8. Lose a life
when the Murk touches you (3 lives). If the Beacon flame hits 0, the dark
takes you. Banish THE LONG DARK on night 7 and dawn breaks — you win.

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
- `game/src/world.js` — the night simulation (the Murk, the Beacon, lamps, embers, chain, draft, boss)
- `game/src/render.js` — all drawing, one painter per screen
- `game/src/audio.js` — WebAudio oscillator sound
- `game/src/shots.js` — deterministic screenshot states
- `game/src/main.js` — boot and the game loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
