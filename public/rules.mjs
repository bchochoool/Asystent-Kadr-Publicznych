// Reguły wersjonowane według materiałów KPRM, Dz.U. 2016 poz. 470.
export const policy = Object.freeze({version:'KPRM-2016/2026.1', cycle:24, repeat:6, setup:30, repeatSetup:7, appeal:7, review:14, rank:30, extras:3});
export const names = {
  communication:'Komunikacja', creativity:'Kreatywność', negotiation:'Negocjowanie',
  planning:'Organizacja pracy i orientacja na osiąganie celów', service:'Orientacja na klienta/interesanta',
  decisions:'Podejmowanie decyzji i odpowiedzialność', crisis:'Radzenie sobie w sytuacjach kryzysowych',
  quality:'Rzetelność', analysis:'Myślenie analityczne', expertise:'Wykorzystywanie wiedzy i doskonalenie zawodowe',
  cooperation:'Współpraca', speaking:'Wystąpienia publiczne', management:'Zarządzanie ludźmi', strategy:'Zarządzanie strategiczne'
};
export const forms = {
  A:['management','decisions','planning','cooperation','communication','strategy'],
  B:['management','decisions','planning','cooperation','communication'],
  C:['expertise','quality','planning','cooperation','communication']
};
export const positions = {A:'Kierownik urzędu',B:'Stanowisko z bezpośrednim kierowaniem pracownikami',C:'Pozostałe stanowisko'};
export const levels = ['Znacznie poniżej oczekiwań','Poniżej oczekiwań','Na poziomie oczekiwań','Powyżej oczekiwań','Znacznie powyżej oczekiwań'];
export const points = [1,3,5,7,9];
export const stages = {draft:'Wybór kryteriów',opening:'Potwierdzenie kryteriów',active:'Obserwacje',written:'Zapoznanie z oceną',closed:'Zakończona'};
export const criteria = c => [...forms[c.sheet],...c.extras];
export function outcome(c) {
  const marks=criteria(c).map(k=>c.scores[k]);
  if (!marks.every(v=>points.includes(v))) return null;
  const mean=marks.reduce((sum,n)=>sum+n,0)/marks.length;
  const level=mean<=2?0:mean<=4?1:mean<=6?2:mean<=8?3:4;
  return {mean,level,positive:level>=2 && !marks.includes(1)};
}
export function isDate(v) {
  if(typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v<'1900-01-01' || v>'2199-12-31') return false;
  const d=new Date(v+'T12:00:00Z'); return !Number.isNaN(+d) && d.toISOString().slice(0,10)===v;
}
const date=v=>new Date(v+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
export function today() {return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw'}).format(new Date());}
export function addDays(v,n) {const d=date(v);d.setUTCDate(d.getUTCDate()+n);return iso(d);}
export function days(a,b) {return Math.round((date(b)-date(a))/86400000);}
export function addMonths(v,n) {
  const d=date(v),day=d.getUTCDate(); d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);
  const end=new Date(d);end.setUTCMonth(end.getUTCMonth()+1,0);d.setUTCDate(Math.min(day,end.getUTCDate()));return iso(d);
}
function easter(y) {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const v=h+l-7*m+114;return iso(new Date(Date.UTC(y,Math.floor(v/31)-1,v%31+1,12)));
}
export function isWorking(v) {
  const d=date(v),y=d.getUTCFullYear(),md=v.slice(5);
  if([0,6].includes(d.getUTCDay()) || ['01-01','01-06','05-01','05-03','08-15','11-01','11-11','12-25','12-26'].includes(md) || (y>=2025 && md==='12-24')) return false;
  const spring=easter(y);return v!==addDays(spring,1) && v!==addDays(spring,60);
}
export function working(v) {while(!isWorking(v)) v=addDays(v,1);return v;}
export function absenceDays(periods) {
  const merged=[];
  for (const p of [...periods].sort((a,b)=>a.from.localeCompare(b.from))) {
    const last=merged.at(-1);
    if (last && p.from<=working(addDays(last.to,1))) {if(p.to>last.to)last.to=p.to;}
    else merged.push({...p});
  }
  return merged.reduce((sum,p)=>sum+(p.to>=addMonths(p.from,1)?days(p.from,p.to)+1:0),0);
}
export const deadline=c=>working(addDays(c.baseDue,absenceDays(c.absences)-(c.absenceOffset||0)));
export function nextStep(c) {
  if(c.stage==='draft'||c.stage==='opening')return {label:'Ustalenie kryteriów',date:working(addDays(c.resetDate||c.start,!c.resetDate && c.previous?.result==='negative'?policy.repeatSetup:policy.setup))};
  if(c.stage==='closed')return {label:'Termin sprzeciwu',date:working(addDays(c.ackDate,policy.appeal))};
  return {label:c.stage==='written'?'Zapoznanie z oceną':'Sporządzenie oceny',date:c.stage==='written'?c.writtenDate:deadline(c)};
}
export const pretty=v=>v?new Intl.DateTimeFormat('pl-PL',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date(v)):'—';
export const shortDate=v=>v?v.split('-').reverse().join('.'):'—';
