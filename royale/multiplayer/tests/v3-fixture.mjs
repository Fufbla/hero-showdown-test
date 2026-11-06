import {randomUUID,randomBytes} from 'node:crypto';
import {Game} from '../../core.mjs';
import {SaveConflict} from '../v3-checkpoints.mjs';
export class MemoryV3Bridge {
  constructor(){this.rows=new Map();this.tokens=new Map();this.writes=[];}
  identity(name,slot=0){
    const profile=randomUUID(),id='v3:'+profile,token=randomBytes(32).toString('hex');
    const account={id,profile,slot,kind:'v3',expiresAt:Date.now()+3600000};this.tokens.set(token,account);
    const game=new Game({look:{name}});this.rows.set(profile+':'+slot,{snapshot:JSON.parse(game.save()),revision:0,updated_at:new Date().toISOString()});
    return {account,token};
  }
  async authenticate(token,{slot}={}){const account=this.tokens.get(token);if(!account||account.slot!==slot)throw Error('Invalid fixture session.');return {...account};}
  async read(profile,slot){const row=this.rows.get(profile+':'+slot);if(!row)throw Error('No saved hero.');return structuredClone(row);}
  async write(profile,slot,revision,snapshot){
    const key=profile+':'+slot,row=this.rows.get(key);
    if(row.revision!==revision){if(row.revision===revision+1&&JSON.stringify(row.snapshot)===JSON.stringify(snapshot))return structuredClone(row);throw new SaveConflict('Newer cloud progress preserved.');}
    const saved={snapshot:structuredClone(snapshot),revision:revision+1,updated_at:new Date().toISOString()};
    this.rows.set(key,saved);this.writes.push({profile,slot,...structuredClone(saved)});return structuredClone(saved);
  }
}
