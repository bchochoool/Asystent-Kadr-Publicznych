import {api} from './transport.mjs';
import {h,icon,caseLink,submit,link} from './fields.mjs';
import {calendar,casesPage,dashboard,heading,law,login,newForm,ordered,partnerIndex,profileForm,rows,shell} from './views.mjs';
import {detail,partnerView,resultLabel} from './detail.mjs';
import {nextStep,addDays,pretty,criteria} from './rules.mjs';
import {draftFeedback,partner} from './partner.mjs';
import {paper,printStyles} from './print.mjs';
const root=document.querySelector('#app'),notice=document.querySelector('#notice');
let state,current,notificationTimer,busy=false;
const route=()=>location.hash.slice(1).split('/').map(x=>{try{return decodeURIComponent(x);}catch{return '';}});
function message(text,error=false) {
  clearTimeout(notificationTimer);notice.className=error?'error':'success';notice.textContent=text;
  notificationTimer=setTimeout(()=>{notice.textContent='';notice.className='';},error?15000:5500);
}
function render(){
 current=null;document.querySelector('#paper').replaceChildren();
 if(!state?.actor){root.innerHTML=login();return;}
 const [page='home',key,tab]=route();let content='';
 switch(page){
 case '':case 'home':content=dashboard(state);break;
 case 'cases':content=casesPage(state);break;
 case 'calendar':content=calendar(state);break;
 case 'partner':if(state.actor.role==='manager')content=partnerIndex(state);break;
 case 'law':content=law();break;
 case 'profiles':if(state.demo)content=profileForm(state,key);break;
 case 'new':if(state.actor.role==='manager')content=newForm(state);break;
 case 'case':
   current=state.cases.find(c=>c.id===key);if(current)content=detail(state,current,tab);break;
 }
 root.innerHTML=shell(state,page||'home',content||heading('Brak dostępu do widoku','Sprawdź wybraną rolę lub wróć do pulpitu.',link('Pulpit','home','btn secondary')));
 if(page==='cases')filterRows();
 document.title=(root.querySelector('h1')?.textContent||'Pulpit')+' · Asystent Kadr Publicznych';
}
function filterRows(){
 const query=root.querySelector('[name="search"]').value.toLocaleLowerCase('pl').trim();
 const stage=root.querySelector('[name="stage"]').value;
 const list=state.cases.filter(c=>(stage==='all'||c.stage===stage)&&(c.employeeName+' '+c.position).toLocaleLowerCase('pl').includes(query));
 const orderedList=root.querySelector('[name="order"]').value==='date'?ordered(list):list.sort((a,b)=>a.employeeName.split(' ').at(-1).localeCompare(b.employeeName.split(' ').at(-1),'pl'));
 root.querySelector('#matches').innerHTML=rows(orderedList);
}
function goto(hash){if(location.hash==='#'+hash){render();return;}location.hash=hash;}
function download(data,type,filename){
 const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function calendarFile(c){
 const event=nextStep(c),d=event.date.replaceAll('-',''),end=addDays(event.date,1).replaceAll('-','');
 const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Asystent Kadr Publicznych//PL','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+c.id+'-'+c.stage+'@asystent.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+end,'SUMMARY:'+event.label+' - arkusz '+c.sheet,'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-P1D','DESCRIPTION:Termin oceny okresowej','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
 download(content,'text/calendar;charset=utf-8','termin-'+event.date+'.ics');
}
function appendDraft(f,name,text){
 const input=f.elements.namedItem(name);if(!text)return;
 if(!input.value.includes(text))input.value=[input.value.trim(),text].filter(Boolean).join('\n\n');
 input.focus();message('Dodano propozycję. Możesz ją zredagować przed zapisaniem.');
}
root.addEventListener('click',async e=>{
 const t=e.target.closest('[data-action]');if(!t)return;const [action,id]=t.dataset.action.split('/');
 try{
 if(action==='menu'){const open=document.body.classList.toggle('menuopen');t.setAttribute('aria-expanded',String(open));}
 if(action==='profiles')goto('profiles');
 if(action==='logout'){state=await api('logout',{});goto('home');render();}
 if(action==='ics')calendarFile(state.cases.find(c=>c.id===id));
 if(action==='print'){document.querySelector('#paper').innerHTML=paper(current,state.demo);window.print();}
 if(action==='export')download('<!doctype html><html lang="pl"><meta charset="utf-8"><title>Arkusz '+current.sheet+'</title><style>'+printStyles+'</style>'+paper(current,state.demo)+'</html>','text/html;charset=utf-8','arkusz-'+current.sheet+'-'+current.id+'.html');
 if(action==='useFeedback')appendDraft(t.form,'rationale',draftFeedback(current));
 if(action==='usePlan')appendDraft(t.form,'plan',partner(current).cards.filter(x=>x.kind==='growth').map(x=>x.action).join('\n'));
 if(action==='refresh'){state=await api('state');render();}
 }catch(err){message(err.message,true);}
});
function readScores(form){return Object.fromEntries(criteria(current).filter(k=>form.elements['score-'+k].value!=='').map(k=>[k,Number(form.elements['score-'+k].value)]));}
root.addEventListener('input',e=>{
 if(e.target.name==='search')filterRows();
 if(e.target.name?.startsWith('score-'))root.querySelector('#live-result').textContent=resultLabel({...current,scores:readScores(e.target.form)});
});
root.addEventListener('change',e=>{
 if(['stage','order'].includes(e.target.name))filterRows();
 if(e.target.name==='extra'){const f=e.target.form,boxes=[...f.querySelectorAll('[name="extra"]')];if(boxes.filter(b=>b.checked).length>3){e.target.checked=false;message('Można wybrać najwyżej trzy dodatkowe kryteria.',true);}}
 if(e.target.name==='agendaType'){const main=root.querySelector('.partnerintro');const box=document.createElement('div');box.innerHTML=partnerView(current,e.target.value);main.parentElement.querySelector('.agenda').replaceWith(box.querySelector('.agenda'));}
});
root.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const f=e.target,form=f.dataset.form;
 if(!form)return;
 const fd=new FormData(f),p=Object.fromEntries(fd),action=e.submitter?.value||form;
 let path='action',dest=null;
 if(form==='create'){path='create';}
 else if(form==='profile'){path='profile';const id=route()[2];dest=id?'case/'+id+'/workflow':'home';}
 else if(form==='login'){path='login';dest='home';}
 else {
   Object.assign(p,{id:current.id,version:current.version,action});
   if(form==='opening')p.extras=fd.getAll('extra');
   if(form==='review'){p.scores=readScores(f);p.promotion=p.wantPromotion?{rank:p.rank,year:p.year,date:p.rankDate,reason:p.promotionReason}:null;}
 }
 const submitter=e.submitter;busy=true;if(submitter)submitter.disabled=true;
 try{
   state=await api(path,p);
   if(dest?.startsWith('case/')&&!state.cases.some(c=>c.id===route()[2]))dest='home';
   if(path==='create')dest='case/'+state.updated+'/workflow';
   if(path==='action'&&!state.cases.some(c=>c.id===p.id))dest='cases';
   if(dest)goto(dest);render();
   message(path==='profile'?'Otworzono widok: '+state.actor.name+'.':path==='login'?'Zalogowano.':'Zapisano zmiany.');
 }catch(err){
   let box=f.querySelector('.formerror');if(!box){box=document.createElement('p');box.className='formerror';box.setAttribute('role','alert');f.append(box);}
   box.textContent=err.message;if(err.status===409){const b=document.createElement('button');b.type='button';b.dataset.action='refresh';b.className='btn mini';b.textContent='Wczytaj aktualny arkusz';box.append(' ',b);}
   box.scrollIntoView({block:'nearest'});message(err.message,true);
 }finally{busy=false;if(submitter)submitter.disabled=false;}
});
window.addEventListener('hashchange',()=>{document.body.classList.remove('menuopen');render();window.scrollTo(0,0);root.querySelector('#main')?.focus({preventScroll:true});});
window.addEventListener('beforeprint',()=>{if(current)document.querySelector('#paper').innerHTML=paper(current,state.demo);});
async function start(){try{state=await api('state');render();}catch{root.innerHTML='<main id="main"><h1>Nie udało się otworzyć pulpitu</h1><p>Sprawdź połączenie z serwerem urzędu i odśwież stronę.</p><a href="">Spróbuj ponownie</a></main>';}}
start();
