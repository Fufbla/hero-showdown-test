import {FLIGHT_SUITS,FLIGHT_PIECES} from './flight-armor.mjs';
import {AGILITY_SUITS,AGILITY_PIECES} from './agility-armor.mjs';
import {SPEED_SUITS,SPEED_PIECES} from './speed-armor.mjs';
import {SUPER_KICK_SUITS,SUPER_KICK_PIECES} from './super-kick-armor.mjs';
import {WHIRLWIND_SUITS,WHIRLWIND_PIECES} from './whirlwind-armor.mjs';
import {STRENGTH_SUITS,STRENGTH_PIECES} from './strength-armor.mjs';
import {ROOTS_SUITS,ROOTS_PIECES} from './roots-armor.mjs';
import {FIREBALL_SUITS,FIREBALL_PIECES} from './power-armor.mjs';
import {COSTUME_PARTS} from './costume-catalog.mjs';
import {STEEL_SUITS,STEEL_PIECES} from './steel-armor.mjs';
import {Game} from './core.mjs';
import {emptyInventory,EQUIPMENT} from './equipment.mjs';
import {styleCDefault} from './style-c-defaults.mjs';
import {PROFILE_KEY} from './saves.mjs';
export const ARMOR_COLLECTIONS={
  fireball:{suits:FIREBALL_SUITS,catalog:FIREBALL_PIECES,powerName:'Fireball',color:'red',number:'01'},
  steel:{suits:STEEL_SUITS,catalog:STEEL_PIECES,powerName:'Steel Body',color:'blue',number:'02'},
  flight:{suits:FLIGHT_SUITS,catalog:FLIGHT_PIECES,powerName:'Flight',color:'sky-blue',number:'09'},
  agility:{suits:AGILITY_SUITS,catalog:AGILITY_PIECES,powerName:'Agility',color:'black and violet',number:'08'},
  speed:{suits:SPEED_SUITS,catalog:SPEED_PIECES,powerName:'Speed',color:'emerald',number:'07'},
  superKick:{suits:SUPER_KICK_SUITS,catalog:SUPER_KICK_PIECES,powerName:'Super Kick',color:'silver',number:'06'},
  whirlwind:{suits:WHIRLWIND_SUITS,catalog:WHIRLWIND_PIECES,powerName:'Whirlwind',color:'purple',number:'05'},
  strength:{suits:STRENGTH_SUITS,catalog:STRENGTH_PIECES,powerName:'Super Strength',color:'gold',number:'04'},
  roots:{suits:ROOTS_SUITS,catalog:ROOTS_PIECES,powerName:'Ground Roots',color:'green',number:'03'},
};

export function reviewInventory(suit) {
 const inventory=emptyInventory();
 for(const part of COSTUME_PARTS){const id=suit.setId+'-'+part;if(!EQUIPMENT[id])throw Error('Unknown armor');
 const uid='drop-'+inventory.nextId++;inventory.items.push({catalogId:id,uid});inventory.equipped[part]=uid;}
 return inventory;
}
export function reviewProfile(power,tier,look,owned,session) {
 const collection=ARMOR_COLLECTIONS[power],suit=collection?.suits[tier];
 if(!suit||!/^armor-review-[a-z0-9-]+$/.test(session))throw Error('Invalid review session');
 const g=new Game({look:look||styleCDefault('male')});g.hero.level=99;g.hero.maxHp=g.hero.hp=1570;
 g.powers.data.levels[power]=20;g.powers.data.points=78;
 g.powers.data.equipped=[power==='speed'?null:power,null,null];
 g.inventory=owned?reviewInventory(suit):emptyInventory();g.hero.coins=suit.price;g.refreshEquipment();
 if(!owned)g.visitTree();
 const stamp=new Date().toISOString();
 return {key:'royale-test-'+session+':'+PROFILE_KEY,url:'index.html?qa=1&testSession='+session,
 profile:{version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:'Coastal Beginnings',snapshot:JSON.parse(g.save())},null,null]}};
}

export function reviewSessionId(random=globalThis.crypto){
 return 'armor-review-'+Array.from(random.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('-');
}
