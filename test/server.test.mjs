import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';
const root=new URL('../',import.meta.url);
async function runServer(t,mode='demo',file=':memory:'){
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,AKP_MODE:mode,AKP_DB:file,PORT:'0',HOST:'127.0.0.1'},windowsHide:true,stdio:['ignore','pipe','inherit']});
  t.after(async()=>{if(child.exitCode==null){const exit=once(child,'exit');child.kill();await exit;}});
  const [line]=await once(child.stdout,'data');return String(line).match(/http:\/\/[^ ]+/)[0];
}
function client(url){
  let cookie='';
  return async(path,p)=>{
    const res=await fetch(url+'/api/'+path,{method:p?'POST':'GET',headers:{...(p?{'content-type':'application/json'}:{}),cookie},...(p?{body:JSON.stringify(p)}:{})});
    if(res.headers.has('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
    return {status:res.status,data:await res.json()};
  };
}
test('Serwer izoluje demonstracje, odrzuca zapisy starej wersji i akcje cudzej roli',async t=>{
 const url=await runServer(t),a=client(url),b=client(url);
 const {data:s}=await a('state'),c=s.cases[0];
 await b('state');
 const payload={id:c.id,version:c.version,action:'note',date:s.today,criterion:'quality',kind:'fact',fact:'Test izolacji',impact:''};
 assert.equal((await a('action',payload)).status,200);assert.equal((await a('action',payload)).status,409);
 assert.equal((await b('state')).data.cases[0].notes.length,c.notes.length);
 const role=await a('profile',{id:c.employee});assert.equal(role.data.cases.length,1);assert.equal(role.data.cases[0].notes.length,0);
 assert.equal((await a('action',{...payload,version:c.version+1})).status,403);
 assert.equal((await a('action',{...payload,id:'demo-piotr'})).status,403);
 const bad=await fetch(url+'/api/profile',{method:'POST',headers:{'content-type':'application/json','origin':'https://example.invalid'},body:'{}'});assert.equal(bad.status,403);
});
test('Tryb urzędu wymaga hasła, sprawdza podległość, blokuje zmianę roli i zachowuje bazę po restarcie',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'akp-test-')),file=join(dir,'store.sqlite');
 // Register cleanup after the child servers have stopped; test.after runs in registration order.
 const url=await runServer(t,'office',file),client1=client(url);
 const db=new DatabaseSync(file),salt=randomBytes(16).toString('hex'),pass='test-local-only',hash=salt+':'+scryptSync(pass,salt,64).toString('hex');
 for(const [id,role,manager] of [['manager','manager',null],['employee','employee','manager'],['other','employee',null],['hr','hr',null]])
   db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run('office',id,id,role,manager,hash);
 db.close();
 assert.equal((await client1('state')).data.actor,null);
 assert.equal((await client1('login',{login:'manager',password:'wrong'})).status,401);
 assert.equal((await client1('login',{login:'manager',password:pass})).status,200);
 assert.equal((await client1('profile',{id:'hr'})).status,403);
 const data={employee:'employee',start:'2026-01-02',sheet:'C',employment:'contract',office:'Urząd próbny',town:'Łódź',unit:'Biuro',position:'Inspektor',managerPosition:'Kierownik',managerUnit:'Biuro',duties:'Obsługa wniosków'};
 assert.equal((await client1('create',{...data,employee:'other'})).status,422);
 const created=await client1('create',data);assert.equal(created.status,200);
 const repeated=await Promise.all([client1('create',data),client1('create',data)]);assert.deepEqual(repeated.map(x=>x.status),[422,422]);
 const url2=await runServer(t,'office',file),other=client(url2);await other('login',{login:'other',password:pass});assert.equal((await other('state')).data.cases.length,0);
 const reviewer=client(url2);await reviewer('login',{login:'hr',password:pass});assert.equal((await reviewer('state')).data.cases[0].id,created.data.updated);
 await reviewer('logout',{});assert.equal((await reviewer('state')).data.actor,null);
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
});
