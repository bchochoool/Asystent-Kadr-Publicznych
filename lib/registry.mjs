import {addMonths,outcome,policy,today} from '../public/rules.mjs';
import {check,history,newCase} from './process.mjs';

export function createCycle(roster,cases,actor,input){
  check(actor.role==='manager','Tylko przełożony zakłada arkusz.',403);
  const person=roster.find(x=>x.id===input.employee && x.role==='employee' && x.supervisor===actor.id);
  check(person,'Wybierz pracownika podlegającego temu przełożonemu.');
  const previous=cases.filter(c=>c.employee===person.id).reverse();
  check(!previous.some(c=>c.stage!=='closed'),'Ta osoba ma już otwarty cykl.');
  const prior=previous[0];
  if(prior)check(!prior.appeals.some(x=>!x.decision),'Najpierw zarejestruj rozstrzygnięcie sprzeciwu.');
  const c=newCase({...input,start:prior?.writtenDate||input.start},actor,person);
  if(prior){
    const result=outcome(prior);
    c.previous={date:prior.writtenDate,ack:prior.ackDate,level:result.level,result:result.positive?'positive':'negative'};
    c.baseDue=result.positive?addMonths(c.start,policy.cycle):addMonths(prior.ackDate,policy.repeat);
    c.previousCase=prior.id;
  }
  return c;
}
export function transferCase(roster,c,p,a){
  check(a.role==='hr' && ['draft','opening','active'].includes(c.stage),'Przekazanie sprawy wymaga uprawnień kadr i otwartego cyklu.',403);
  const next=roster.find(x=>x.id===p.manager && x.role==='manager' && x.id!==c.manager);
  check(next,'Wybierz innego przełożonego.');
  check(typeof p.position==='string' && p.position.trim() && p.position.length<=160 && typeof p.unit==='string' && p.unit.trim() && p.unit.length<=160,'Podaj stanowisko i komórkę nowego przełożonego.');
  c.events.push({kind:'manager',date:today(),old:c.managerName,new:next.name});
  c.manager=next.id;c.managerName=next.name;c.managerPosition=p.position.trim();c.managerUnit=p.unit.trim();
  history(c,a,'Przekazanie sprawy do '+next.name+' z zachowaniem ustalonych kryteriów');c.version++;
}
export function viewState(roster,cases,actorId,demo){
  const a=roster.find(x=>x.id===actorId);
  if(!a)return {demo,actor:null};
  const directory=roster.filter(p=>p.id===a.id || a.role==='hr' || (a.role==='manager' && p.supervisor===a.id));
  const visible=cases.filter(c=>canRead(c,a)).map(c=>publicCase(c,a));
  return {demo,actor:a,directory,cases:visible,profiles:demo?roster:[],today:today()};
}
import {canRead,publicCase} from './process.mjs';
