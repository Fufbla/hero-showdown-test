# World Map / Tree of Eris update — 2026-11-09

Base: f39d76bc5921eba8cb8d83159f20017707908937. Development branch: feature/eris-fast-travel.

## Changes
- World Map region/phase travel requires a 100-coin confirmation. Current destination, insufficient funds, stale revision, invalid destination and combat attempts cannot debit the wallet. Physical portals retain free travel and proximity checks.
- Travel writes the wallet, destination and HP together. V3 waits for the account writer acknowledgement before resuming; retry sends the pending snapshot rather than executing travel again. Failed local persistence restores runtime state.
- Tree of Eris defaults to Upgrade Powers; its main navigation is Upgrade Powers and Costume Wardrobe. Power details have three explicit slot assignment controls, supporting replacement/swap and immediate saves. Villain Merge remains accessible.
- Main pause menu has eight requested actions. Removed standalone Superpowers and checkpoint healing. The old checkpoint command cannot invoke respawn while alive. Existing Health Roots and defeat respawn remain intact.
- Power upgrade/equip saves now use current runtime HP, wallet and location instead of merging those fields from an older snapshot.
- No account records, backend schema, equipment stats, autosave cadence or artwork changed.

## Verification
- 117 Node regression tests passed: travel/HP, menus/controller navigation, combat, loot and local co-op.
- 3 additional V3 writer tests passed with a simulated cloud adapter: exact wallet/HP/destination, retries, independent slots and failed-write recovery.
- 33 browser checks passed: 150/100/99 coins, cancellation, repeated confirmation, HP preservation, eight pause actions, Tree navigation, all three slot assignments and upgrades. Controller input was simulated. Tree tested at 390px width.
- Existing local co-op browser playtest passed 37 checks, including independent controls, simultaneous upgrades, equipment actions, ready gating and eight-second save timers (approximately 7994–8032ms observed).
- git diff --check passed.

## Limits
- Two active local co-op players share one region. Paid fast travel is disabled while both are active, rather than moving or charging a partner. Free physical portal travel retains shared-world behavior. The remaining solo player can fast travel.
- Online multiplayer is disabled in this release's existing configuration. Individual authority commands were tested, but live online rooms were not tested or enabled; a future online server release needs the corresponding command support.
- Real controller hardware, phones and live account restoration were not tested. No existing hero was changed during testing. Cloud tests used simulated writers, not production credentials.
- Browser performance sampling was heavily timer-throttled (roughly 1 FPS in many scenarios), so it is not a meaningful device-performance benchmark or a 60 FPS verification.
- Legacy saves that do not contain HP cannot recover an unknown historical HP value; current-format saved HP is preserved.
