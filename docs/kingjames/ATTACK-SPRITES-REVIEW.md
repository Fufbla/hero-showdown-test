# KingJames attack sprites

The reserved `0000000000` staging session now uses the approved red-jacket full-body artwork for Super Strength, Super Kick, and Fireball. The existing customized head is attached to each complete authored body frame. Left-facing attacks mirror the complete body and its attachment points together.

- Super Strength: 12 authored frames mapped to the unchanged punch windup, active-hit, and recovery windows.
- Super Kick: six different four-frame segments selected by the existing `comboIndex`.
- Fireball: eight ground frames and eight airborne frames driven by `castAge`; sprite projectiles use the existing projectile positions and lifetime.
- Effects: approved green/gold attack atlas, with bounded duration; no additional damage or projectiles.

This release is limited to the existing KingJames prototype selection. Other outfits and multiplayer keep their existing renderer. Steel Body, Speed, Ground Roots, Whirlwind, production gameplay, account storage, and saved progress retain their existing behavior.

## Source artwork

Approved November 12 artwork is retained in `art/attack-*-source.png`: Headless red-jacket punch animation atlas, Red Puffer Fighter Kick Sprite Atlas, 4x4 headless red puffer sprite atlas, and Green-Gold Attack VFX Sprite Atlas. The body sources have no embedded customized head. `tools/build-kingjames-attacks.cjs` packs complete frames without a limb rig. Existing movement frames remain unchanged.

## Validation

134 local automated checks passed, including the existing outfit, Steel Body, Speed, save, cloud bridge, co-op, travel, clothing and power-policy regressions. The new attack checks cover both directions, all six kick segments, ground/air casting, projectile counts at levels 1/10/20, and deterministic gameplay/save equivalence with and without rendering. All 100 body/head compositions were checked for clipped artwork. Browser evidence is produced by the `KingJames full-body sprite regression` workflow for Chromium and WebKit in desktop, portrait and landscape profiles.

Manual visual review: `node tools/review-kingjames-attacks.mjs /tmp/kingjames-attack-contact.png`.
