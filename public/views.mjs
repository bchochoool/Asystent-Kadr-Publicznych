import {h,icon,btn,link,field,area,select,submit,options,hint,initials,badge,caseLink,section,roles} from './fields.mjs';
import {today,pretty,shortDate,days,nextStep,stages,positions} from './rules.mjs';
export const navItems=[['home','home','Pulpit'],['cases','file','Arkusze ocen'],['calendar','calendar','Terminy'],['partner','partner','Partner HR']];
export function shell(s,page,body) {
  const items=navItems.filter(x=>x[0]!=='partner'||s.actor.role==='manager');
  const nav=items.map(([key,symbol,label])=>'<a href="#'+key+'" '+((page===key || (page==='case'||page==='new')&&key==='cases')?'aria-current="page"':'')+'>'+icon(symbol)+h(label)+'</a>').join('');
  return '<div class="layout"><aside id="side"><a class="brand" href="#home"><img src="./mark.svg" alt=""><span>Asystent Kadr<br>Publicznych</span></a><nav aria-label="Główna nawigacja">'+nav+'</nav><div class="sidefoot">'+link('Podstawy prawne','law','subnav','book')+'<div class="account"><span class="avatar">'+h(initials(s.actor.name))+'</span><div><strong>'+h(s.actor.name)+'</strong><small>'+roles[s.actor.role]+'</small></div></div></div></aside><div class="workspace"><header class="top"><button class="mobileicon" data-action="menu" type="button" aria-expanded="false" aria-controls="side" aria-label="Menu">'+icon('menu')+'</button><span class="crumb">'+icon('brief')+' Przestrzeń urzędu</span><div class="topright">'+(s.demo?'<span class="demo-tag"><i></i>Dane fikcyjne</span>'+btn('Zmień rolę','profiles','mini','user'):btn('Wyloguj','logout','mini','user'))+'</div></header><main id="main" tabindex="-1">'+body+'</main><footer>Asystent Kadr Publicznych <span>Oceny okresowe w służbie cywilnej</span></footer></div></div>';
}
export function heading(title,sub='',action='') {return '<div class="heading"><div><h1>'+h(title)+'</h1>'+(sub?hint(sub):'')+'</div>'+action+'</div>';}
export function ordered(cases) {return [...cases].sort((a,b)=>nextStep(a).date.localeCompare(nextStep(b).date)||a.employeeName.localeCompare(b.employeeName,'pl'));}
const overdue=(c,asOf)=>c.stage!=='closed'&&nextStep(c).date<asOf?'<span class="late">Po terminie</span>':'';
function dayTile(date) {const d=new Date(date+'T12:00:00Z');return '<div class="daytile"><strong>'+d.getUTCDate()+'</strong><span>'+h(d.toLocaleDateString('pl-PL',{month:'short',timeZone:'UTC'}))+'</span></div>';}
export function rows(list) {
  return list.length?'<div class="rows">'+list.map(c=>'<a class="personrow" href="#'+caseLink(c)+'"><span class="avatar tint'+c.sheet+'">'+h(initials(c.employeeName))+'</span><span class="rowname"><strong>'+h(c.employeeName)+'</strong><small>'+h(c.position)+'</small></span><span class="sheet">Arkusz '+h(c.sheet)+'</span>'+badge(c.stage,stages[c.stage])+icon('chevron')+'</a>').join('')+'</div>':hint('Brak arkuszy odpowiadających wybranym kryteriom.');
}
export function dashboard(s) {
  const open=s.cases.filter(c=>c.stage!=='closed'),active=s.cases.filter(c=>c.stage==='active'),near=open.filter(c=>days(s.today,nextStep(c).date)<=30);
  const actionable=ordered(open.filter(c=>s.actor.role==='employee'?['opening','written'].includes(c.stage):s.actor.role==='manager'?['active','draft'].includes(c.stage):true));
  const focus=actionable[0]||ordered(open)[0];
  const title=focus?({active:s.actor.role==='manager'?'Przygotuj rozmowę oceniającą':'Sprawdź przebieg oceny',draft:'Zaplanuj rozmowę rozpoczynającą',opening:'Potwierdzenie kryteriów',written:'Zapoznanie z oceną'}[focus.stage]):'Wszystkie sprawy domknięte';
  const own=s.actor.role==='employee';
  const hero='<section class="focus"><div><h2>'+h(title)+'</h2><p>'+(focus?h(focus.employeeName)+' <span>·</span> Arkusz '+h(focus.sheet):'Nowe czynności pojawią się po otwarciu cyklu.')+'</p>'+(focus?'<p class="compactdate">'+h(nextStep(focus).label)+' · '+h(pretty(nextStep(focus).date))+'</p>':'')+(focus?link('Otwórz sprawę',caseLink(focus,focus.stage==='active' && s.actor.role==='manager'?'partner':'workflow'),'btn light','arrow'):'')+'</div>'+(focus?'<div class="focus-date">'+dayTile(nextStep(focus).date)+'<span>'+h(nextStep(focus).label)+'</span></div>':'')+'</section>';
  const agendaList=ordered(open).slice(0,3).map(c=>'<a class="dateitem" href="#'+caseLink(c)+'">'+dayTile(nextStep(c).date)+'<div><strong>'+h(c.employeeName)+'</strong><small>'+h(nextStep(c).label)+'</small>'+overdue(c,s.today)+'</div></a>').join('');
  const work='<section class="registry"><div class="sectionhead"><h2>'+(own?'Moje arkusze':'Arkusze zespołu')+'</h2>'+link('Wszystkie','cases')+'</div>'+rows(s.cases.slice(0,5))+'</section>';
  return heading('Pulpit ocen',new Intl.DateTimeFormat('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}).format(new Date()),s.actor.role==='manager'?link('Nowy arkusz','new','btn primary','plus'):'')+hero+
   '<div class="metrics">'+[[open.length,'Otwarte arkusze'],[active.length,'W obserwacji'],[near.length,'Terminy do 30 dni']].map(([n,l])=>'<div><strong>'+n+'</strong><span>'+l+'</span></div>').join('')+'</div><div class="dashboardgrid">'+work+'<section class="dates"><div class="sectionhead"><h2>Terminarz</h2>'+icon('calendar')+'</div>'+(agendaList||hint('Brak otwartych terminów.'))+link('Pełny terminarz','calendar')+'</section></div>';
}
export function casesPage(s) {
  return heading('Arkusze ocen','Wyszukaj osobę lub sprawdź etap jej oceny.',s.actor.role==='manager'?link('Nowy arkusz','new','btn primary','plus'):'')+
  '<div class="filters">'+field('Szukaj osoby lub stanowiska','search','','search')+select('Etap','stage',{all:'Wszystkie etapy',...stages},'all')+select('Kolejność','order',{name:'Nazwisko',date:'Najbliższy termin'},'name')+'</div><div id="matches">'+rows(s.cases)+'</div>';
}
export function calendar(s) {
  const list=ordered(s.cases);return heading('Terminy','Daty wynikają z etapu sprawy i zarejestrowanych zdarzeń.')+'<div class="panel calendarlist">'+(list.map(c=>'<article>'+dayTile(nextStep(c).date)+'<div><small>'+h(pretty(nextStep(c).date))+'</small><h3>'+h(nextStep(c).label)+'</h3>'+overdue(c,s.today)+link(c.employeeName,caseLink(c))+'</div>'+btn('Do kalendarza','ics/'+c.id,'mini','download')+'</article>').join('')||hint('Brak terminów w tym widoku.'))+'</div>';
}
export function partnerIndex(s) {
  return heading('Partner HR','Wybierz sprawę, aby przygotować rozmowę na podstawie obowiązków, kryteriów i swoich obserwacji.')+'<div class="panel">'+s.cases.map(c=>'<a class="personrow" href="#'+caseLink(c,'partner')+'"><span class="avatar tint'+c.sheet+'">'+h(initials(c.employeeName))+'</span><span class="rowname"><strong>'+h(c.employeeName)+'</strong><small>'+h(c.position)+'</small></span><span>'+c.notes.length+' obs.</span>'+icon('chevron')+'</a>').join('')+'</div>';
}
export function newForm(s) {
  const available=s.directory.filter(p=>p.role==='employee'&&!s.cases.some(c=>c.employee===p.id&&c.stage!=='closed'));
  const choices=Object.fromEntries(available.map(p=>[p.id,p.name]));
  const prev=s.cases[0]||{};
  return heading('Nowy arkusz','Wybierz pracownika i rodzaj jego stanowiska. Na tej podstawie system dobierze właściwy arkusz i kryteria.')+
    (available.length?'<form data-form="create" class="panel form"><h2>Dane do części I</h2><div class="formgrid">'+select('Osoba oceniana','employee',choices)+select('Rodzaj stanowiska','sheet',Object.fromEntries(Object.entries(positions).map(([k,v])=>[k,v+' · '+k])),'C')+
    select('Podstawa zatrudnienia','employment',{contract:'Umowa na czas nieokreślony',appointed:'Mianowanie'})+field('Początek cyklu lub data poprzedniej oceny','start',s.today,'date',true)+field('Urząd','office',prev.office,'text',true)+field('Miejscowość przełożonego','town',prev.town,'text',true)+field('Komórka osoby ocenianej (B i C)','unit',prev.unit)+field('Stanowisko osoby ocenianej','position','','text',true)+field('Komórka przełożonego (B i C)','managerUnit',prev.managerUnit)+field('Stanowisko przełożonego','managerPosition',prev.managerPosition,'text',true)+'</div>'+area('Główne obowiązki wynikające z opisu stanowiska','duties','',true)+submit('Utwórz arkusz')+'</form>':section('Wszyscy przypisani pracownicy mają otwarty cykl',hint('Po zakończeniu cyklu możesz utworzyć kolejny arkusz dla tej osoby. W trybie urzędu administrator może przypisać kolejne konta.')));
}
export function law(){
  return heading('Podstawy prawne','Reguły demonstracji według pakietu KPRM na HackNation 2026.')+
    section('Ustawa o służbie cywilnej','<p>Art. 81–83 określają terminy, sprzeciw i tryb oceny. Art. 89 dotyczy stopni służbowych, a art. 108 programu rozwoju zawodowego.</p><a href="https://eli.gov.pl/eli/DU/2026/590/ogl" target="_blank" rel="noreferrer">Tekst jednolity · Dz.U. 2026 poz. 590</a>')+
    section('Rozporządzenie z 4 kwietnia 2016 r.','<p>Arkusze A, B i C, kryteria obowiązkowe i dodatkowe oraz sposób przeliczania wyniku. Kryteria cząstkowe wybiera przełożony.</p><a href="https://eli.gov.pl/eli/DU/2016/470/ogl" target="_blank" rel="noreferrer">Rozporządzenie i załączniki · Dz.U. 2016 poz. 470</a>')+
    section('Materiały KPRM','<p>Opis wyzwania, mapy pól, przykładowe oceny, przypadki użycia i standardy zarządzania zasobami ludzkimi.</p><a href="https://drive.google.com/drive/folders/11ktukNIJQlsKBVGV7rmUNSUYOd2_M9cK" target="_blank" rel="noreferrer">Otwórz folder organizatora</a>');
}
export function profileForm(s,selected=s.actor.id){return heading('Widok uczestnika','Każda rola ma własne uprawnienia. Przełączanie osób jest dostępne w demonstracji z fikcyjnymi danymi.')+'<form class="panel form" data-form="profile">'+select('Osoba i rola','id',Object.fromEntries(s.profiles.map(x=>[x.id,x.name+' · '+roles[x.role]])),selected)+submit('Otwórz widok')+'</form>';}
export function login(){return '<main id="main" class="login"><img src="./mark.svg" width="54" alt=""><h1>Asystent Kadr Publicznych</h1><form data-form="login" class="form"><h2>Logowanie do urzędu</h2>'+field('Login','login','','text',true)+'<label>Hasło<input type="password" name="password" autocomplete="current-password" required></label>'+submit('Zaloguj się')+'</form></main>';}
