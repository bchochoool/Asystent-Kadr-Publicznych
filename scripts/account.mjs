import {randomBytes} from 'node:crypto';
import {addAccount,db,passwordHash} from '../lib/db.mjs';
const [role,id,name,supervisor]=process.argv.slice(2);
if(!['manager','employee','hr'].includes(role)||!/^[a-z0-9._-]{2,80}$/i.test(id||'')||!name||name.length>160)throw Error('Użycie: npm run account -- manager|employee|hr LOGIN "Imię Nazwisko" [LOGIN_PRZEŁOŻONEGO]');
if(role==='employee' && !db.prepare("SELECT 1 FROM accounts WHERE space='office' AND id=? AND role='manager'").get(supervisor||''))throw Error('Podaj istniejący login przełożonego.');
const password=randomBytes(18).toString('base64url');
addAccount('office',{role,id,name,supervisor},passwordHash(password));
console.log('Konto '+id+' utworzone. Przekaż hasło bezpiecznym kanałem: '+password);
