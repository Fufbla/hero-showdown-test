# Six approved live fashion outfits

Approved designs and recovered animation artwork for outfits 23–28:
Summer Chic, Tropical Beauty, Sunset Elegance, Little Black Dress,
Red Carpet Romance, and Midnight Glamour.

The production build appends these six entries to the unchanged 22-costume
collection. Each complete cosmetic outfit costs 700 coins. Artwork and runtime
modules are under `royale/fashion/`; staging and test outfit collections are not
changed. The existing universal head, hairstyles, character proportions,
animation timing, combat, armor bonuses, ownership IDs and save schema remain.

Each new outfit has 116 complete poses across 17 existing animation clips.
The renderer uses the existing whole-character animator and personalized head;
there are no independent limb rigs. Summer Chic's warm pink skin markers are
mapped to the player's skin color without changing the original sprite PNGs.

## Verification before publication

- 197 release checks passed, including all 696 new poses, all 28 purchases,
  equip/removal/reload, existing ownership, stale-save protection, two-player
  local co-op, and actual armor damage/defense comparisons.
- 7 starter-suit regression checks passed.
- Browser inspection covered all six outfits in idle, running, jumping,
  double jumping, punching and kicking, plus the existing 28-entry store.
- Browser preview uses memory-only fixtures with storage and external requests
  disabled. No real player accounts or saves were used or changed.
- Review pages, tests and backend sources are excluded from the production
  website artifact.

## Save-service compatibility and rollback

The existing production game uses the function named `royale-v3-staging`.
Its name and save namespace are preserved to retain player accounts. The
retrieved version-10 source is kept under `royale/fashion/backend-v3/baseline`.
The deploy package only extends its cosmetic policy with the six new IDs;
account/auth handlers, save schema, economy and power guards are byte-for-byte
unchanged. No database migration or player-record update is performed.

Production source before this addition:
`91c9199987878e8516fd32d076f7fd2d75afdfb8`.
Rollback ref: `rollback/pre-fashion-six-20261113`.
Production URL: https://fufbla.github.io/hero-showdown-test/royale/

This document records pre-publication verification. Deployment completion must
be confirmed separately against the live release manifest and served files.
