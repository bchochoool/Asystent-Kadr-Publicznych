import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {db,digest,expire,insertCase,makeDemo,matchPassword,passwordHash,people,readCases,transaction} from './lib/db.mjs';
import {apply,canRead,check,Problem} from './lib/process.mjs';
import {createCycle,transferCase,viewState} from './lib/registry.mjs';

const demo=process.env.AKP_MODE!=='office', secure=process.env.AKP_HTTPS==='1';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const publicFiles=new Set(['index.html','style.css','app.mjs','views.mjs','detail.mjs','fields.mjs','rules.mjs','partner.mjs','print.mjs','mark.svg','transport.mjs']);
const dummy=passwordHash(randomUUID()), failures=new Map();
function session(req){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('akp='))?.slice(4)||'';
  return db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(digest(token),Date.now());
}
function issue(res,space,id) {
  const token=randomBytes(32).toString('base64url'),hours=demo?24:8;
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),space,id,Date.now()+hours*3600000);
  res.setHeader('Set-Cookie','akp='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+hours*3600+(secure?'; Secure':''));
  return {space,actor:id};
}
function state(s) {
  if(!s)return {demo,actor:null};
  return viewState(people(s.space),readCases(s.space),s.actor,demo);
}
async function body(req) {
  check((req.headers['content-type']||'').split(';')[0]==='application/json','Wymagany format JSON.',415);
  if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host;}catch{}check(host===req.headers.host,'Obce źródło żądania.',403);}
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;check(size<=64000,'Formularz przekracza dopuszczalny rozmiar.',413);chunks.push(chunk);}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Problem('Niepoprawna treść JSON.',400);}
  check(data && typeof data==='object' && !Array.isArray(data),'Niepoprawny formularz.',400);return data;
}
function send(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function save(s,c,previous) {
  const q=db.prepare('UPDATE cases SET version=?, body=? WHERE space=? AND id=? AND version=?').run(c.version,JSON.stringify(c),s.space,c.id,previous);
  check(q.changes===1,'Sprawa została zmieniona. Odśwież dane przed ponownym zapisem.',409);
}
async function api(req,res,path){
  let s=session(req);
  if(s && (s.space.startsWith('demo-')!==demo))s=null;
  if(req.method==='GET' && path==='/api/state'){
    if(!s && demo)s=transaction(()=>{const space='demo-'+randomUUID();makeDemo(space);return issue(res,space,'marta');});
    return send(res,state(s));
  }
  check(req.method==='POST','Nieobsługiwana metoda.',405);
  const p=await body(req);
  if(path==='/api/login' && !demo){
    const ip=req.socket.remoteAddress,attempt=failures.get(ip);
    check(!attempt || attempt.until<Date.now() || attempt.count<12,'Zbyt wiele prób. Spróbuj za 10 minut.',429);
    const record=db.prepare("SELECT * FROM accounts WHERE space='office' AND id=?").get(typeof p.login==='string'?p.login:'');
    const valid=matchPassword(typeof p.password==='string'?p.password.slice(0,1024):'',record?.password||dummy);
    if(!valid||!record){const f=attempt?.until>Date.now()?attempt:{count:0,until:Date.now()+600000};f.count++;failures.set(ip,f);throw new Problem('Nieprawidłowy login lub hasło.',401);}
    failures.delete(ip);return send(res,state(issue(res,'office',record.id)));
  }
  check(s,'Sesja wygasła. Zaloguj się ponownie.',401);
  if(path==='/api/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);res.setHeader('Set-Cookie','akp=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return send(res,{demo,actor:null});}
  if(path==='/api/profile'){
    check(demo && s.space.startsWith('demo-'),'Zmiana roli jest dostępna tylko w demonstracji.',403);
    check(people(s.space).some(x=>x.id===p.id),'Nieznana osoba.');
    db.prepare('UPDATE sessions SET actor=? WHERE token=?').run(p.id,s.token);s.actor=p.id;return send(res,state(s));
  }
  let id;
  transaction(()=>{
    const a=people(s.space).find(x=>x.id===s.actor);check(a,'Brak konta.',403);
    if(path==='/api/create'){const c=createCycle(people(s.space),readCases(s.space),a,p);insertCase(s.space,c);id=c.id;return;}
    check(path==='/api/action','Nie znaleziono zasobu.',404);
    const row=db.prepare('SELECT version,body FROM cases WHERE space=? AND id=?').get(s.space,typeof p.id==='string'?p.id:'');
    check(row,'Nie znaleziono sprawy.',404);
    const c=JSON.parse(row.body);check(canRead(c,a),'Brak dostępu do sprawy.',403);
    check(row.version===p.version,'Ktoś zmienił ten arkusz. Odśwież widok i sprawdź najnowsze dane.',409);
    if(p.action==='transfer'){
      transferCase(people(s.space),c,p,a);
      db.prepare('UPDATE accounts SET supervisor=? WHERE space=? AND id=?').run(c.manager,s.space,c.employee);
    }else apply(c,p.action,p,a);
    save(s,c,row.version);id=c.id;
  });
  return send(res,{...state(s),updated:id});
}
const app=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.setHeader('Cache-Control','no-store');
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path.startsWith('/api/'))return await api(req,res,path);
    const file=path==='/'?'index.html':path.slice(1);
    check(req.method==='GET' && publicFiles.has(file),'Nie znaleziono strony.',404);
    const types={html:'text/html',mjs:'text/javascript',css:'text/css',svg:'image/svg+xml'};
    const content=await readFile(join(root,file));res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]+'; charset=utf-8'});res.end(content);
  } catch(e){if(!e.status)console.error('Błąd obsługi żądania:',e.message);send(res,{error:e.status?e.message:'Nie udało się zapisać lub odczytać danych.'},e.status||500);}
});
expire();setInterval(()=>{expire();for(const [k,v] of failures)if(v.until<Date.now())failures.delete(k);},3600000).unref();
const port=Number(process.env.PORT??4173),host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log('Asystent Kadr Publicznych · http://'+host+':'+app.address().port+' · '+(demo?'demonstracja':'urząd')));
