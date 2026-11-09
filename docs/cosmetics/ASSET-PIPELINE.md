# Adding a clothing collection

This contract is under development. The shared renderer and wardrobe UI are integrated on the development branch. Production sales remain disabled pending complete artwork/fitting, backend save protection and device verification.

1. Use `universal-style-c-v1` from `royale/cosmetics/template.mjs` as the fixed attachment contract. Keep saved presentation/face/color choices separate from the body rig. Validate the master body on actual Style C heroes before approving any clothing fit.
2. Produce independent front/right/back/left modular art. Do not flatten the face, hair, hands or body into clothing. Do not crop collection posters into runtime costumes. Keep asymmetry and lighting correct; mirrored directional layers fail validation.
3. Separate torso, near/far upper arms and forearms, hands when covered, hips, thighs, shins, each foot, skirt, headwear, accessory and cape where appropriate. Use the existing animated limb transforms. Wide sleeves/skirts/capes require deformation/occlusion review across every attack and airborne pose.
4. Export RGBA PNG or lossless WebP with transparent gutters, no background/shadows, stable dimensions and bounded texture resolution. Run the read-only alpha inspector. It does not prove visual fidelity.
5. Create a piece manifest under `royale/cosmetics/assets/`. Define `template`, `atlas` (`url`, `width`, `height`) and `layers`. Each layer has `view`, `part`, `pass`, `rect`, `pivot`, `attach`, `scale`; bone-bound parts also have `end: {pivot, attach}`. Coordinates in `pivot` are tile-local source pixels. Attachments use `attachmentPoints(pose)`; layer passes must be interleaved with the existing hero painter.
6. Register the collection and stable set/piece IDs in `catalog.json`. Never reuse an ID for a different product. Asset paths may change without changing ownership IDs. Set actual prices only after product review. Partial set purchases charge only missing pieces, capped at the full set price. Complete purchases grant each modular piece's ID.
7. Load only visible previews and equipped pieces through `ClothingAssets`; deduplicate concurrent loads and cap the decoded cache. Hide armor visually only when all corresponding clothing assets are loaded. Failure retains armor rendering and ownership. Never write cosmetic data into combat inventory or stat calculation.
8. Add all four wardrobe subsections under the existing two-tab Tree navigation: Armor, Clothing Store, My Clothing, Accessories. Reuse existing controller focus and confirmation behavior. A purchase must go through the existing durable transaction and per-account acknowledgement path. Roll back the full runtime on a failed local transaction; retain/retry pending cloud writes without repeating the debit.
9. Test actual heroes in all directions with every hairstyle and armor category, standing/running/jumping/punching/kicking/casting/hurt/landing/turning. Compare screenshots against the reference. Check face/skin preservation and fit, not just metadata. Check full-body conflicts and headwear tuck behavior.
10. Install `checkCosmeticSave` in both authenticated save endpoints with existing account/slot revision checks before allowing purchases. Reject unsupported old tabs instead of accepting a save that would erase ownership/refund a stale wallet. Test two disposable accounts, all three slots, reconnect, failed response/retry, eight-second autosave and restore.
11. Piggyback compact selection IDs/revision on the existing player state protocol. No extra per-frame cosmetic requests. Verify separate local players and online clients; runtime serialization alone is not visible multiplayer verification.
12. Mark the four review flags only after inspecting that actual asset on actual characters. Set `availability: released` only after everything above passes. Run the release validator and regression suite, then deploy and verify the published game.

## Example manifest schema (no placeholder artwork)

```json
{
  "template": "universal-style-c-v1",
  "atlas": {"url": "./assets/collection/item.png", "width": 1024, "height": 1024},
  "layers": [
    {"view":"front","part":"torso","pass":"torso","rect":[0,0,128,160],"pivot":[64,20],"attach":"neck","scale":1}
  ]
}
```

This shortened example intentionally fails directional validation. Supply genuine right/back/left layers and the measured part anchors; do not copy guessed rectangles into released assets.

## Loaded-piece coverage and deformation

A manifest's optional `covers` list conceals the corresponding base-art regions only while that piece is decoded: `torso`, `arms`, `legs`, `gloves`, `belt`, `emblem`, `feet`, `boots`, `helmet`, `cape`, `mask`. This changes painting only. Separate footwear must cover feet/boots itself; removing footwear must not hide or remove armor statistics.

Bone-bound layers may set `fixedWidth: true` to keep the authored transverse scale while their length follows the bone. Sleeves can use `joint: {attach, fraction}` for a shared elbow seam. A skirt may use `drape: {nearHalf: 0 or 1}` to identify which atlas half follows the near leg; the actual renderer supplies rest-pose legs. Both deformation types still need visual review in all authored animation keys. They are not a substitute for proper directional artwork or finished cloth animation.

`ClothingRuntime` loads IDs through the catalog and manifests. Normal gameplay accepts released entries only; the explicit review path accepts fitting entries. Never change the production catalog merely to run a practice purchase. See the isolated fixtures in `royale/tests/clothing-store-review.mjs` and `royale/local-coop/tests/browser-clothing.mjs`.
