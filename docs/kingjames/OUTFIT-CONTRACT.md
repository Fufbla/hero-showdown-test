# Universal complete-outfit contract, v1

Only `kingjames-original` is registered. The original design has no cape.

- Atlas cells: 256 × 256 RGBA, fixed foot reference `[128,230]`, world scale `0.62`.
- Each atlas cell contains the entire body/outfit, including all limbs. No heads, skeletal joints or independent garment animation. Art is authored facing right; the complete frame and its anchored head mirror together for left.
- The manifest supplies a rectangle, head anchor `[x,y,radians]` and visual effect hand attachment per frame. These anchors do not change collision or damage. Head size is constant across animations and cached by saved facial appearance.
- State names: `idle`, `start`, `run`, `stop`, `jump`, `doubleJump`, `fall`, `land`, `punch`, `kick`, `hurt`, `defeat`, `recovery`. Animations list frame indices, duration in seconds and optional loop. Every animation has multiple distinct authored frames.
- Running is distance-paced with an eight-pose alternating stride. Jump/fall selection uses the existing vertical velocity and jump age. Punch/kick contact frames use the existing `ATTACKS` startup and active windows.
- Future outfit artwork must retain this cell, foot, head-anchor and timing contract. Capes must be part of every body frame. Add artwork, a compatible atlas, manifest and `OUTFITS` registration; no new movement or combat controller.
- Selection is a read-only staging render override. It does not write `outfit`, armor, inventory, cosmetics ownership or any combat statistic into a save.

Saved hair, facial hair, eyes, skin, eyebrows, nose, mouth and face selections use the existing illustrated head assets. Roster/creator/wardrobe, ordinary heroes, remote peers and local co-op keep the released renderer during this first prototype. The new engine is not a global wardrobe rollout.

## Reference and artwork

Reference: user-approved KingJames Superhero Sprite Sheet and KingJames Whole Outfit System; gameplay screenshot IMG_3871. Original files were inspected without modification.

`art/body-source.png` was generated with the built-in image generator using those references. The requested layout was 8 columns × 6 rows, red padded jacket, white/red undershirt, charcoal pants, red boots, black gloves, complete headless body poses, transparent background, no cape or effects. Rows cover idle/start/stop, alternating run, jump/double jump, fall/land, punch/kick and damage/defeat/recovery. The delivered source is 1448 × 1086; the packing tool retains the authored whole sprites and adds uniform transparent canvas space and frame anchors. It removes storyboard trajectory displacement through whole-frame placement only.

Regenerate adapter: `node tools/build-kingjames-staging.cjs`. Repack artwork: `node tools/build-kingjames-atlas.cjs`. These commands leave production entrypoints and gameplay modules unchanged.
