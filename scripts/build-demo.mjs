// Native import maps keep the single-file edition independent of a bundler or CDN.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {posix as path} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFileSync(root+'/'+name,'utf8');
const uri=(type,content)=>'data:'+type+';base64,'+Buffer.from(content).toString('base64');
const logo=uri('image/svg+xml',read('public/mark.svg'));
const imports={};
function include(name){
  const id='akp/'+name;
  if(imports[id])return id;
  const file=name==='public/transport.mjs'?'scripts/demo-transport.mjs':name;
  const source=read(file).replaceAll('./mark.svg',logo).replace(/from\s+(['"])(\.\.?\/[^'"]+)\1/g,(_,quote,relative)=>{
    const dependency=path.normalize(path.join(path.dirname(file),relative));
    return 'from '+quote+include(dependency)+quote;
  });
  imports[id]=uri('text/javascript;charset=utf-8',source);return id;
}
const entry=include('public/app.mjs');
const html=read('public/index.html')
  .replace('./mark.svg',logo).replace('<link rel="stylesheet" href="./style.css">','<style>'+read('public/style.css')+'</style>')
  .replace('<script type="module" src="./app.mjs"></script>','<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module">import "'+entry+'";</script>');
mkdirSync(root+'/docs',{recursive:true});writeFileSync(root+'/docs/index.html',html);
console.log('Gotowe: docs/index.html');
