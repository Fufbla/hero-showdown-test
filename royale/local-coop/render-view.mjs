// Renderer effects spread the game into temporary views. Keep runtime fields
// enumerable on this view while retaining Game methods and shared world objects.
// Only the display loot list is replaced; neither hero's saved loot is mutated.
export function coopRenderView(game,loot){
 return Object.assign(Object.create(Object.getPrototypeOf(game)),game,{loot});
}
