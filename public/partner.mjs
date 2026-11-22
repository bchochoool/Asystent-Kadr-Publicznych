import {criteria,names,pretty} from './rules.mjs';
const actions={
  communication:'Przeredaguj jedno pismo z koleżanką lub kolegą. Poproś odbiorcę o streszczenie następnych kroków.',
  cooperation:'Przy trzech kolejnych przekazaniach sprawy uzgodnij właściciela, termin i sposób potwierdzenia odbioru.',
  planning:'Przez dwa tygodnie uzgadniaj na początku tygodnia trzy priorytety i sprawdzaj, co wymaga przesunięcia.',
  quality:'Przejrzyj z mentorem próbkę trzech zakończonych spraw i zapisz wspólną listę kontroli jakości.',
  service:'Sprawdź z odbiorcą, czy po przeczytaniu odpowiedzi wie, jaki krok może wykonać dalej.',
  expertise:'Omów z ekspertem dwie nietypowe sprawy i zapisz, jakie źródła pomogły w rozstrzygnięciu.',
  management:'Na najbliższych spotkaniach zespołu przydziel odpowiedzialność i uzgodnij zakres samodzielności.',
  strategy:'Połącz jeden cel wydziału z miernikiem, osobą odpowiedzialną i terminem przeglądu.'
};
export const noteKinds={strength:'Mocna strona',growth:'Do rozwoju',load:'Obciążenie pracą',fact:'Obserwacja'};
export function partner(c){
  const notes=[...c.notes].sort((a,b)=>b.date.localeCompare(a.date));
  const cards=[];
  for(const kind of ['load','strength','growth']){
    const n=notes.find(x=>x.kind===kind);if(!n)continue;
    const text=kind==='load'?['Uzgodnij priorytety','Które zadanie możemy przesunąć lub przekazać innej osobie?','Ustal z pracownikiem jedną zmianę obciążenia i termin sprawdzenia, czy pomogła.']:
      kind==='strength'?['Doceń konkretny wkład','Co pomogło osiągnąć ten efekt i gdzie jeszcze można to wykorzystać?','Opisz działanie i jego skutek. Zapytaj, czy pracownik chce podzielić się sposobem pracy z zespołem.']:
      ['Zaplanuj ćwiczenie rozwojowe','Co przy następnym podobnym zadaniu warto zrobić inaczej?',actions[n.criterion]||'Wybierz z pracownikiem jedno zadanie do przećwiczenia z mentorem. Po dwóch tygodniach omówcie wynik.'];
    cards.push({kind,title:text[0],question:text[1],action:text[2],source:n});
  }
  const missing=criteria(c).filter(k=>!notes.some(n=>n.criterion===k));
  return {cards,missing,covered:criteria(c).length-missing.length,total:criteria(c).length};
}
export function agenda(c,type) {
  if(type==='opening')return [
    'Które z obowiązków na stanowisku będą najważniejsze w tym cyklu?',
    'Po czym wspólnie poznamy spełnienie kryterium „'+names[criteria(c)[0]]+'”?',
    'Jakie cele wymagają współpracy z innymi osobami i jak sprawdzimy postęp?',
    'Czy termin, kryteria i oczekiwania są zrozumiałe dla obu stron?'];
  const info=partner(c),questions=info.cards.map(x=>x.question);
  return [...(type==='review'?['Jak przebiegała realizacja głównych obowiązków i uzgodnionych celów?']:['Co od naszego ostatniego spotkania ułatwiło lub utrudniło pracę?']),...questions,
    ...(info.missing.length?['Jaki przykład pomoże nam omówić kryterium „'+names[info.missing[0]]+'”?']:[]),
    'Jakie wsparcie uzgodnimy i kiedy wrócimy do jego efektów?'];
}
export function draftFeedback(c) {
  return [...c.notes].sort((a,b)=>a.date.localeCompare(b.date)).map(n=>pretty(n.date)+' · '+names[n.criterion]+'\n'+n.fact+(n.impact?' '+n.impact:'')).join('\n\n');
}
export function suggestionsForDuties(c) {
 const rules=[['analysis',/analiz|zestawień|raport/i],['service',/mieszkań|klient|wniosk|interesant/i],['negotiation',/negocj|uzgodnie/i],['speaking',/prezentac|wystąpi|szkoleni/i],['crisis',/kryzys|interwenc/i],['creativity',/usprawn|upraszcz|projekt/i]];
 return rules.filter(([k,re])=>!criteria(c).includes(k)&&re.test(c.duties)).map(([k])=>names[k]).slice(0,3);
}
