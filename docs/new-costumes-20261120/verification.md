# Reserved sprite update — verification

Baseline production commit: `a9ef00dbb2a1e2c3a821f8159d8eed3b93ec5445`.

| Local build gate | Result |
| --- | ---: |
| Production runtime and save compatibility | 381 / 381 pass |
| Universal starter suit | 7 / 7 pass |
| Reserved profile, powers, and existing Fancy/Vice checks | 109 / 109 pass |
| New costume rendering, ownership, and isolation | 18 / 18 pass |

The new rendering gate exercises 336 combinations of costume, 21 action states, presentation, and facing direction. It also checks separate wolf walking and running art, transitions, ghost floating, metallic full-body silhouettes, preservation of saved face/hair/skin settings, skin-key versus blue-cloth separation, sprite margins, load recovery, and separate animation owners.

The normal production build retains identical source-module hashes, compiled bundle hashes, costume IDs/prices, save contract, and game modes compared with the fresh hosted baseline manifest. It still contains 31 outfits. The reserved collection contains four additions, costs 700 test coins per look, requires the exact reserved route and `0000000000` code, uses its existing local save prefix, and makes no cloud writes.

The four lossless atlases contain 200 distinct authored poses: 48 mailman, 48 firefighter, 48 ghost, and 56 wolf. The game-composed overview and wolf gait sheet accompany this report. Approved previews, source action sheets, prompts, and registration reports are retained under `test-only/four-powers/new-costumes-source/`.

The publishing workflow must pass the actual browser gate before deployment. That gate uses fresh local fixtures, buys and equips all four looks for male/female heroes, reloads each purchase without refilling the wallet, rotates the mobile store, samples actual world-renderer wolf walk/run and ghost float, blocks cloud endpoints, and preserves a sentinel in the ordinary live save namespace. Its report and screenshots are uploaded as the `reserved-costume-browser` workflow artifact.

Local browser execution was unavailable because this workspace prohibits the socket operations needed to start Chromium. The passing local checks above do not claim browser execution; the hosted workflow provides that independent publishing gate.
