# Batch 6 review evidence

Base: `deb9cec7315aff8e2606e1be51db1f999b245a60`.

Open `royale/tests/boss-sprites-all.html` from a server rooted at the repository. The page shows all 15 bosses using the actual game renderer and links to playable practice with isolated saves. `boss-sprites-batch6.html` demonstrates every final-batch sequence and provides atlas downloads.

## Automated and visual evidence

- Baseline: 687 tests passed. Final staged suite: 698 passed, 0 failed, 0 skipped.
- New-pose browser validation: 336 checks passed.
- All-15 browser renderer validation: 598 checks passed, including names, all three phase attack lists, movement, hit, defeat and both facings.
- Legendary browser matrix: 920 checks passed across eight bosses and five viewport sizes.
- Regional matrix: 725 passed across seven bosses and five viewport sizes. Total browser assertions: **2,606**.
- IndexedDB durability: 10 passed. Reward/save edge cases: 17 passed.
- Visual inspection: all 84 new poses inspected in native contact sheets; all 15 browser-rendered identities inspected in the compact gallery; new bosses inspected in their actual arenas at 1280×800 and 844×390.

The all-15 gallery screenshot is `all15-browser-gallery.jpg`. Individual new-boss desktop/mobile captures and contact sheets sit alongside it. These are rendered game assets, not concept mockups. Automated fixture victories are not unassisted playthroughs. No physical-device testing occurred.

## Performance and artwork limitations

30-second cloud runs: Venomis desktop 1.11 FPS; AtomDust landscape-phone 1.32 FPS. Average whole-game drawing cost was 4.12 and 2.55 ms respectively. Frame scheduling was much slower; its cause was not established. Native boss-only drawing averaged 0.16–0.19 ms over 600 draws per boss/viewport. Neither result establishes sustained 60 FPS on a physical device.

All required sequences have distinct authored poses. Four poses per sequence and short existing blends are a compact treatment. Fine scales, small secondary serpent heads, armor details and attached glows vary between generated poses and remain candidates for manual cleanup. No previously completed artwork was regenerated.

## Protected work

65 pre-existing boss asset files match the base exactly. All 13 previous integrations remain. Only the Legendary profile composition changes at runtime. The 21 regular monsters, all gameplay values/logic, Story, Versus and player save handling are untouched. No merges are part of this batch.
