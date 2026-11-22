import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {demoPeople,seed} from './seed.mjs';
const filename=process.env.AKP_DB||'data/asystent.sqlite';
if(filename!==':memory:')mkdirSync(dirname(resolve(filename)),{recursive:true});
export const db=new DatabaseSync(filename);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS accounts (space TEXT, id TEXT, name TEXT, role TEXT, supervisor TEXT, password TEXT, PRIMARY KEY(space,id));
 CREATE TABLE IF NOT EXISTS cases (space TEXT, id TEXT, version INTEGER, body TEXT, PRIMARY KEY(space,id));
 CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, space TEXT NOT NULL, actor TEXT NOT NULL, expires INTEGER NOT NULL);`);
export function transaction(fn) {db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export function digest(token) {return createHash('sha256').update(token).digest('hex');}
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function matchPassword(password,hash){const [salt,key]=hash.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex'));}
export function addAccount(space,a,hash=null){db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(space,a.id,a.name,a.role,a.supervisor||null,hash);}
export const people=space=>db.prepare('SELECT id,name,role,supervisor FROM accounts WHERE space=? ORDER BY name').all(space);
export const readCases=space=>db.prepare('SELECT body FROM cases WHERE space=? ORDER BY rowid').all(space).map(r=>JSON.parse(r.body));
export function insertCase(space,c){db.prepare('INSERT INTO cases VALUES(?,?,?,?)').run(space,c.id,c.version,JSON.stringify(c));}
export function makeDemo(space){for(const a of demoPeople)addAccount(space,a);for(const c of seed())insertCase(space,c);}
export function expire(now=Date.now()){
  transaction(()=>{
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
    for(const table of ['cases','accounts'])db.exec("DELETE FROM "+table+" WHERE space LIKE 'demo-%' AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.space="+table+".space)");
  });
}
