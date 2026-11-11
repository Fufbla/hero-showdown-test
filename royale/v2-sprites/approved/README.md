# Approved V3 hero artwork

The active game atlas for the isolated test hero is `approved-action-atlas-clean.png`.
It is 1536 × 1024 pixels, with 24 transparent 256 × 256 cells in a
six-column / four-row grid. It preserves the approved character's appearance
and its painted power effects, without presentation-board scenery.

The older `approved-action-atlas.avif` and `approved-action-atlas.svg`
are retained only as historical prototypes and **are not loaded**.

Only the local `0000000000` test hero uses this optional atlas. Other heroes,
cloud saves, combat damage, multiplayer and game physics are unaffected.
If the new PNG fails to decode, the hero automatically falls back to the
existing renderer.

The existing multi-frame running animation is kept for ordinary running,
because the approved sheet contains only one running pose per facing.
Some large power and motion effects touch a cell boundary; check the rendered
gameplay rather than assuming all effects have a generous empty margin.
