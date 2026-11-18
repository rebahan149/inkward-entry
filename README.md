[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rebahan149/inkward-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rebahan149/inkward-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# INKWARD — a sumi-e sealing rite

An entry for the [best-game-01](https://make.fun/bounty/best-game-01) bounty on make.fun.

**INKWARD** is a top-down arena survival game painted entirely in canvas code — no assets, no library, no build step. You are the brush-keeper of a rice-paper scroll, and the inkstone at its heart has cracked: ink spirits leak onto the page and hunt you across three scrolls. Your brush is your only weapon. **Hold the mouse and walk a closed loop of ink around a spirit to seal it in a vermillion ring; when the ring bursts, its splash seals its neighbours, and theirs in turn** — chains build your combo multiplier, and the combo builds your score. Survive eight waves per scroll, choose a gift after every wave, take the pilgrim road's fork between scrolls, drive back the Great Ink Carp, and at the last seal the Cracked Inkstone itself.

## How to play

- **WASD / Arrow keys** — walk the scroll
- **Hold the mouse button** — lay ink as you walk; bring the stroke back to itself to close the loop and seal everything inside it
- **Space** — dash (briefly untouchable, and your escape when a loop goes wrong)
- **P / Esc** — pause · **M** — mute · **1–3** — choose a gift
- Two bars rule the rite: **Vigour** (health) and **Ink** (spent by drawing, refilled over time, by bursts, and by the loose motes bursts shake free — walk over them). Spirits that touch you tear the paper; if your Vigour reaches zero, the run ends.
- After each wave, pick **1 of 3 gifts**. Between scrolls, the road forks: pick one of two boons. Bosses take several seals to burst — each ring that catches them cracks them further and splashes the small fry around them.
- Ink beads earned in the rite are permanent: spend them in the **Workshop** (from the title screen) on blessings that persist between runs.

## Upgrades (pick one of three after every wave)

- **Wide-Hair Brush** — chain-seal radius +22% per rank
- **Deep Inkwell** — +30 maximum ink
- **Swift-Ground Sumi** — ink refills 40% faster per rank
- **Patient Stroke** — your trail lingers longer before it dries
- **River Sandals** — move 11% faster per rank
- **Phantom Step** — dash recharges sooner and carries further
- **Echo Seal** — chained bursts splash at full width instead of fading
- **Heavy Sumi Cake** — bursts strike brutes twice; one seal can crack them open
- **Second Heart** — +25 maximum Vigour
- **Mending Wash** — restore 35 Vigour now
- **Gilded Bristles** — bursts shake loose 30% more ink beads
- **Calligrapher's Eye** — grand loops score more, in proportion to their area
- **Fast-Drying Ink** — sealed spirits burst 30% sooner; chains snap faster
- **Thorn Ink** — spirits crossing your wet trail are slowed

## Relics (rare, one of a kind)

- **Carp Scale** — dashing lays a short stroke that can close a loop
- **Cracked Bead** — when you are hurt, nearby spirits are sealed
- **Vermillion Hanko** — every fifth loop is stamped: its seals score double
- **Bamboo Flask** — ink refills to full at the start of every wave
- **Mirror Charm** — once per scroll, death is refused and you mend to half
- **Thunder Bristles** — every few seconds a stray spirit is struck and sealed
- **Pilgrim's Old Coin** — each cleared wave leaves 3 extra beads in your sleeve
- **Paper Crane** — move faster; your trail dries slower
- **Ink Moon** — your combo holds 1.2 seconds longer
- **Dragon Whisker** — drawing costs 20% less ink

Synergies: **Wide-Hair Brush + Echo Seal** widens chained splashes a second time; **Vermillion Hanko + Calligrapher's Eye** makes stamped grand loops refund ink; **Thorn Ink + Fast-Drying Ink** keeps spirits dragging long after the ring closes.

## The Workshop (permanent, bought with ink beads)

Sturdier Paper (+Vigour), Deeper Inkstone (+ink), Well-Worn Sandals (+speed), Gilded Hanko (+score), Second Breath (faster dash) — three ranks each — and the **Blessed Brush**, which begins every run with a free upgrade chosen by fate. Progress is kept in `localStorage`.

## Run it

```sh
node serve.ts          # serves game/ on http://localhost:8080 — then just play
node main.ts           # hands the game in: copies game/ + screenshots/ to /output with dossier.json
```

The game is plain static files under `game/` (ES modules, no dependencies, works offline). All art is drawn in code; all sound is synthesised WebAudio. Every run is seeded, and `game/index.html?shot=play&seed=2` stages the deterministic scenes listed in `shots.json` — the source of the screenshots in `screenshots/`.

Found the keeper through [make.fun](https://make.fun/r/eskhvp8c)? The road is kinder with company — bring a friend to the rite.
