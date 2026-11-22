import {absenceDays,addDays,addMonths,criteria,deadline,forms,isDate,names,outcome,points,policy,today,working} from '../public/rules.mjs';

export class Problem extends Error {
  constructor(message,status=422) {super(message);this.status=status;}
}
export function check(ok,message,status) {if(!ok) throw new Problem(message,status);}
function string(v,label,required=true,max=5000) {
  check(v==null || typeof v==='string','Niepoprawna wartość pola '+label+'.');
  const value=(v??'').trim();
  check(value.length<=max && (!required || value.length>0),'Sprawdź pole „'+label+'”.');
  return value;
}
function when(v,label,min='1900-01-01',max=today()) {
  check(isDate(v) && v>=min && v<=max,'Sprawdź datę w polu „'+label+'”.');return v;
}
function member(v,options,label) {check(options.includes(v),'Wybierz poprawną wartość w polu „'+label+'”.');return v;}
function extraKeys(v,sheet) {
  check(Array.isArray(v) && v.length<=policy.extras && new Set(v).size===v.length &&
    v.every(k=>Object.hasOwn(names,k)&&!forms[sheet].includes(k)),'Wybierz do trzech różnych kryteriów dodatkowych spoza listy obowiązkowej.');
  return v;
}
export function history(c,actor,text) {c.log.push({at:new Date().toISOString(),by:actor.name,text});}
export function newCase(p,actor,employee) {
  check(actor.role==='manager','Arkusz zakłada bezpośredni przełożony.',403);
  const start=when(p.start,'Początek cyklu'),sheet=member(p.sheet,Object.keys(forms),'Rodzaj stanowiska');
  const type=member(p.employment,['contract','appointed'],'Podstawa zatrudnienia');
  const c={id:globalThis.crypto.randomUUID(),version:1,policy:policy.version,stage:'draft',sheet,employment:type,start,
    office:string(p.office,'Urząd',true,200),unit:string(p.unit,'Komórka organizacyjna',sheet!=='A',160),
    position:string(p.position,'Stanowisko',true,160),town:string(p.town,'Miejscowość',true,120),
    employee:employee.id,employeeName:employee.name,manager:actor.id,managerName:actor.name,
    managerPosition:string(p.managerPosition,'Stanowisko przełożonego',true,160),managerUnit:string(p.managerUnit,'Komórka przełożonego',sheet!=='A',160),
    duties:string(p.duties,'Główne obowiązki'),goals:'',expectations:'',extras:[],scores:{},notes:[],absences:[],events:[],log:[],
    previous:{result:'none'},baseDue:addMonths(start,policy.cycle),appeals:[],archive:[],plan:'',rationale:''};
  history(c,actor,'Założenie arkusza '+sheet);return c;
}
function absorbOpening(c,p) {
  c.extras=extraKeys(p.extras,c.sheet);c.expectations=string(p.expectations,'Oczekiwania',false);
  c.goals=string(p.goals,'Cele',false);c.openDate=when(p.openDate,'Rozmowa rozpoczynająca',c.resetDate||c.start);
}
function absorbReview(c,p,final) {
  check(p.scores && typeof p.scores==='object','Uzupełnij oceny cząstkowe.');
  c.scores={};
  for(const k of criteria(c)) {
    const n=p.scores[k];
    if(n!=null && n!=='') c.scores[k]=member(n,points,names[k]);
  }
  c.meeting=when(p.meeting,'Rozmowa oceniająca',c.openDate);
  c.from=when(p.from,'Okres od',c.start);c.to=when(p.to,'Okres do',c.from);
  c.plan=string(p.plan,'Wnioski do IPRZ',final);c.rationale=string(p.rationale,'Uzasadnienie',false);
  const result=outcome(c);
  if(final) {
    check(result,'Oceń każde wybrane kryterium.');
    check(result.positive || c.rationale,'Ocena negatywna wymaga uzasadnienia.');
  }
  c.promotion=null;
  if(p.promotion) {
    check(c.employment==='appointed' && result?.positive,'Wniosek o stopień wymaga mianowania i oceny pozytywnej.');
    const rank=member(Number(p.promotion.rank),[1,2,3,4,5,6,7,8],'Posiadany stopień');
    const year=Number(p.promotion.year);
    check(Number.isInteger(year)&&year>=1900&&year<=Number(today().slice(0,4)),'Sprawdź rok mianowania.');
    const date=when(p.promotion.date,'Data przyznania stopnia',year+'-01-01');
    c.promotion={rank,year,date,reason:string(p.promotion.reason,'Umotywowanie wniosku')};
  }
}
export function canRead(c,a) {return a.role==='hr' || (a.role==='manager' && c.manager===a.id) || (a.role==='employee' && c.employee===a.id);}
export function publicCase(c,a) {
  if(a.role==='manager')return c;
  const copy={...c,notes:[],archive:c.archive.map(v=>({...v,record:v.record?publicCase(v.record,a):null}))};
  if(c.stage==='active'||c.stage==='opening'||c.stage==='draft') Object.assign(copy,{scores:{},plan:'',rationale:'',promotion:null,meeting:null,from:null,to:null});
  if(c.stage==='draft' && a.role==='employee') Object.assign(copy,{extras:[],goals:'',expectations:'',openDate:null});
  return copy;
}
export function apply(c,action,p,a,asOf=today()) {
  check(canRead(c,a),'Nie masz dostępu do tej sprawy.',403);
  const permit=(role,...states)=>{check(a.role===role,'Ta czynność należy do innej roli.',403);check(states.includes(c.stage),'Etap sprawy nie pozwala na tę czynność.',409);};
  let label;
  switch(action) {
    case 'previous': {
      permit('manager','draft');check(!c.previousCase && !c.resetDate,'Dane poprzedniej oceny pochodzą z historii.');
      const result=member(p.result,['none','positive','negative'],'Poprzednia ocena');
      c.previous={result};
      if(result!=='none') {
        const date=when(p.date,'Poprzednia ocena',c.start,c.start);
        const level=member(Number(p.level),[0,1,2,3,4],'Poziom');
        check(result!=='positive'||level>=2,'Ocena pozytywna wymaga poziomu co najmniej na poziomie oczekiwań.');
        const ack=when(p.ack,'Zapoznanie z poprzednią oceną',date);
        c.previous={result,date,level,ack};
        if(c.employment==='appointed') {
          c.previous.rank=member(Number(p.rank),[1,2,3,4,5,6,7,8,9],'Stopień');
          c.previous.rankDate=when(p.rankDate,'Przyznanie stopnia');
        }
      }
      c.baseDue=result==='negative'?addMonths(c.previous.ack,policy.repeat):addMonths(c.start,policy.cycle);
      label='Zapis danych o poprzedniej ocenie';break;
    }
    case 'opening': case 'saveOpening':
      permit('manager','draft');absorbOpening(c,p);
      if(action==='opening'){check(c.expectations,'Opisz oczekiwania wobec pracownika.');c.stage='opening';c.openSigned=asOf;c.openDue=deadline(c);c.openManager={name:c.managerName,unit:c.managerUnit,position:c.managerPosition};}
      label=action==='opening'?'Przekazanie kryteriów po rozmowie':'Zapis projektu kryteriów';break;
    case 'acceptOpening':
      permit('employee','opening');c.stage='active';c.openAck=asOf;c.openTown=string(p.town,'Miejscowość');label='Potwierdzenie rozmowy i kryteriów';break;
    case 'note': {
      permit('manager','active');
      const criterion=member(p.criterion,criteria(c),'Kryterium');
      const kind=member(p.kind,['strength','growth','load','fact'],'Rodzaj obserwacji');
      c.notes.push({id:globalThis.crypto.randomUUID(),date:when(p.date,'Data obserwacji',c.openDate),criterion,kind,
        fact:string(p.fact,'Zaobserwowane działanie'),impact:string(p.impact,'Skutek',false)});
      label='Dodanie obserwacji';break;
    }
    case 'absence': {
      permit('hr','draft','opening','active');
      const from=when(p.from,'Początek nieobecności',c.start);
      const to=when(p.to,'Koniec nieobecności',from);
      check(!c.absences.some(x=>x.from===from && x.to===to),'Ten okres już zapisano.');
      c.absences.push({from,to});label='Usprawiedliwiona nieobecność. Termin oceny '+deadline(c);break;
    }
    case 'requestDate':
      permit('employee','opening','active');check(!c.request,'Wniosek już oczekuje na decyzję.');
      check(asOf>addMonths(c.start,6),'Zmiana w tym trybie wymaga okresu dłuższego niż 6 miesięcy.');
      c.request={date:when(p.date,'Nowy termin',asOf,'2199-12-31'),reason:string(p.reason,'Uzasadnienie')};label='Wniosek o zmianę terminu';break;
    case 'reschedule': {
      permit('manager','opening','active');
      check(asOf>addMonths(c.start,6),'Zmiana w tym trybie wymaga okresu dłuższego niż 6 miesięcy.');
      const reason=member(p.reason,['manager','absenceEmployee','absenceManager','request'],'Podstawa');
      if(reason==='request')check(c.request,'Brak wniosku pracownika.');
      const next=when(p.date,'Termin',asOf,'2199-12-31');
      // The new explicit date already includes all previously recorded absence extensions.
      c.events.push({kind:'reschedule',date:asOf,old:deadline(c),new:next,reason,detail:string(p.detail,'Uzasadnienie'),absences:[...c.absences]});
      c.baseDue=next;c.absenceOffset=absenceDays(c.absences);if(reason==='request')c.request=null;
      label='Pisemne zawiadomienie o zmianie terminu na '+deadline(c);break;
    }
    case 'declineDate':
      permit('manager','opening','active');check(c.request,'Brak wniosku.');label='Odmowa zmiany terminu. '+string(p.reason,'Uzasadnienie');c.request=null;break;
    case 'jobChange': {
      permit('hr','active');const date=when(p.date,'Data zmiany',c.openDate);
      const base=c.previous?.date||c.openDate;
      const detail=string(p.detail,'Nowe obowiązki');
      c.events.push({kind:'jobChange',date,detail,previous:{position:c.position,duties:c.duties,extras:[...c.extras],openDate:c.openDate,openSigned:c.openSigned,openAck:c.openAck,sheet:c.sheet}});
      if(date<=addMonths(base,6)) {
        c.duties=detail;c.position=string(p.position,'Nowe stanowisko');c.sheet=member(p.sheet,Object.keys(forms),'Rodzaj stanowiska');
        c.extras=[];c.stage='draft';c.openDate=null;c.openSigned=null;c.openAck=null;c.resetDate=date;c.scores={};
        label='Ponowny wybór kryteriów w ciągu 30 dni od zmiany stanowiska';
      } else {
        c.early={from:addDays(date,-7),to:working(addDays(date,30)),change:date};
        c.baseDue=c.early.to;c.events.at(-1).absences=[...c.absences];c.absenceOffset=absenceDays(c.absences);label='Wcześniejsza ocena w związku ze zmianą stanowiska';
      }break;
    }
    case 'review': case 'saveReview':
      permit('manager','active');absorbReview(c,p,action==='review');
      if(action==='review'){if(c.early)check(asOf>=c.early.from,'Okno wcześniejszej oceny jeszcze się nie rozpoczęło.');c.stage='written';c.writtenDate=asOf;}
      label=action==='review'?'Sporządzenie oceny na piśmie':'Zapis projektu oceny';break;
    case 'ack':
      permit('employee','written');c.ackTown=string(p.town,'Miejscowość');c.stage='closed';c.ackDate=asOf;label='Potwierdzenie zapoznania z oceną i IPRZ';break;
    case 'appeal':
      permit('employee','closed');check(asOf<=working(addDays(c.ackDate,policy.appeal)),'Upłynął termin złożenia sprzeciwu.');
      check(!c.appeals.some(x=>x.revision===c.writtenDate && !x.reopened),'Sprzeciw do tej wersji został już zarejestrowany.');
      c.appeals.push({at:asOf,revision:c.writtenDate,text:string(p.text,'Treść sprzeciwu')});label='Rejestracja sprzeciwu do dyrektora generalnego';break;
    case 'resolve': {
      permit('hr','closed');const appeal=c.appeals.at(-1);check(appeal && !appeal.decision,'Brak sprzeciwu oczekującego na decyzję.');
      appeal.decision=member(p.decision,['deny','amend','redo'],'Rozstrzygnięcie');appeal.reason=string(p.reason,'Treść decyzji dyrektora generalnego');appeal.decided=asOf;
      if(appeal.decision!=='deny'){
        c.archive.push({date:c.writtenDate,reason:appeal.reason,record:{...structuredClone({...c,archive:[]}),notes:[]}});
        appeal.reopened=true;c.stage='active';c.ackDate=null;c.writtenDate=null;c.promotion=null;
        if(appeal.decision==='redo'){c.scores={};c.meeting=null;c.plan='';c.rationale='';}
      }label='Rejestracja rozstrzygnięcia sprzeciwu';break;
    }
    default: throw new Problem('Nieznana czynność.',404);
  }
  history(c,a,label);c.version++;return c;
}
