export function h(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export const fullName=a=>a.name;
export const roles={manager:'Przełożony',employee:'Pracownik',hr:'Kadry'};
const glyphs={
 home:'M3 11 12 4l9 7v9h-6v-6H9v6H3z',file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
 calendar:'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5',team:'M4 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2 M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M16 6a3 3 0 0 1 0 6 M17 15q4 0 4 5',
 partner:'M3 4h18v13H10l-5 4v-4H3z M7 10h2 M12 10h2 M17 10h1',arrow:'M5 12h14 M13 6l6 6-6 6',
 chevron:'m9 6 6 6-6 6',down:'m6 9 6 6 6-6',plus:'M12 5v14 M5 12h14',bell:'M5 16h14l-2-4V9a5 5 0 0 0-10 0v3z M10 19q2 3 4 0',
 book:'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1z M12 6v14',lock:'M5 10h14v11H5z M8 10V7a4 4 0 1 1 8 0v3',
 clock:'M12 3a9 9 0 1 0 .01 0 M12 7v6l4 2',check:'m4 12 5 5L20 6',search:'M10 4a6 6 0 1 0 .01 0 M15 15l5 5',
 print:'M7 8V3h10v5 M7 17H4V9h16v8h-3 M7 14h10v7H7z',leaf:'M3 20q1-8 10-12 M6 16C2 9 9 4 21 3c-1 10-5 16-15 13z',
 back:'M19 12H5m6-6-6 6 6 6',user:'M12 3a4 4 0 1 0 .01 0 M4 21v-2a8 8 0 0 1 16 0v2',menu:'M3 6h18 M3 12h18 M3 18h18',
 brief:'M3 8h18v12H3z M8 8V5h8v3 M3 13q9 5 18 0',link:'M10 14l4-4 M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0 M13 15a3 3 0 0 0 4 0l5-5a3 3 0 0 0-4-4l-2 2',
 pen:'m4 16 12-12 4 4L8 20l-5 1z M14 6l4 4',download:'M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4',info:'M12 3a9 9 0 1 0 .01 0 M12 11v6 M12 7v1'
};
export const icon=(id)=>'<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+glyphs[id]+'"/></svg>';
export const btn=(text,action,style='secondary',symbol='')=>'<button type="button" class="btn '+style+'" data-action="'+h(action)+'">'+(symbol?icon(symbol):'')+h(text)+'</button>';
export const link=(text,route,style='textlink',symbol='')=>'<a class="'+style+'" href="#'+h(route)+'">'+(symbol?icon(symbol):'')+h(text)+'</a>';
export const field=(label,name,value='',type='text',req=false)=>'<label>'+h(label)+'<input type="'+h(type)+'" name="'+h(name)+'" value="'+h(value)+'" '+(req?'required ':'')+(type==='text'?'maxlength="200"':'')+'></label>';
export const area=(label,name,value='',req=false)=>'<label>'+h(label)+'<textarea name="'+h(name)+'" rows="3" maxlength="5000" '+(req?'required':'')+'>'+h(value)+'</textarea></label>';
export const options=(list,current)=>Object.entries(list).map(([v,t])=>'<option value="'+h(v)+'" '+(String(current)===v?'selected':'')+'>'+h(t)+'</option>').join('');
export const select=(label,name,list,value='',req=true)=>'<label>'+h(label)+'<select name="'+h(name)+'" '+(req?'required':'')+'>'+options(list,value)+'</select></label>';
export const submit=(label,action='')=>'<button class="btn primary" type="submit" '+(action?'value="'+h(action)+'"':'')+'>'+h(label)+'</button>';
export const hint=text=>'<p class="muted">'+h(text)+'</p>';
export const initials=name=>String(name).split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('');
export const badge=(stage,label)=>'<span class="badge '+h(stage)+'"><i></i>'+h(label)+'</span>';
export const caseLink=(c,tab='workflow')=>'case/'+encodeURIComponent(c.id)+'/'+tab;
export const section=(title,body)=>'<section class="panel"><h2>'+h(title)+'</h2>'+body+'</section>';
export const fold=(title,body,open=false)=>'<details class="fold" '+(open?'open':'')+'><summary>'+h(title)+'</summary><div>'+body+'</div></details>';
