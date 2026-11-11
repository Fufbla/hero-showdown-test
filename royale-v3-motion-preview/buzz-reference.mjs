// The short cut is registered from Chris's corrected Rexi reference. It is a
// dedicated three-view plate, not a mirrored version of the old straight edge.
// Rectangles retain the generated alpha; transparent sheet gutters are omitted.
export const BUZZ_REFERENCE = Object.freeze({
  file:'./assets/hero/style-c-accurate/hair/buzz-reference-v2.png',
  frames:{front:[140,127,434,354],side:[861,126,436,419],back:[1595,126,428,430]},
  // The far temple foreshortens on the original three-quarter face. Pin it
  // inward without widening the near temple or rotating the crown.
  farTempleScale:{male:.75,female:.81},
  // Local head space: [left, top, width, height]. Left mirrors the full profile.
  fits:{
    front:{male:[-29.5,-39,50.4,39.6],female:[-30.2,-39.3,50.7,40.1]},
    side:{male:[-27.4,-33.3,43.4,40.8],female:[-27.2,-32.5,42.7,39.9]},
    back:{male:[-20.659,-29.9,41.184,36.532],female:[-20.857,-28.8,41.58,35.048]},
  },
});
