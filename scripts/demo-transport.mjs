import {demoPeople,seed} from '../lib/seed.mjs';
import {apply,check} from '../lib/process.mjs';
import {createCycle,transferCase,viewState} from '../lib/registry.mjs';
const key='akp-demo-2026-v1';
let memory;
function load(){
  try {const saved=sessionStorage.getItem(key);if(saved)return JSON.parse(saved);}catch{}
  return memory||{actor:'marta',roster:structuredClone(demoPeople),cases:seed()};
}
function save(data){memory=data;try{sessionStorage.setItem(key,JSON.stringify(data));}catch{}}
export async function api(path,p={}){
  const data=structuredClone(load()),a=data.roster.find(x=>x.id===data.actor);
  let updated;
  if(path==='profile'){
    check(data.roster.some(x=>x.id===p.id),'Nieznana osoba.');data.actor=p.id;
  } else if(path==='create'){
    const c=createCycle(data.roster,data.cases,a,p);data.cases.push(c);updated=c.id;
  } else if(path==='action'){
    const c=data.cases.find(x=>x.id===p.id);
    check(c && c.version===p.version,'Dane arkusza uległy zmianie.',409);
    if(p.action==='transfer'){transferCase(data.roster,c,p,a);data.roster.find(x=>x.id===c.employee).supervisor=c.manager;}
    else apply(c,p.action,p,a);
    updated=c.id;
  } else check(path==='state','Niedostępne w przenośnej demonstracji.');
  save(data);return {...viewState(data.roster,data.cases,data.actor,true),updated};
}
