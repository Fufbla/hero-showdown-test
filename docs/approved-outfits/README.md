# Twelve approved outfit trials

On staging, enter reserved test code `0000000000`, then open **Pause → Try Outfits · 12**. Select any outfit, preview an animation in either direction, and press **Play in this outfit**. All twelve are free to try. Original Red Jacket remains available.

Each outfit has 116 authored complete-body cells: the existing movement and power animation contract, plus the newer eight-frame ordinary Punch and eight-frame ordinary Kick with attached contact artwork. The runtime retains the existing customizable head and gameplay timing. There are no helmets or separate limb rigs.

Selection is stored in a separate browser-local test preference. Selecting an outfit does not purchase equipment, spend coins, replace a hero, change cloud saves, or change damage and cooldowns. Steel Body returns to the selected outfit. Other accounts and production renderers are unchanged. Trial assets load on demand; only Original, Steel, and the selected outfit remain cached in the engine.

The source PNGs in this directory were generated from the approved twelve-outfit concepts and the existing registered action atlases. Rebuild with `node tools/build-approved-outfits.mjs` (optionally supply outfit IDs). The packer preserves complete poses and registers their neck and foot anchors; it does not animate independent limbs. `node tools/build-kingjames-staging.cjs` rebuilds the staging adapters.

Validation: 49 targeted Node tests pass, covering every outfit frame, padding, background mattes, contact timing, six-kick sequencing, load failure, cache size, Steel restoration, and unchanged simulation/save behavior. Browser review checked all twelve selections, animated previews, left-facing motion, remembered selection after reload, and gameplay in a 390 × 844 viewport. This is responsive browser testing, not a physical iPhone test.
