const NS='http://www.w3.org/2000/svg',$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el=(n,a,p)=>{const e=document.createElementNS(NS,n);for(const k in a||{})e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const size=c=>c.t==='sw'?[70,40]:c.t==='led'?[40,40]:c.t==='vcc'||c.t==='gnd'?[60,30]:c.t==='ic'?[120,200]:c.t==='not'?[80,40]:[80,50];
function pinsOf(c){
 if(c.t==='sw')return[{n:'o',x:70,y:20,d:'o'}];
 if(c.t==='led')return[{n:'a',x:0,y:20,d:'i'}];
 if(c.t==='vcc'||c.t==='gnd')return[{n:'o',x:60,y:15,d:'o'}];
 if(c.t==='ic'){const outs=new Set(ICS[c.ic].gates.map(g=>g[g.length-1])),r=[];
  for(let i=1;i<=7;i++)for(const [n,x] of [[i,0],[15-i,120]])r.push({n:'p'+n,x,y:30+(i-1)*24,d:outs.has(n)?'o':(n==7||n==14)?'p':'i',num:n});return r}
 return GD[c.t].n?[{n:'a',x:0,y:20,d:'i'},{n:'o',x:80,y:20,d:'o'}]:[{n:'a',x:0,y:15,d:'i'},{n:'b',x:0,y:35,d:'i'},{n:'o',x:80,y:25,d:'o'}];}
class Board{
 constructor(svg,edit){Object.assign(this,{svg,edit,comps:[],wires:[],out:{},power:true,n:0,sel:null,pend:null,pe:{}});
  this.gw=el('g',{},svg);this.gc=el('g',{},svg);this.gt=el('g',{},svg);this.tp=el('path',{'pointer-events':'none',fill:'none',stroke:'#f0b429','stroke-width':3,'stroke-dasharray':'6 4'},this.gt);
  if(edit){svg.addEventListener('pointermove',e=>{if(this.pend){const a=this.pos(this.pend),q=this.pt(e);this.tp.setAttribute('d',this.path(a.x,a.y,q.x,q.y))}});
   addEventListener('pointerup',e=>{if(this.drag&&this.pend){const t=document.elementFromPoint(e.clientX,e.clientY),p=t&&t.dataset&&t.dataset.pin;if(p&&p!==this.pend&&this.pe[p]){this.wire(this.pend,p);this.setPend(null)}}this.drag=0});
   svg.addEventListener('pointerdown',e=>{if(e.target===svg){this.setPend(null);this.select()}});
   addEventListener('keydown',e=>{if(e.key==='Delete'&&this.edit&&$('#board')&&!$('#board').hidden)this.del()})}}
 pt(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(this.svg.getScreenCTM().inverse());return p}
 pos(id){const[c,n]=id.split(':'),k=this.comps.find(x=>x.id===c),p=k.pins.find(x=>x.n===n);return{x:k.x+p.x,y:k.y+p.y}}
 path(x1,y1,x2,y2){const d=Math.max(40,Math.abs(x2-x1)/2);return`M${x1} ${y1}C${x1+d} ${y1} ${x2-d} ${y2} ${x2} ${y2}`}
 add(t,x,y,ic,id){const c={id:id||'c'+(++this.n),t,x,y,ic,on:0};const k=this.comps.filter(q=>q.t===t).length+1;
  c.lb=t==='sw'?String.fromCharCode(64+k):t==='led'?'Y'+k:t==='ic'?ic:t==='vcc'?'+5V':t==='gnd'?'GND':GD[t].l+k;
  c.pins=pinsOf(c);this.comps.push(c);this.draw(c);this.run();return c}
 draw(c){const[w,h]=size(c),g=el('g',{class:'comp',transform:`translate(${c.x},${c.y})`},this.gc);c.g=g;
  el('rect',{width:w,height:h,rx:8,class:'body '+(c.t==='ic'?'ic':c.t)},g);
  const T=(x,y,s,cl)=>{const t=el('text',{x,y,class:cl||'t'},g);t.textContent=s;return t};
  if(c.t==='sw'){c.knob=el('rect',{y:7,width:26,height:26,rx:5,fill:'#94a3b8'},g);c.tx=T(50,20,c.lb)}
  else if(c.t==='led'){c.dot=el('circle',{cx:20,cy:20,r:12,fill:'#475569'},g);T(20,54,c.lb,'t s')}
  else if(c.t==='vcc'||c.t==='gnd')T(26,15,c.lb);
  else if(c.t==='ic'){T(60,90,c.ic);T(60,108,GD[ICS[c.ic].g].l,'t s');c.st=T(60,126,'','t s');el('path',{d:'M50 0a10 10 0 0 0 20 0',fill:'none',stroke:'#64748b','stroke-width':2},g)}
  else T(40,h/2,GD[c.t].l);
  for(const p of c.pins){const id=c.id+':'+p.n;p.el=el('circle',{cx:p.x,cy:p.y,r:7,class:'pin','data-pin':id},g);this.pe[id]=p.el;
   if(c.t==='ic'){const t=T(p.x?106:14,p.y,p.num,'t s');t.style.textAnchor=p.x?'end':'start'}
   if(this.edit)p.el.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();
    if(this.pend&&this.pend!==id){this.wire(this.pend,id);this.setPend(null)}else if(this.pend===id)this.setPend(null);else{this.setPend(id);this.drag=1}})}
  if(this.edit)g.addEventListener('pointerdown',e=>{if(e.target.dataset.pin)return;this.select('c',c);const q=this.pt(e),sx=q.x-c.x,sy=q.y-c.y;let mv=0;g.setPointerCapture(e.pointerId);
   const m=ev=>{const r=this.pt(ev),nx=Math.max(0,Math.round(r.x-sx)),ny=Math.max(0,Math.round(r.y-sy));if(Math.abs(nx-c.x)+Math.abs(ny-c.y)>3)mv=1;if(mv){c.x=nx;c.y=ny;g.setAttribute('transform',`translate(${nx},${ny})`);this.wpaths()}};
   const u=()=>{g.removeEventListener('pointermove',m);g.removeEventListener('pointerup',u);g.removeEventListener('pointercancel',u);if(!mv&&c.t==='sw'){c.on^=1;this.run()}};
   g.addEventListener('pointermove',m);g.addEventListener('pointerup',u);g.addEventListener('pointercancel',u)})}
 setPend(id){if(this.pend&&this.pe[this.pend])this.pe[this.pend].classList.remove('pend');this.pend=id;this.tp.setAttribute('d','');if(id)this.pe[id].classList.add('pend')}
 wire(a,b){if(this.wires.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a)))return;const g=el('g',{class:'wire'},this.gw),w={a,b,g};
  w.v=el('path',{class:'v'},g);el('path',{class:'h'},g);if(this.edit)g.addEventListener('pointerdown',e=>{e.stopPropagation();this.select('w',w)});
  this.wires.push(w);this.wpaths();this.run()}
 wpaths(){for(const w of this.wires){const a=this.pos(w.a),b=this.pos(w.b),d=this.path(a.x,a.y,b.x,b.y);w.g.querySelectorAll('path').forEach(p=>p.setAttribute('d',d))}}
 select(k,o){if(this.sel)this.sel.o.g.classList.remove('sel');this.sel=k?{k,o}:null;if(k)o.g.classList.add('sel')}
 del(){if(!this.sel)return;const{k,o}=this.sel;if(k==='w'){o.g.remove();this.wires=this.wires.filter(w=>w!==o)}else{
  this.wires=this.wires.filter(w=>{const x=w.a.split(':')[0]===o.id||w.b.split(':')[0]===o.id;if(x)w.g.remove();return!x});o.g.remove();this.comps=this.comps.filter(c=>c!==o);
  for(const p of o.pins){delete this.pe[o.id+':'+p.n];delete this.out[o.id+':'+p.n]}}this.sel=null;this.run()}
 clear(){this.comps.forEach(c=>c.g.remove());this.wires.forEach(w=>w.g.remove());Object.assign(this,{comps:[],wires:[],out:{},pe:{},sel:null,pend:null});this.run()}
 load(C,W){this.clear();for(const[id,t,x,y,ic]of C)this.add(t,x,y,ic,id);for(const[a,b]of W)this.wire(a,b);this.run()}
 sim(){const par={},f=x=>par[x]===x?x:(par[x]=f(par[x])),out=this.out,P=this.power?1:0;
  for(const c of this.comps)for(const p of c.pins)par[c.id+':'+p.n]=c.id+':'+p.n;
  for(const w of this.wires)par[f(w.a)]=f(w.b);
  const drv={};for(const c of this.comps)for(const p of c.pins)if(p.d==='o')(drv[f(c.id+':'+p.n)]??=[]).push(c.id+':'+p.n);
  const nv=this.nv=p=>{let v=0;for(const d of drv[f(p)]||[])v|=out[d]|0;return v};let ch;
  const set=(i,v)=>{if(out[i]!==v){out[i]=v;ch=1}};
  for(let k=0;k<60;k++){ch=0;for(const c of this.comps){const i=c.id+':';
   if(c.t==='sw')set(i+'o',P&&c.on?1:0);else if(c.t==='vcc')set(i+'o',P);else if(c.t==='gnd')set(i+'o',0);
   else if(c.t==='ic'){const d=ICS[c.ic];c.ok=P&&nv(i+'p14')===1&&nv(i+'p7')===0;
    for(const g of d.gates){const o=g[g.length-1];set(i+'p'+o,c.ok?GD[d.g].f(...g.slice(0,-1).map(n=>nv(i+'p'+n))):0)}}
   else if(c.t!=='led'){const g=GD[c.t];set(i+'o',P?g.f(nv(i+'a'),g.n?0:nv(i+'b')):0)}}
   if(!ch)break}}
 paint(){for(const c of this.comps){for(const p of c.pins)p.el.classList.toggle('hi',!!this.nv(c.id+':'+p.n));
   if(c.t==='sw'){const on=c.on;c.knob.setAttribute('x',on?38:6);c.knob.setAttribute('fill',on?'#22c55e':'#94a3b8');c.tx.setAttribute('x',on?20:50);c.tx.textContent=c.lb+(on?'=1':'=0')}
   if(c.t==='led'){const v=this.power&&this.nv(c.id+':a');c.dot.setAttribute('fill',v?'#ef4444':'#475569');c.dot.style.filter=v?'drop-shadow(0 0 8px #ef4444)':''}
   if(c.t==='ic')c.st.textContent=c.ok?'● powered':'○ no power'}
  for(const w of this.wires)w.g.classList.toggle('hi',!!this.nv(w.a))}
 run(){this.sim();this.paint();this.onChange&&this.onChange()}
}
// ---------- UI ----------
const B=new Board($('#svg'),true);let z=1;
const items=[['sw','Switch'],['led','LED'],['vcc','+5V'],['gnd','GND'],...Object.keys(GD).map(k=>[k,GD[k].l]),...Object.keys(ICS).map(k=>['ic',k])];
items.forEach(([t,l])=>{const b=document.createElement('button');b.textContent='+ '+l;if(t==='ic')b.className='g2';b.onclick=()=>{const n=B.comps.length;B.add(t,40+(n*37)%420+(t==='ic'?500:0),30+(n*53)%360,t==='ic'?l:undefined)};$('#palette').appendChild(b)});
function sig(){$('#sigtbl').innerHTML='<tr><th>Component</th><th>Pin levels</th></tr>'+B.comps.map(c=>`<tr><td>${c.lb}</td><td>${c.pins.map(p=>(c.t==='ic'?p.num:p.n)+'='+B.nv(c.id+':'+p.n)).join(' ')}${c.t==='ic'?(c.ok?' ✔ powered':' ✖ no power'):''}</td></tr>`).join('')||'<tr><td colspan=2>Board is empty</td></tr>'}
B.onChange=()=>{$('#status').textContent=`Power ${B.power?'ON':'OFF'} · ${B.comps.length} parts · ${B.wires.length} wires`;if($('#p-signals').classList.contains('on'))sig()};
$$('.tabs button').forEach(b=>b.onclick=()=>{$$('.tabs button').forEach(x=>x.classList.toggle('on',x===b));$$('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+b.dataset.p));if(b.dataset.p==='signals')sig()});
const zoom=d=>{z=Math.min(2.4,Math.max(.5,z+d));$('#svg').setAttribute('width',1200*z);$('#svg').setAttribute('height',700*z)};
$('#zin').onclick=()=>zoom(.2);$('#zout').onclick=()=>zoom(-.2);$('#del').onclick=()=>B.del();$('#clr').onclick=()=>{if(confirm('Clear the whole board?'))B.clear()};
$('#hx').onclick=()=>$('#hint').remove();
$('#pwr').onclick=()=>{B.power=!B.power;$('#ptxt').textContent=B.power?'ON':'OFF';$('#pwr').textContent='Turn power '+(B.power?'OFF':'ON');B.run()};
// experiments
const rowsOf=e=>e.rows||[...Array(1<<e.inp.length).keys()].map(m=>{const i=e.inp.map((_,k)=>(m>>(e.inp.length-1-k))&1);return[...i,...e.fn(...i)]});
EXPS.forEach((e,i)=>{const d=document.createElement('div');d.className='exp';
 d.innerHTML=`<h3>Experiment ${i+1}: ${e.t}</h3><p><b>Aim:</b> ${e.aim}</p><p><b>Apparatus:</b> ${e.app}</p><b>Procedure</b><ol>${e.proc.map(p=>`<li>${p}</li>`).join('')}</ol><b>Truth table</b><div class="scroll"><table><tr>${[...e.inp,...e.out].map(h=>`<th>${h}</th>`).join('')}</tr>${rowsOf(e).map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</table></div><b>Circuit diagram</b><br>`;
 let x2=0,y2=0;for(const[,t,x,y,ic]of e.C){const[w,h]=size({t});x2=Math.max(x2,x+w);y2=Math.max(y2,y+h)}
 const s=el('svg',{viewBox:`-10 -10 ${x2+40} ${y2+30}`});d.appendChild(s);new Board(s,false).load(e.C,e.W);
 const b=document.createElement('button');b.textContent='Open on virtual board ▶';b.onclick=()=>{B.load(e.C,e.W);location.hash='#board'};d.appendChild(b);$('#expList').appendChild(d);
 const li=document.createElement('li');li.innerHTML=`<a href="#experiments">${e.t}</a>`;$('#sheetIdx').appendChild(li)});
// ICs
for(const[k,d]of Object.entries(ICS)){const nm={7:'GND',14:'VCC'};d.gates.forEach((g,i)=>g.forEach((p,j)=>nm[p]=j===g.length-1?`${i+1}Y`:`${i+1}${'AB'[j]}`));
 let s=`<svg class="pinsvg" viewBox="0 0 260 190"><rect x="80" y="10" width="100" height="170" rx="6" fill="#111827"/><path d="M120 10a10 10 0 0 0 20 0" fill="none" stroke="#64748b" stroke-width="2"/><text x="130" y="100" text-anchor="middle" fill="#fff" style="fill:#fff;font-size:16px">${k}</text>`;
 for(let i=1;i<=7;i++){const y=30+(i-1)*22;for(const[n,x]of[[i,60],[15-i,180]]){s+=`<rect x="${x}" y="${y-6}" width="20" height="12" fill="#94a3b8"/><text class="n" x="${x+(x<100?4:12)}" y="${y+3}">${n}</text><text x="${x<100?55:205}" y="${y+4}" text-anchor="${x<100?'end':'start'}">${nm[n]}</text>`}}
 const c=document.createElement('div');c.className='card';c.innerHTML=`<h3>${k} — ${d.t}</h3>${s}</svg><p class="m">Pin 14 = VCC (+5V), pin 7 = GND. Dot/notch end at top, pins numbered anticlockwise.</p><table><tr><th>Gate</th><th>Inputs</th><th>Output</th></tr>${d.gates.map((g,i)=>`<tr><td>${i+1}</td><td>${g.slice(0,-1).join(', ')}</td><td>${g[g.length-1]}</td></tr>`).join('')}</table>`;$('#icList').appendChild(c)}
// routing
function route(){let h=(location.hash||'#board').slice(1);if(!$('#'+h)||!$('#'+h).classList.contains('view'))h='board';$$('.view').forEach(s=>s.hidden=s.id!==h);$$('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+h));scrollTo(0,0)}
addEventListener('hashchange',route);route();B.load(EXPS[0].C,EXPS[0].W);
