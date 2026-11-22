import {newCase} from './process.mjs';
import {addDays,addMonths,criteria,today} from '../public/rules.mjs';

export const demoPeople=[
  {id:'marta',name:'Marta Wolska',role:'manager'},
  {id:'jan',name:'Jan Borek',role:'manager'},
  {id:'kadry',name:'Ewa Maj',role:'hr'},
  ...[['lena','Lena Nowak'],['piotr','Piotr Lis'],['nina','Nina Wilk'],['adam','Adam Sikora'],['iga','Iga Zięba'],['olga','Olga Kania']].map(([id,name])=>({id,name,role:'employee',supervisor:'marta'}))
];
export function seed() {
  const now=today(),m=demoPeople[0],positions=['Starsza specjalistka','Naczelnik wydziału','Specjalistka','Kierownik urzędu','Inspektorka'];
  return ['active','draft','opening','written','closed'].map((stage,i)=>{
    const employee=demoPeople[i+3],start=i===1?addDays(now,-12):i===2?addDays(now,-19):addMonths(addDays(now,i===0?3:0),-24);
    const c=newCase({start,sheet:['C','B','C','A','C'][i],office:'Urząd Przykładowy',unit:'Wydział Obsługi Spraw',position:positions[i],town:'Bydgoszcz',
      managerPosition:'Dyrektorka departamentu',managerUnit:'Departament Organizacyjny',employment:i===0?'appointed':'contract',
      duties:['Koordynacja obsługi wniosków i upraszczanie pism do mieszkańców.','Organizacja pracy wydziału i wspieranie rozwoju zespołu.',
        'Weryfikacja dokumentacji i obsługa wniosków.','Kierowanie pracą urzędu i realizacja celów strategicznych.','Weryfikacja terminowości spraw.'][i]},m,employee);
    c.stage=stage;c.id='demo-'+employee.id;
    if(stage!=='draft'){
      c.openManager={name:c.managerName,unit:c.managerUnit,position:c.managerPosition};c.openDue=c.baseDue;c.openDate=addDays(start,4);c.openSigned=c.openDate;c.openAck=stage!=='opening'?c.openDate:null;c.openTown=c.town;
      c.expectations='Uzgadniamy terminy z zespołem i dokumentujemy wynik sprawy w rejestrze.';
      c.goals='Uprościć pisma i usprawnić przekazywanie spraw między wydziałami.';
    }
    if(i===0) {
      c.extras=['service'];
      c.notes=[
        {id:'obs-a',kind:'strength',criterion:'communication',date:addDays(now,-34),fact:'Lena przepisała instrukcję uzupełnienia wniosku prostym językiem.',impact:'W pilotażu pięciu mieszkańców uzupełniło dokument bez dodatkowej rozmowy.'},
        {id:'obs-b',kind:'load',criterion:'planning',date:addDays(now,-9),fact:'W tygodniu zastępstwa do kolejki trafiły dwa pilne zestawienia.',impact:'Przegląd wzorów pism przesunięto na następny tydzień.'},
        {id:'obs-c',kind:'growth',criterion:'cooperation',date:addDays(now,-3),fact:'Przy przekazaniu sprawy zabrakło ustalenia osoby odpowiedzialnej za odpowiedź.',impact:'Dwa wydziały równolegle przygotowały odpowiedź.'}
      ];
    }
    if(stage==='written'||stage==='closed'){
      c.scores=Object.fromEntries(criteria(c).map(k=>[k,k==='cooperation'?7:5]));
      c.meeting=addDays(now,-2);c.from=c.openDate;c.to=c.meeting;c.writtenDate=c.meeting;
      c.plan='W kolejnym miesiącu omówić z mentorem dwa przypadki przekazania sprawy między zespołami.';
      if(stage==='closed'){c.ackDate=addDays(now,-1);c.ackTown=c.town;}
    }
    c.log=[{at:start+'T09:00:00Z',by:m.name,text:'Założenie arkusza '+c.sheet}];
    if(c.openSigned)c.log.push({at:c.openSigned+'T09:30:00Z',by:m.name,text:'Ustalenie kryteriów'});
    if(c.openAck)c.log.push({at:c.openAck+'T10:00:00Z',by:employee.name,text:'Potwierdzenie kryteriów'});
    if(c.writtenDate)c.log.push({at:c.writtenDate+'T12:00:00Z',by:m.name,text:'Przekazanie pisemnej oceny'});
    if(c.ackDate)c.log.push({at:c.ackDate+'T10:00:00Z',by:employee.name,text:'Zapoznanie z oceną'});
    return c;
  });
}
