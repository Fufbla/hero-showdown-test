// Stable renderer owners stay outside snapshots and cannot leak across peers.
export class CostumeOwners {
 constructor(){this.entries=new Map();}
 get(id){if(!this.entries.has(id))this.entries.set(id,{});return this.entries.get(id);}
 retain(ids){const active=new Set(ids);for(const id of this.entries.keys())if(!active.has(id))this.entries.delete(id);}
}
