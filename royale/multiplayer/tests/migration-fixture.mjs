import {randomUUID} from 'node:crypto';
// Only for isolated tests. Production always uses the transactional Postgres RPC.
export class MemoryMigrationBridge {
  constructor(){this.rows=new Map();this.sources=new Set();}
  async inspect(owner,slot){return this.rows.get(owner+':'+slot)||{revision:0,snapshot:null};}
  async reserve({owner,slot,expectedRevision,source,snapshot,choice}){
    const key=owner+':'+slot,row=await this.inspect(owner,slot);
    if(row.migration)return row;
    if(row.revision!==expectedRevision)throw Error('Account save changed.');
    if(choice==='local'&&row.snapshot)throw Error('Account slot occupied.');
    if(this.sources.has(source))throw Error('Already imported.');
    const result={id:row.id||randomUUID(),slot,migration:true,snapshot:choice==='cloud'?row.snapshot:snapshot,revision:expectedRevision};
    this.sources.add(source);this.rows.set(key,result);return result;
  }
}
