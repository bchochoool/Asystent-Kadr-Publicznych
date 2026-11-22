import {h,icon,btn,link,area,field,select,options,submit,hint,badge,caseLink,section,fold} from './fields.mjs';
import {addDays,addMonths,criteria,deadline,forms,levels,names,outcome,points,policy,positions,pretty,reviewPeriod,stages,working} from './rules.mjs';
import {agenda,draftFeedback,noteKinds,partner,suggestionsForDuties} from './partner.mjs';
import {heading} from './views.mjs';
import {paper} from './print.mjs';
const kv=(k,v)=>'<div><dt>'+h(k)+'</dt><dd>'+h(v||'—')+'</dd></div>';
const form=(action,content,button)=>'<form class="form" data-form="'+action+'">'+content+(button?submit(button):'')+'</form>';
const list=items=>'<ul class="cleanlist">'+items.map(t=>'<li>'+h(t)+'</li>').join('')+'</ul>';
export function detail(s,c,tab){
 const manager=s.actor.role==='manager',tabs={workflow:'Przebieg oceny',...(manager?{partner:'Partner HR',notes:'Obserwacje'}:{}),events:'Zdarzenia kadrowe',document:'Arkusz i historia'};
 if(!Object.hasOwn(tabs,tab))tab='workflow';
 const nav='<nav class="tabs" aria-label="Zakładki sprawy">'+Object.entries(tabs).map(([key,title])=>'<a '+(key===tab?'aria-current="page"':'')+' href="#'+caseLink(c,key)+'">'+h(title)+'</a>').join('')+'</nav>';
 const content=tab==='partner'?partnerView(c):tab==='notes'?notesView(s,c):tab==='events'?eventsView(s,c):tab==='document'?documentView(c,s.demo):workflow(s,c);
 return link('Arkusze ocen','cases','back','back')+heading(c.employeeName,c.position+' · Arkusz '+c.sheet,badge(c.stage,stages[c.stage]))+nav+content;
}
function identity(c) {return '<dl class="facts">'+kv('Urząd',c.office)+kv('Komórka',c.unit)+kv('Przełożony',c.managerName)+kv('Początek cyklu',pretty(c.start))+kv('Termin pisemnej oceny',pretty(deadline(c)))+kv('Rodzaj stanowiska',positions[c.sheet])+'</dl>';}
function steps(c) {
 const order=['draft','opening','active','written','closed'],labels=['Kryteria','Potwierdzenie','Obserwacje i rozmowa','Pisemna ocena','Zapoznanie'];
 const now=order.indexOf(c.stage);
 return '<ol class="steps" aria-label="Etapy oceny">'+labels.map((x,i)=>'<li class="'+(i<now?'done':i===now?'current':'')+'" '+(i===now?'aria-current="step"':'')+'><b>'+(i<now?icon('check'):(i+1))+'</b>'+x+'</li>').join('')+'</ol>';
}
function previous(c,s) {
 if(c.previousCase||c.resetDate)return hint('Dane poprzedniej oceny pochodzą z zakończonego arkusza.');
 return fold('Poprzednia ocena i podstawa terminu',hint('Uzupełnij, gdy cykl rozpoczyna poprzednia ocena. Dla pierwszej oceny pozostaw „Brak”.')+
 form('previous','<div class="formgrid">'+select('Poprzednia ocena','result',{none:'Brak',positive:'Pozytywna',negative:'Negatywna'},c.previous.result)+select('Poprzedni poziom','level',levels,c.previous.level??2)+field('Data poprzedniej oceny (początek cyklu)','date',c.start,'date')+field('Data zapoznania z poprzednią oceną','ack',c.previous.ack||c.start,'date')+(c.employment==='appointed'?field('Obecny stopień służbowy (1–9)','rank',c.previous.rank||1,'number')+field('Data przyznania obecnego stopnia','rankDate',c.previous.rankDate||c.start,'date'):'')+'</div>','Zapisz poprzednią ocenę'));
}
function opening(s,c){
 const extra=Object.keys(names).filter(k=>!forms[c.sheet].includes(k));
 const sugg=suggestionsForDuties(c);
 return section('Rozmowa rozpoczynająca',hint(c.duties)+fold('Plan rozmowy',list(agenda(c,'opening')))+
 form('opening','<h3>Kryteria obowiązkowe</h3>'+list(forms[c.sheet].map(k=>names[k]))+
 '<fieldset><legend>Kryteria dodatkowe · do 3</legend>'+(sugg.length?hint('Do rozważenia ze względu na obowiązki: '+sugg.join(', ')+'.'):'')+
 '<div class="checks">'+extra.map(k=>'<label><input type="checkbox" name="extra" value="'+k+'" '+(c.extras.includes(k)?'checked':'')+'>'+h(names[k])+'</label>').join('')+'</div></fieldset>'+
 field('Data rozmowy rozpoczynającej','openDate',c.openDate||s.today,'date',true)+area('Oczekiwania wobec pracownika','expectations',c.expectations)+area('Cele i sposób ich realizacji (opcjonalnie)','goals',c.goals)+
 '<div class="actions">'+submit('Przekaż kryteria pracownikowi','opening')+submit('Zapisz szkic','saveOpening')+'</div>'))+previous(c,s);
}
function scoreForm(s,c) {
 const fields=criteria(c).map(k=>'<label class="scoreline"><span>'+h(names[k])+'</span><select name="score-'+k+'">'+options({'':'Wybierz punkty'},'')+points.map((n,i)=>'<option value="'+n+'" '+(c.scores[k]===n?'selected':'')+'>'+n+' · '+h(levels[i])+'</option>').join('')+'</select></label>').join('');
 const prom=c.employment==='appointed'?fold('Wniosek o kolejny stopień służbowy','<label class="check"><input type="checkbox" name="wantPromotion" '+(c.promotion?'checked':'')+'>Dołącz wniosek przy ocenie pozytywnej</label><div class="formgrid">'+field('Rok mianowania','year',c.promotion?.year||'','number')+select('Posiadany stopień','rank',Object.fromEntries(pointsForRank().map(n=>[n,''+n])),c.promotion?.rank||1)+field('Data przyznania stopnia','rankDate',c.promotion?.date||'','date')+'</div>'+area('Umotywowanie wniosku','promotionReason',c.promotion?.reason)):'';
 const proposals=partner(c).cards.filter(x=>x.kind==='growth').map(x=>x.action);
 const {from,to}=reviewPeriod(c,s.today);
 return section('Rozmowa oceniająca i pisemna ocena','<div class="actions">'+link('Dodaj obserwację',caseLink(c,'notes'),'textlink','pen')+link('Przygotuj pytania z Partnerem HR',caseLink(c,'partner'),'textlink','partner')+'</div>'+
 '<dl class="facts">'+kv('Od potwierdzenia kryteriów',pretty(from))+kv(to===s.today?'Do dnia sporządzenia oceny':'Do ostatniego dnia na stanowisku',pretty(to))+'</dl>'+
 form('review','<div class="formgrid">'+field('Data rozmowy oceniającej','meeting',c.meeting||s.today,'date',true)+'</div><h3>Oceny cząstkowe przełożonego</h3>'+fields+'<p class="result" id="live-result" role="status">'+h(resultLabel(c))+'</p>'+
 area('Uzasadnienie oceny (obowiązkowe przy negatywnej)','rationale',c.rationale)+(draftFeedback(c)?btn('Wstaw przykłady pracy do uzasadnienia','useFeedback','mini','pen'):'')+area('Wnioski do indywidualnego programu rozwoju zawodowego','plan',c.plan)+(proposals.length?btn('Wstaw propozycję do omówienia','usePlan','mini','leaf'):'')+prom+
 '<div class="actions">'+submit('Zatwierdź ocenę i przekaż','review')+submit('Zapisz szkic oceny','saveReview')+'</div>'));
}
const pointsForRank=()=>Array.from({length:9},(_,i)=>i+1);
export function resultLabel(c){
 const r=outcome(c);return r?'Ocena '+(r.positive?'pozytywna':'negatywna')+' · średnia '+r.mean.toLocaleString('pl-PL',{maximumFractionDigits:2})+' · '+levels[r.level]+(Object.values(c.scores).includes(1)?' · co najmniej jedna ocena cząstkowa wynosi 1':''):'Wynik pojawi się po wskazaniu punktów dla każdego kryterium.';
}
function ackForm(c,which) {return form(which,field('Miejscowość potwierdzenia','town',c.town,'text',true),which==='ack'?'Potwierdzam rozmowę i zapoznanie z oceną':'Potwierdzam rozmowę, kryteria i termin');}
function workflow(s,c) {
 const manager=s.actor.role==='manager',employee=s.actor.role==='employee';
 let body='';
 if(c.stage==='draft' && manager)body=opening(s,c);
 else if(c.stage==='active' && manager)body=scoreForm(s,c);
 else if(c.stage==='closed'||c.stage==='written'){
   body=section('Pisemna ocena okresowa','<p class="result">'+h(resultLabel(c))+'</p><h3>Wnioski do programu rozwoju</h3><p class="preserve">'+h(c.plan)+'</p>'+link('Zobacz pełny arkusz',caseLink(c,'document'))+
    (employee&&c.stage==='written'?ackForm(c,'ack'):''));
   if(c.stage==='closed')body+=postReview(s,c);
 } else {
   body=section(c.stage==='draft'?'Przygotowanie projektu kryteriów':'Ustalone kryteria i oczekiwania',
    list(criteria(c).map(k=>names[k]))+(c.expectations?'<h3>Oczekiwania</h3><p class="preserve">'+h(c.expectations)+'</p>':'')+(c.goals?'<h3>Cele</h3><p class="preserve">'+h(c.goals)+'</p>':'')+hint('Termin sporządzenia oceny: '+pretty(deadline(c))+'.')+
    (employee&&c.stage==='opening'?ackForm(c,'acceptOpening'):hint(c.stage==='opening'?'Oczekuje na potwierdzenie przez osobę ocenianą.':c.stage==='active'?'Trwa okres obserwacji pracy.':'Przełożony przygotowuje część I.')));
 }
 const switcher=s.demo && manager&&['written','opening'].includes(c.stage)
   ? '<p>'+link('Przejdź do widoku '+c.employeeName,'profiles/'+c.employee+'/'+c.id,'btn secondary','user')+'</p>'
   : s.demo && employee && c.stage==='active'
     ? '<p>'+link('Wróć do widoku przełożonego','profiles/'+c.manager+'/'+c.id,'btn secondary','user')+'</p>' : '';
 return steps(c)+body+switcher+fold('Dane sprawy i obowiązki',identity(c)+hint(c.duties));
}
function postReview(s,c){
 const r=outcome(c),p=c.previous,a=c.appeals.at(-1);
 let content=hint('Zapoznanie z oceną: '+pretty(c.ackDate)+'. Sprzeciw do dyrektora generalnego można wnieść do '+pretty(working(addDays(c.ackDate,policy.appeal)))+'.');
 if(!r.positive)content+=hint('Ponowna ocena po upływie 6 miesięcy od zapoznania się z oceną. Wyliczona data: '+pretty(working(addMonths(c.ackDate,policy.repeat)))+'.');
 if(c.employment==='appointed'&&p?.result==='positive'&&p.level>=3&&r.positive&&r.level>=3)
   content+=hint(p.rankDate&&p.rankDate<=p.date&&p.rank<9?'Kadry: sprawdź przyznanie kolejnego stopnia do '+pretty(working(addDays(c.ackDate,policy.rank)))+' (art. 89 ust. 2).':'Kadry: sprawdź datę ostatniego stopnia i jego wysokość w związku z dwiema kolejnymi wysokimi ocenami.');
 if(a){content+='<h3>Sprzeciw z '+h(pretty(a.at))+'</h3><p class="preserve">'+h(a.text)+'</p>'+hint(a.decision?'Zarejestrowana decyzja: '+a.reason:'Termin rozpatrzenia: '+pretty(working(addDays(a.at,policy.review)))+'.');}
 if(s.actor.role==='employee'&&(!a||a.reopened)&&s.today<=working(addDays(c.ackDate,policy.appeal)))content+=fold('Zarejestruj sprzeciw',form('appeal',area('Treść sprzeciwu do dyrektora generalnego','text','',true),'Zarejestruj sprzeciw'));
 if(s.actor.role==='hr'&&a&&!a.decision)content+=form('resolve',select('Decyzja dyrektora generalnego','decision',{deny:'Nieuwzględnienie',amend:'Zmiana oceny',redo:'Ponowne sporządzenie oceny'})+area('Treść rozstrzygnięcia','reason','',true),'Zarejestruj decyzję');
 return section('Po zapoznaniu z oceną',content);
}
export function notesView(s,c) {
 const facts=[...c.notes].sort((a,b)=>b.date.localeCompare(a.date));
 return (c.stage==='active'?section('Dodaj obserwację',form('note','<div class="formgrid">'+field('Data obserwacji','date',s.today,'date',true)+select('Rodzaj obserwacji','kind',noteKinds)+select('Kryterium','criterion',Object.fromEntries(criteria(c).map(k=>[k,names[k]])))+'</div>'+area('Co pracownik zrobił?','fact','',true)+area('Jaki był skutek?','impact'),'Zapisz obserwację')):'')+
 section('Dziennik obserwacji',facts.length?facts.map(n=>'<article class="observation"><small>'+h(pretty(n.date))+' · '+h(noteKinds[n.kind])+'</small><h3>'+h(names[n.criterion])+'</h3><p>'+h(n.fact)+'</p>'+(n.impact?hint(n.impact):'')+'</article>').join(''):hint('Po potwierdzeniu kryteriów możesz zapisywać konkretne działania i ich skutki.'));
}
export function partnerView(c,type=c.stage==='draft'?'opening':'review') {
 const info=partner(c);
 const source=n=>'<blockquote><small>'+h(pretty(n.date))+' · '+h(names[n.criterion])+'</small><p>'+h(n.fact)+'</p>'+(n.impact?hint(n.impact):'')+'</blockquote>';
 return '<div class="partnerintro"><div class="partnericon">'+icon('partner')+'</div><div><h2>Przygotowanie do rozmowy</h2><p>Partner HR łączy przykłady pracy z pytaniami i działaniami rozwojowymi. Punkty przyznaje przełożony.</p></div></div>'+
 section('Przykłady i propozycje działań',info.cards.length?info.cards.map(x=>'<article class="insight"><h3>'+h(x.title)+'</h3><p><strong>Zapytaj</strong> '+h(x.question)+'</p><p><strong>Ustal następny krok</strong> '+h(x.action)+'</p>'+[x.source,...x.related].map(source).join('')+'</article>').join(''):hint('Dodaj pierwszą obserwację, aby powiązać podpowiedź z konkretną sytuacją.'))+
 section('Scenariusz spotkania',select('Rodzaj rozmowy','agendaType',{opening:'Rozmowa rozpoczynająca',feedback:'Bieżąca informacja zwrotna',review:'Rozmowa oceniająca'},type)+'<ol class="agenda">'+agenda(c,type).map(q=>'<li>'+h(q)+'</li>').join('')+'</ol>'+hint('Przy trudnym temacie opisz zachowanie i jego skutek. Zostaw czas na perspektywę pracownika.'))+
 section('Pokrycie kryteriów przykładami','<p><strong>'+info.covered+' z '+info.total+'</strong> kryteriów ma zapisaną obserwację.</p>'+(info.missing.length?hint('Uzupełnij perspektywę podczas rozmowy: '+info.missing.map(k=>names[k]).join(', ')+'.'):'')+link('Otwórz dziennik obserwacji',caseLink(c,'notes')));
}
function eventsView(s,c){
 const editable=['opening','active'].includes(c.stage),hr=s.actor.role==='hr',manager=s.actor.role==='manager';
 let body='';
 if(hr&&['draft','opening','active'].includes(c.stage)) {
 body+=fold('Zarejestruj usprawiedliwioną nieobecność',form('absence',hint('Podaj zakończony okres bez informacji medycznych. System łączy okresy przedzielone dniami wolnymi i przelicza termin, gdy ciągłość przekracza miesiąc.')+field('Od','from','','date',true)+field('Do','to','','date',true),'Zapisz okres'));
 const candidates=s.directory.filter(x=>x.role==='manager'&&x.id!==c.manager);
 if(candidates.length)body+=fold('Zmień przełożonego',form('transfer',select('Nowy przełożony','manager',Object.fromEntries(candidates.map(x=>[x.id,x.name])))+field('Stanowisko nowego przełożonego','position','','text',true)+field('Komórka nowego przełożonego','unit','','text',true),'Przekaż sprawę'));
 if(c.stage==='active')body+=fold('Istotna zmiana stanowiska i obowiązków',form('jobChange','<div class="formgrid">'+field('Data zmiany','date',s.today,'date',true)+field('Ostatni dzień pracy na dotychczasowym stanowisku (przy wcześniejszej ocenie)','lastWorkDay','','date')+'</div>'+field('Nowe stanowisko','position','','text',true)+select('Nowy rodzaj stanowiska','sheet',positions,c.sheet)+area('Opis nowych obowiązków','detail','',true),'Zarejestruj zmianę'));
 }
 if(s.actor.role==='employee'&&editable&&!c.request)body+=fold('Złóż wniosek o zmianę terminu',form('requestDate',field('Proponowany termin','date',deadline(c),'date',true)+area('Uzasadnienie','reason','',true),'Przekaż wniosek'));
 if(c.request)body+=section('Wniosek pracownika',hint(pretty(c.request.date)+' · '+c.request.reason)+(manager?form('declineDate',area('Uzasadnienie odmowy','reason','',true),'Odmów zmiany terminu'):''));
 if(manager&&editable)body+=fold('Zmień termin pisemnej oceny',form('reschedule',hint('Po upływie ponad sześciu miesięcy, w przypadkach z art. 81 ust. 8 ustawy. Zawiadomienie zapisze się w historii.')+select('Podstawa zmiany','reason',{manager:'Zmiana przełożonego',absenceEmployee:'Przewidywana nieobecność pracownika',absenceManager:'Przewidywana nieobecność przełożonego',...(c.request?{request:'Wniosek pracownika'}:{})})+field('Nowy termin','date',c.request?.date||deadline(c),'date',true)+area('Treść zawiadomienia','detail','',true),'Zapisz zawiadomienie'));
 return section('Termin pisemnej oceny',hint(pretty(deadline(c)))+(c.early?hint('Okno wcześniejszej oceny: '+pretty(c.early.from)+' – '+pretty(c.early.to)):''))+body+
 section('Zarejestrowane zdarzenia',list([...c.absences.map(x=>'Nieobecność: '+pretty(x.from)+' – '+pretty(x.to)),...c.events.map(x=>pretty(x.date)+' · '+(x.kind==='manager'?'Zmiana przełożonego: '+x.old+' → '+x.new:x.kind==='jobChange'?'Zmiana stanowiska: '+x.detail:'Zmiana terminu: '+pretty(x.old)+' → '+pretty(x.new)+'. '+x.detail))])+
 (!c.events.length&&!c.absences.length?hint('Brak zdarzeń kadrowych w tym cyklu.'):''));
}
function documentView(c,demo){
 return section('Arkusz '+c.sheet,identity(c)+'<div class="actions">'+btn('Drukuj lub zapisz PDF','print','primary','print')+btn('Pobierz arkusz HTML','export','secondary','download')+'</div>'+hint('Pisemna ocena pojawia się w arkuszu po jej zatwierdzeniu. Wydruk pomija dziennik obserwacji.')+fold('Podgląd arkusza',paper(c,demo)))+
 section('Historia sprawy','<ol class="timeline">'+[...c.log].reverse().map(x=>'<li><strong>'+h(x.text)+'</strong><small>'+h(pretty(x.at.slice(0,10)))+' · '+h(x.by)+'</small></li>').join('')+'</ol>')+
 (c.archive.length?section('Wcześniejsze wersje',c.archive.map(x=>fold('Arkusz z '+pretty(x.date),hint(x.reason)+(x.record?paper(x.record,demo):''))).join('')):'');
}
