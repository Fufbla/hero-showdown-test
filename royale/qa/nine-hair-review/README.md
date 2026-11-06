# Nine hairstyles and original faces — approval review

**Development branch only. No live deployment or merge is authorized by this review.**

This resumes the existing uncommitted nine-hair implementation on top of `48da43eb7652fc739eb3071078670b45f4895a38`. The approved original-face color work is inherited from `2a435a65444935e8b3524b008932a4ff8f4dc744`; the unchanged live baseline is `5defeb33c626d19755b26f030b5e7b840f6b4b77`. The rejected head redraw is not included.

## What was unfinished

The nine hair-only sprite plates, directional registrations, first review renders, and creator harness were already present. They had not been committed. The previous test log stopped at 17/18 passing: its accessory assertion incorrectly required a visible gold cuff behind the afro puff. Some exported creator captures were repeated images and are not used as current evidence. Final save verification and preview packaging were unfinished. There was no pending implementation approval requirement; artwork still requires visual approval before publication.

## Completed in this continuation

- Retained all nine existing directional sprite plates: Fade, High-top fade, High ponytail, Double puffs, Afro puff, Short afro, Medium afro, High loc bun, Braided ponytail.
- Seated tied styles on the back of the original skull without shifting forehead/ear openings. Filled the high ponytail's back scalp underneath its original free tail.
- Corrected a profile scalp highlight incorrectly assigned to costume trim. It now follows selected skin color, including antialiased edges. No original bitmap, facial geometry, eyes, body proportions, cape or costume asset was replaced.
- Preserved earlier eye/eyebrow/mouth material corrections, saved appearance IDs, tint caches, equipment and animated head anchors.
- Ordered the review Front, Right, Back, Left and regenerated 72 head views (9 styles × 2 original heads × 4 directions), plus normal gameplay-sized figures.
- Revised the actual-creator capture harness to verify distinct directional images, await decoded captures, inspect both presentations and preserve the hidden third slot. Its final browser run remains pending as described below.
- Created a self-contained approval gallery, individual sheets, two contact sheets, and pale/dark/fantasy facial-feature checks.

## Preview files

Open `hairstyle-approval-preview.html` directly; it embeds all nine sheets and the skin/feature sheet and requires no server or account. The selectable live-renderer review is `royale/tests/nine-hair-review.html`. The isolated playable/capture test harness is `royale/tests/nine-hair-game.html`; both require serving the repository root over localhost. The game harness uses uniquely prefixed session storage and test heroes.

- `all-nine-female.webp` and `all-nine-male.webp`: all nine, in Front / Right / Back / Left order.
- Each hairstyle's `.webp`: both original heads, enlarged and normal size.
- `skin-feature-checks.webp`: the original features and changed eyebrows/eyes/mouth at pale, dark and fantasy skin colors.

The sheets are actual outputs of `drawHero`, not generated concept sheets. The reference JPEGs are comparison guides only; none of their face or costume artwork is pasted into the renderer. The nine transparent PNG hair plates were recovered from the existing implementation, not regenerated in this continuation.

## Verification and limits

`verification.txt`: **63 tests passed, 0 failed**. This includes:

- 2,184 pixel-identical unchanged-art frames and exact original default face plates.
- 1,080 nine-hair animation/direction/equipment cases, including jump/double jump and left/right movement.
- 240 short-hair regression frames from the preceding review.
- Hair-color alpha preservation, visible gold accessories, fixed scalp anchors, bounded caches and save/reload preservation for all nine IDs.
- The production autosave function, taken unchanged from `app.mjs`, executed with real timers in isolated Node contexts for both visible slots. Measured consecutive snapshot intervals: **8,006 ms and 8,007 ms**. Complete snapshots matched expected appearance, level/XP, powers, inventory, roots, exact location and health.
- Byte-for-byte unchanged save code, account code, live entry points, combat, appearance schema and original assets against the live baseline.
- Current menu/controller, loot, inventory, cape and combat regressions.

`interface-checks.txt`: 10 additional behavior checks passed. One historical interface-branch whole-repository freeze assertion was explicitly excluded because it predates subsequent approved releases; it remains unchanged in its original test file. Current baseline protection is independently covered by the original-face and autosave tests above.

The resumed browser successfully displayed and captured Double puffs in the actual creator before its security policy blocked refreshing the tab. The final all-nine browser capture/movement/save harness and packaged interactive preview therefore still need a fresh browser pass. The timed production-function test is not a new live cloud/backend roundtrip. No real account or saved hero was accessed or changed.

## Reproduce

```sh
node --expose-gc --test royale/tests/nine-hair-reference.test.mjs royale/tests/original-face-fidelity.test.mjs royale/tests/short-hair-reference.test.mjs royale/tests/nine-hair-autosave.test.mjs royale/tests/v3-loot.test.mjs royale/tests/v3-combat.test.mjs royale/tests/menu-navigation.test.mjs royale/tests/menu-gamepad.test.mjs
node royale/tests/render-nine-hair-review.mjs
python3 tools/build-nine-hair-preview.py
```

The packager creates `royale-v3-hair-preview/`, an ignored local output using the repository's unchanged shared assets. It does not publish it. Serve the repository root to open its `index.html`.

## Remaining

1. Chris's visual approval of the heads and all nine hairstyles.
2. Fresh browser pass of the final capture, movement and save harness and the packaged preview (including phone layout).
3. Only after approval, integrate and verify the release; publication has not been performed.
