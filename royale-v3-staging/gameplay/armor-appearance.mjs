// Presentation only. Never alter inventory, cosmetic ownership, or saved looks.
export function armorFreeAppearance(outfit={}){
  const {pieces,hideBaseCape,armorOutfitId,...appearance}=outfit||{};
  // Old multiplayer packets can still contain armor pieces and a cape override.
  // Cosmetic layers and their own cape policy are applied by the renderer later.
  return {...appearance,pieces:{}};
}
