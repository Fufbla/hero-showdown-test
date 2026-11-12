# Approved ordinary Punch and Kick

The reserved `0000000000` KingJames test uses eight complete outfit frames for each ordinary attack. The approved red-jacket artwork includes the small fist/boot contact burst within the complete frame. The existing customized head is registered at each neck anchor; the entire composition mirrors for left-facing combat.

The contact artwork is held only during the existing active hit window. Windup and recovery use the surrounding authored poses. The previous drawn arc is suppressed only while the complete test-hero body is being rendered; asset failure and non-test heroes retain their existing fallback.

Damage, reach, cooldowns, attack rate, movement, power attacks, Steel Body, saves, and multiplayer rules are unchanged. The regular attack update adds a separate atlas and preserves all previously approved body and superpower frames.

Sources: `art/basic-punch-source.webp` and `art/basic-kick-source.webp`, lossless versions of the two artwork previews approved November 12, 2026. Repack with `node tools/build-kingjames-basic-attacks.cjs`; the existing power-atlas build also preserves this pack.

Validation includes the 134 existing automated checks with expanded contact-window and composition coverage. The browser workflow checks both new contact sprites in both directions and verifies that the old curve is absent, alongside ordinary keyboard/touch input, power attacks and progress reloads in Chromium and WebKit at desktop, portrait and landscape sizes.
