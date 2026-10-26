# Hero Showdown — playable villains test

This isolated build adds a twelve-fighter competitive Versus mode. **Do not upload it over the live game.** The existing `index.html` and `hero-showdown.html` are unchanged. Open the dedicated entry through the local launcher below.

## Start the test

1. Download the ZIP of `feature/playable-villains-versus` and extract it completely.
2. Open a terminal in the extracted folder. Run `python3 tools/serve-playable-villains.py` (Windows: `py -3 tools/serve-playable-villains.py`). Python 3 is required. Alternatively, run `START-PLAYABLE-VILLAINS.command` on Mac or `START-PLAYABLE-VILLAINS.bat` on Windows.
3. The launcher opens `http://127.0.0.1:8879/playable-villains-test.html`. If it does not open automatically, paste that address in your browser. It exists only while your local launcher is running; it is not a public preview URL.
4. Skip or watch the intro. Choose **Versus → Player vs CPU** or **Local PvP**, select both fighters, choose one of the five arenas, and start.
5. Use **How to Play** for complete controls. Stop the local server with Ctrl+C when finished.

No external server is needed for competitive CPU or local PvP. All character, venue, sound and video assets are included. The unchanged online co-op option still needs its existing internet/PeerJS service. A branch does not create a GitHub Pages deployment.

## Pause move lists and fighter roles

Press **Pause / Escape / P** or controller **Start** during a match. The pause screen now includes the selected fighters' move lists, including heroes. Choose P1, P2 or CPU, then **Movement & defense**, **Normal attacks & combos**, or **Projectiles, skills & specials**. Each attack shows the exact keyboard, controller and touch inputs, nominal damage, startup, recovery and cooldown. The guide also explains each fighter's strengths, weaknesses and game plan.

Use touch/mouse scrolling or the **↑ SCROLL / ↓ SCROLL** buttons (also selectable by controller). Resume with the Resume button, Escape, controller Start, or controller B/Back. Browsing does not advance combat or cooldowns. Local player-one and player-two keyboard mappings are shown independently; CPU study uses the solo keyboard mapping.

## Controls

| Action | Solo keyboard | Local P1 | Local P2 | Controller |
|---|---|---|---|---|
| Move | A/D or left/right | A/D | Left/right | Stick or D-pad |
| Jump / double jump | W or up | W | Up | A / Cross |
| Punch | J | F | J | X / Square |
| Kick | K | G | K | Y / Triangle |
| Block | L | H | L | LB / L1 |
| Special | Space | R | Enter | RB / R1 |
| Shoot | U | T | U | B / Circle |
| Skill | I | Y | I | LT / L2 |
| Heavy modifier | Shift + punch/kick | Left Shift | Right Shift | Hold RT / R2 |
| Dash | Double-tap direction | Double-tap direction | Double-tap direction | Double-tap direction |
| Pause | P / Escape | P / Escape | P / Escape | Start |

Touch retains the analog stick and action buttons, with added Shoot, Skill and a Heavy toggle. Tap Kick, Kick, Punch, Punch for the bounded sweep/uppercut sequence. Local PvP needs a keyboard or second controller for player two; there is no second touch control pad.

## What to playtest

- Pick a villain for P1 and a hero for P2; reverse the sides, then try two villains and a mirror match. Each fighter begins at 100 HP.
- Use Shoot and Skill as well as punches, kicks, blocking and Special. Green/orange floor rings and P1/P2 badges distinguish mirror fighters without recoloring the artwork.
- With Bushman, land four separate unblocked punches, kicks or fireballs, then press Special. Blocks and ground burns do not count.
- With Lightening Spree, use Skill to teleport. It has an eight-second cooldown. Concealment lasts two seconds and ends when attacking; it is not two seconds of invulnerability.
- In Toxic Harbor, leave or jump over the marked slam area. On Storm Rooftop, block the sweeping tornado.
- Finish a match, rematch, change fighters, pause/resume, and switch to Story or the original Co-op Boss Battle option.

The full roster, damage table and character abilities are in [BALANCE.md](docs/playable-villains/BALANCE.md). Validation and limits are in [QA.md](docs/playable-villains/QA.md). Animation integration is in [INTEGRATION.md](docs/playable-villains/INTEGRATION.md).

This is a draft for testing, not an approved production release. Online competitive PvP is not implemented; the existing online mode remains co-op. Physical iPhone/Android and real controller verification, extended balance playtesting, and combined testing with the separate animation project remain release gates.
