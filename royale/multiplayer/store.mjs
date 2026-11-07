import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {encodeRuntime,decodeRuntime} from './runtime.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');

// One authority process / durable volume. A competing process is fenced by CAS.
// Room transfers and every affected hero are committed together, before ACK.
export class AuthorityStore {
  constructor(path=':memory:') {
    this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    this.db.exec('CREATE TABLE IF NOT EXISTS authority (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, body TEXT NOT NULL, checksum TEXT NOT NULL);');
    const row=this.db.prepare('SELECT * FROM authority WHERE id=1').get();this.revision=row?.revision||0;
    if(row&&digest(row.body)!==row.checksum)throw Error('Authority integrity check failed; restore a verified backup.');
    this.initial=row?decodeRuntime(row.body):{version:1,rooms:new Map(),heroes:new Map(),imports:new Map(),tick:0};
  }
  commit(state) {
    const body=encodeRuntime(state),hash=digest(body);this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare('SELECT revision FROM authority WHERE id=1').get();
      if((row?.revision||0)!==this.revision)throw Error('Authority writer was superseded. Stop this process.');
      if(row)this.db.prepare('UPDATE authority SET revision=?,body=?,checksum=? WHERE id=1').run(this.revision+1,body,hash);
      else this.db.prepare('INSERT INTO authority VALUES(1,1,?,?)').run(body,hash);
      this.db.exec('COMMIT');this.revision++;return {revision:this.revision,bytes:Buffer.byteLength(body)};
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
  }
  close(){this.db.close();}
}
