# Reference short-hair asset

- User reference: corrected Rexi image attached on 2026-11-06 (`A6223535-5581-4B44-A998-184CB8DA9929(3).jpeg`).
- Mode: built-in image generation, reference edit with a transparent background.
- Final asset: `royale/assets/hero/style-c-accurate/hair/buzz-reference-v2.png`, 2172 × 724 pixels, RGBA. The generated PNG is retained unchanged.
- Three authored views: front three-quarter right, right profile, back. Left mirrors the profile together with the original head.
- Integration: registered crop rectangles omit transparent sheet gutters; per-presentation skull fitting and existing hair-color tinting happen in the renderer. The original hair atlases and original face/body artwork remain unchanged.
- Status: visual approval required before live publication.

## Prompt

```text
Use case: precise-object-edit / production game sprite extraction.
Asset: ONE transparent PNG hair sprite sheet with three equally spaced columns, no labels. This is the SAME short hairstyle in three directions: column 1 = the exact front three-quarter RIGHT-facing hair from the supplied image, column 2 = strict right profile of that same haircut, column 3 = back view.
Input image 1 is the authoritative approved hairstyle reference, not a reference for new facial artwork. Extract and faithfully reproduce ONLY Rexi's short dark-purple tightly coiled hair. Preserve its compact rounded crown, close-cut fine coil texture, black outline, violet highlights, curved natural forehead hairline, slight shallow central dip, and neatly tapered temples. The front sprite must match the shape in the supplied image: rounded and seated on the skull, not the older tall oval wig or a straight rectangular forehead opening. The hairline arcs smoothly above the eyebrows and turns down into short clean sideburns at the temples.
The head is invisible: there must be absolutely NO skin, face, forehead, eyebrows, eyes, ears, earrings, neck, costume, body or mannequin. The front and profile face openings are fully transparent. Back sprite contains hair only with a neat rounded nape. All three sprites must have matching skull scale and the same compact haircut, generous transparent margins, perfectly separated cells, consistent upright orientation. No rotation or skew. Keep the illustrated, detailed Style C hair texture from the reference; do not turn it into flat vector art. Do not add accessories, curls sticking out, bangs, braids, an afro, extra volume, or shaved patterns. No text, borders, arrows, shadows, background or checkerboard pixels. Actual transparent alpha background.
```
