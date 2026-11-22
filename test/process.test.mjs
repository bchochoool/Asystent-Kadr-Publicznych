import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,addMonths,isWorking,working,absenceDays,deadline,outcome,criteria,forms,policy,today,nextStep} from '../public/rules.mjs';
import {newCase,apply,publicCase} from '../lib/process.mjs';
import {createCycle,transferCase,viewState} from '../lib/registry.mjs';
import {seed,demoPeople} from '../lib/seed.mjs';
import {partner,draftFeedback,agenda} from '../public/partner.mjs';
import {paper} from '../public/print.mjs';
const [manager,other,hr,employee]=demoPeople;
const c0=()=>structuredClone(seed()[0]);
const payload=c=>({scores:Object.fromEntries(criteria(c).map(k=>[k,5])),meeting:today(),plan:'Omówić przykłady z mentorem.',rationale:''});
test('Arkusze A/B/C i kompletność ocen cząstkowych',()=>{
 for(const [sheet,count] of [['A',6],['B',5],['C',5]]){
   const c={sheet,extras:[],scores:{}};assert.equal(criteria(c).length,count);assert.equal(outcome(c),null);
   c.scores=Object.fromEntries(forms[sheet].map(k=>[k,5]));assert.deepEqual(outcome(c),{mean:5,level:2,positive:true});
   c.scores[forms[sheet][0]]=4;assert.equal(outcome(c),null);
 }
});
test('Granice przedziałów, ocena 1 i niezaokrąglona średnia',()=>{
 const c=c0();for(const [a,b,level] of [[1,3,0],[3,5,1],[5,7,2],[7,9,3],[9,9,4]]){
   c.scores=Object.fromEntries(criteria(c).map((k,i)=>[k,i%2?a:b]));assert.equal(outcome(c).level,level);
 }
 c.scores=Object.fromEntries(criteria(c).map((k,i)=>[k,i===0?1:9]));
 assert.equal(outcome(c).positive,false);assert.ok(outcome(c).mean>6);
});
test('Kalendarz KPRM, święta ruchome, Wigilia i lata przestępne',()=>{
 assert.equal(addMonths('2024-01-31',1),'2024-02-29');assert.equal(addMonths('2024-01-31',13),'2025-02-28');
 assert.equal(working('2026-12-24'),'2026-12-28');assert.equal(working('2026-04-05'),'2026-04-07');
 assert.equal(isWorking('2026-06-04'),false);assert.equal(working('2026-11-21'),'2026-11-23');
});
test('Ciągłość nieobecności przez weekend, próg miesiąca, nakładanie',()=>{
 assert.equal(absenceDays([{from:'2026-10-05',to:'2026-10-16'},{from:'2026-10-19',to:'2026-11-06'}]),33);
 assert.equal(absenceDays([{from:'2026-10-05',to:'2026-11-04'}]),0);
 assert.equal(absenceDays([{from:'2026-10-05',to:'2026-11-05'},{from:'2026-11-02',to:'2026-11-04'}]),32);
});
test('Tylko pracownik potwierdza rozmowę, po potwierdzeniu kryteria są zamknięte',()=>{
 const c=c0();c.stage='draft';const p={openDate:c.start,goals:'',expectations:'Pisemna odpowiedź.',extras:['service']};
 assert.throws(()=>apply(c,'opening',{...p,extras:['quality']},manager));
 assert.throws(()=>apply(c,'opening',{...p,extras:['analysis','service','negotiation','speaking']},manager));
 assert.throws(()=>apply(c,'opening',{...p,extras:['service','service']},manager));
 apply(c,'opening',p,manager);
 assert.throws(()=>apply(c,'acceptOpening',{town:'Opole'},manager));
 apply(c,'acceptOpening',{town:'Opole'},employee);assert.equal(c.stage,'active');
 assert.throws(()=>apply(c,'saveOpening',p,manager));
});
test('Negatywna wymaga uzasadnienia, każda ocena IPRZ, kwalifikacja wniosku',()=>{
 const c=c0(),p=payload(c);p.scores.quality=1;assert.throws(()=>apply(c,'review',p,manager),/uzasadnienia/);
 p.rationale='Brak załącznika.';assert.throws(()=>apply(c,'review',{...p,plan:' '},manager),/IPRZ/);
 p.promotion={rank:3,year:2014,date:'2020-01-01',reason:'Wyniki pracy'};assert.throws(()=>apply(c,'review',p,manager),/pozytywnej/);
 p.scores.quality=5;p.promotion.rank=9;assert.throws(()=>apply(c,'review',p,manager));
 p.promotion.rank=3;apply(c,'review',p,manager);assert.equal(c.stage,'written');assert.equal(c.promotion.rank,3);
 assert.throws(()=>apply(c,'saveReview',p,manager));apply(c,'ack',{town:'Łódź'},employee);assert.equal(c.stage,'closed');
});
test('Ochrona prywatnych notatek, niewidoczny szkic i podległość',()=>{
 const c=c0();apply(c,'saveReview',payload(c),manager);
 for(const actor of [employee,hr]){
   const rep=publicCase(c,actor);assert.equal(rep.notes.length,0);assert.deepEqual(rep.scores,{});assert.equal(rep.plan,'');
 }
 assert.equal(viewState(demoPeople,[c],other.id,false).cases.length,0);
 assert.equal(viewState(demoPeople,[c],employee.id,false).profiles.length,0);
 assert.throws(()=>apply(c,'review',payload(c),other));
 assert.doesNotMatch(paper(c,true),new RegExp(c.notes[0].fact));
});
test('Rejestr sprzeciwu, ponowne sporządzenie, zachowanie poprzedniej wersji',()=>{
 const c=c0();apply(c,'review',payload(c),manager);apply(c,'ack',{town:'Toruń'},employee);
 assert.throws(()=>apply(c,'appeal',{text:'Zastrzeżenie'},employee,addDays(c.ackDate,14)));
 apply(c,'appeal',{text:'Proszę o ponowne rozpatrzenie.'},employee);
 apply(c,'resolve',{decision:'redo',reason:'Dyrektor uwzględnił sprzeciw.'},hr);
 assert.equal(c.stage,'active');assert.deepEqual(c.scores,{});assert.equal(c.archive[0].record.stage,'closed');
});
test('Zmiana stanowiska przed i po sześciu miesiącach',()=>{
 const c=c0();c.openDate=c.openSigned=c.openAck='2025-01-10';c.start='2025-01-01';
 const p={date:'2025-07-10',detail:'Nowe zadania',position:'Koordynator',sheet:'B'};
 apply(c,'jobChange',p,hr);assert.equal(c.stage,'draft');assert.equal(c.sheet,'B');
 assert.equal(nextStep(c).date,working(addDays(p.date,30)));
 const later=c0();later.openDate=later.openSigned=later.openAck='2025-01-10';
 apply(later,'jobChange',{...p,date:'2025-07-11',lastWorkDay:'2025-07-09'},hr,'2025-07-01');
 assert.equal(later.early.from,'2025-07-04');assert.equal(later.early.to,'2025-08-11');
});
test('Okres w arkuszu wynika z potwierdzenia i daty sporządzenia lub ostatniego dnia na stanowisku',()=>{
 const c=c0();c.openDate=c.openSigned='2025-01-10';c.openAck='2025-01-13';
 const p={...payload(c),meeting:'2025-07-08',from:'2025-01-10',to:'2025-07-08'};
 assert.throws(()=>apply(structuredClone(c),'review',{...p,meeting:'2025-01-12'},manager,'2025-07-09'),/Rozmowa oceniająca/);
 const ordinary=apply(structuredClone(c),'review',p,manager,'2025-07-09');
 assert.equal(ordinary.from,'2025-01-13');assert.equal(ordinary.to,'2025-07-09');
 const jobChange={date:'2025-07-14',lastWorkDay:'2025-07-11',detail:'Nowe obowiązki'};
 assert.throws(()=>apply(structuredClone(c),'jobChange',{...jobChange,lastWorkDay:'2025-07-14'},hr,'2025-07-01'),/Ostatni dzień/);
 apply(c,'jobChange',jobChange,hr,'2025-07-01');
 assert.throws(()=>apply(structuredClone(c),'review',{...p,meeting:'2025-07-06'},manager,'2025-07-06'),/okno/i);
 const beforeChange=apply(structuredClone(c),'review',p,manager,'2025-07-09');
 assert.equal(beforeChange.to,'2025-07-09');
 apply(c,'review',p,manager,'2025-07-15');
 assert.equal(c.to,'2025-07-11');assert.match(paper(c),/13\.01\.2025 – 11\.07\.2025/);
});
test('Zmiana przełożonego zachowuje kryteria i odcina poprzedni dostęp',()=>{
 const c=c0();transferCase(demoPeople,c,{manager:other.id,position:'Dyrektor',unit:'Wydział'},hr);
 assert.equal(c.manager,other.id);assert.equal(c.openManager.name,manager.name);assert.deepEqual(c.extras,['service']);
 assert.equal(viewState(demoPeople,[c],manager.id,false).cases.length,0);
});
test('Ujemny wynik uruchamia sześciomiesięczny cykl od zapoznania, wybór kryteriów w 7 dni',()=>{
 const c=c0(),p=payload(c);p.scores.quality=1;p.rationale='Uzasadnienie.';apply(c,'review',p,manager);apply(c,'ack',{town:c.town},employee);
 const next=createCycle(demoPeople,[c],manager,c);assert.equal(next.previous.result,'negative');assert.equal(next.baseDue,addMonths(c.ackDate,6));
 assert.equal(nextStep(next).date,working(addDays(c.writtenDate,7)));
});
test('Uzasadnione rekomendacje bez nadawania punktów',()=>{
 const c=c0(),r=partner(c);
 assert.equal(r.covered,3);assert.equal(r.cards.length,3);assert.equal(r.cards[0].source.kind,'load');
 assert.equal(r.cards[0].related.length,1);assert.notEqual(r.cards[0].source.date,r.cards[0].related[0].date);
 assert.ok(agenda(c,'feedback').includes(r.cards[0].question));assert.ok(draftFeedback(c).includes(c.notes[0].fact));
 assert.ok(!draftFeedback(c).includes(r.cards[0].source.fact));
 c.openAck=addDays(today(),-10);assert.equal(partner(c).cards[0].related.length,0);
 assert.deepEqual(c.scores,{});c.notes=[];assert.equal(partner(c).cards.length,0);
});
test('Wydruk w trakcie cyklu zawiera część I, a po zatwierdzeniu także część II',()=>{
 const c=c0();apply(c,'saveReview',{...payload(c),plan:'Roboczy wpis'},manager);
 assert.match(paper(c),/Część I\./);assert.doesNotMatch(paper(c),/Część II\.|Roboczy wpis/);
 apply(c,'review',payload(c),manager);assert.match(paper(c),/Część II\./);
 assert.match(paper(c),/Omówić przykłady z mentorem/);
});
test('Nieobecność i jawne zawiadomienie korygują termin jednokrotnie',()=>{
 const c=c0();const from=addDays(c.start,10),to=addDays(from,35);
 apply(c,'absence',{from,to},hr);const old=deadline(c);
 assert.throws(()=>apply(c,'absence',{from,to},hr));
 apply(c,'reschedule',{date:addDays(today(),45),reason:'absenceManager',detail:'Uzgodniony termin.'},manager);
 assert.equal(c.events.at(-1).old,old);assert.equal(c.absences.length,1);assert.throws(()=>apply(c,'absence',{from,to},hr));assert.equal(deadline(c),working(addDays(today(),45)));
});
