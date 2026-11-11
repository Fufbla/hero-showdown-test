# Approved V3 hero artwork

The user-approved 24-pose sprite atlas belongs here as `approved-action-atlas.webp` (1536 x 1024, with six columns, four rows and 256px transparent cells). The approved source contact sheet belongs here as `original-approved-concept.png`.

Only the local `0000000000` V2 test hero loads this optional atlas. The renderer safely falls back to original animation if it is absent. The ground running animation deliberately keeps its existing multi-frame loop because the approved concept includes only one run pose per direction.

Do not merge to production without verifying alpha-matted edges and running/jumping visually in-browser.
