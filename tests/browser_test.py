from playwright.sync_api import sync_playwright
import itertools,json
import os
URL="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","index.html"))
fails=[];errs=[]
def ok(c,m):
    print(("PASS " if c else "FAIL ")+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else 0)
    pg.on("requestfailed",lambda r:errs.append("reqfail "+r.url))
    pg.goto(URL)
    # gates
    for g,f in {'and':lambda a,b:a&b,'or':lambda a,b:a|b,'nand':lambda a,b:(a&b)^1,'nor':lambda a,b:(a|b)^1,'xor':lambda a,b:a^b,'xnor':lambda a,b:(a^b)^1,'not':lambda a,b:a^1}.items():
        good=pg.evaluate("""([g,combos])=>{B.clear();const a=B.add('sw',20,20,0,'a'),b=B.add('sw',20,100,0,'b'),G=B.add(g,200,40,0,'g'),L=B.add('led',340,40,0,'l');
        B.wire('a:o','g:a');if(g!=='not')B.wire('b:o','g:b');B.wire('g:o','l:a');
        return combos.map(([x,y])=>{a.on=x;b.on=y;B.run();return [B.nv('l:a'),B.out['g:o']]})}""",[g,[[0,0],[0,1],[1,0],[1,1]]])
        ok(all(v[0]==f(x,y)==v[1] for v,(x,y) in zip(good,[[0,0],[0,1],[1,0],[1,1]])),f"gate {g} {good}")
    # power off
    r=pg.evaluate("()=>{B.power=false;B.run();const v=B.nv('l:a');B.power=true;B.run();return v}");ok(r==0,"power off kills output")
    # ICs
    for ic,d in {'7400':lambda a,b:(a&b)^1,'7402':lambda a,b:(a|b)^1,'7404':None,'7408':lambda a,b:a&b,'7432':lambda a,b:a|b,'7486':lambda a,b:a^b}.items():
        res=pg.evaluate("""(ic)=>{B.clear();const U=B.add('ic',300,20,ic,'u');B.add('vcc',100,0,0,'v');B.add('gnd',100,300,0,'g');
        const info={};const gates=ICS[ic].gates;let allok=true;const nopow=[];
        // test each gate: switches for inputs, LEDs for outputs
        gates.forEach((gt,i)=>{const ins=gt.slice(0,-1),o=gt[gt.length-1];ins.forEach((n,j)=>{B.add('sw',10,10+i*60+j*10,0,'s'+i+j);B.wire('s'+i+j+':o','u:p'+n)});B.add('led',600,10+i*40,0,'l'+i);B.wire('u:p'+o+'','l'+i+':a')});
        const out=[];
        const run=()=>{const rows=[];gates.forEach((gt,i)=>{const n=gt.length-1;for(let m=0;m<(1<<n);m++){for(let j=0;j<n;j++)B.comps.find(c=>c.id==='s'+i+j).on=(m>>j)&1;B.run();rows.push([i,m,B.nv('l'+i+':a')])}});return rows};
        out.push(run());
        B.wire('v:o','u:p14');B.run();const unpow=out[0].every(r=>r[2]===0);
        B.wire('g:o','u:p7');out.push(run());return {unpow,rows:out[1],pk:U.ok}}""",ic)
        exp=True
        for i,m,v in res['rows']:
            n=2 if ic!='7404' else 1
            a=m&1;bb=(m>>1)&1
            e=(a^1) if ic=='7404' else d(a,bb)
            if v!=e: exp=False
        ok(exp and res['pk'],f"IC {ic} truth tables, powered={res['pk']}")
        ok(res['unpow'],f"IC {ic} dead without power/ground pins")
    # experiments
    for i,e in enumerate(json.loads(pg.evaluate("()=>JSON.stringify(EXPS.map(e=>({inp:e.inp.length,rows:rowsOf(e),C:e.C,W:e.W,rowsFixed:!!e.rows})))"))):
        if e['rowsFixed']: continue
        pg.evaluate("(i)=>B.load(EXPS[i].C,EXPS[i].W)",i)
        sw=[c[0] for c in e['C'] if c[1]=='sw'];lds=[c[0] for c in e['C'] if c[1]=='led']
        good=True
        for row in e['rows']:
            ins=row[:e['inp']];outs=row[e['inp']:]
            got=pg.evaluate("([sw,ins,lds])=>{sw.forEach((id,k)=>B.comps.find(c=>c.id===id).on=ins[k]);B.run();return lds.map(l=>B.nv(l+':a'))}",[sw,ins,lds])
            if got!=outs: good=False;print(i,ins,got,outs)
        ok(good,f"experiment {i+1} truth table matches circuit")
    # SR latch
    pg.evaluate("()=>B.load(EXPS[5].C,EXPS[5].W)")
    seq=pg.evaluate("""()=>{const g=i=>B.comps.find(c=>c.id===i),r=[];const st=(s,rr)=>{g('s').on=s;g('r').on=rr;B.run();r.push([B.nv('lq:a'),B.nv('lqn:a')])};
      st(0,1);st(1,0);st(0,0);st(0,1);st(0,0);return r}""")
    ok(seq==[[0,1],[1,0],[1,0],[0,1],[0,1]],f"SR latch set/hold/reset/hold {seq}")
    # UI interaction: real mouse
    pg.evaluate("()=>B.clear()")
    pg.click("#palette button:has-text('Switch')");pg.click("#palette button:has-text('AND')");pg.click("#palette button:has-text('LED')")
    ok(pg.evaluate("()=>B.comps.length")==3,"palette adds parts")
    def pinxy(id):
        return pg.evaluate("(id)=>{const r=document.querySelector(`[data-pin='${id}']`).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}",id)
    cs=pg.evaluate("()=>B.comps.map(c=>[c.id,c.t])");sw,an,ld=[c[0] for c in cs]
    x,y=pinxy(sw+':o');pg.mouse.click(x,y);x,y=pinxy(an+':a');pg.mouse.click(x,y)
    ok(pg.evaluate("()=>B.wires.length")==1,"tap-tap wiring")
    x,y=pinxy(an+':o');pg.mouse.move(x,y);pg.mouse.down();x,y=pinxy(ld+':a');pg.mouse.move(x,y,steps=5);pg.mouse.up()
    ok(pg.evaluate("()=>B.wires.length")==2,"drag wiring")
    pg.evaluate("(id)=>{const c=B.comps.find(c=>c.id===id)}",sw)
    # tie 2nd AND input to switch too
    x,y=pinxy(sw+':o');pg.mouse.click(x,y);x,y=pinxy(an+':b');pg.mouse.click(x,y)
    sbox=pg.evaluate("(id)=>{const r=B.comps.find(c=>c.id===id).g.querySelector('rect.body').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}",sw)
    pg.mouse.click(*sbox);ok(pg.evaluate("()=>B.nv(B.comps[2].id+':a')")==1,"click switch -> LED on")
    pg.mouse.click(*sbox);ok(pg.evaluate("()=>B.nv(B.comps[2].id+':a')")==0,"click switch -> LED off")
    # drag component
    before=pg.evaluate("()=>[B.comps[1].x,B.comps[1].y]")
    gb=pg.evaluate("()=>{const r=B.comps[1].g.querySelector('rect.body').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}")
    pg.mouse.move(*gb);pg.mouse.down();pg.mouse.move(gb[0]+60,gb[1]+40,steps=6);pg.mouse.up()
    after=pg.evaluate("()=>[B.comps[1].x,B.comps[1].y]");ok(after!=before,f"drag move {before}->{after}")
    pg.click("#zin");pg.click("#zout")
    # select+delete wire
    pg.evaluate("()=>B.select('w',B.wires[0])");pg.click("#del");ok(pg.evaluate("()=>B.wires.length")==2,"delete wire")
    pg.evaluate("()=>B.select('c',B.comps[1])");pg.click("#del");ok(pg.evaluate("()=>B.comps.length+','+B.wires.length")=="2,0","delete comp removes its wires")
    pg.once("dialog",lambda d:d.accept());pg.click("#clr");ok(pg.evaluate("()=>B.comps.length")==0,"clear")
    # nav
    for h,sid in [('Board','board'),('Lab sheet','sheet'),('Experiments','experiments'),('ICs','ics'),('Help','help')]:
        pg.click(f"nav a:text-is('{h}')");pg.wait_for_timeout(150);vis=pg.evaluate("()=>[...document.querySelectorAll('.view')].filter(v=>!v.hidden).map(v=>v.id)")
        ok(vis==[sid],f"nav {h} -> {vis}")
    pg.click("nav a:text-is('Experiments')");pg.wait_for_timeout(150);pg.click(".exp:nth-child(4) button");pg.wait_for_timeout(150);ok(pg.evaluate("()=>location.hash")=="#board" and pg.evaluate("()=>B.comps.length")==6,"open exp on board")
    for t in ['guide','signals','power','panel']:
        pg.click(f".tabs button[data-p={t}]");ok(pg.evaluate("(t)=>document.querySelector('#p-'+t).classList.contains('on')",t),f"tab {t}")
    pg.click(".tabs button[data-p=power]");pg.click("#pwr");ok(pg.evaluate("()=>B.power")==False,"power toggle");pg.click("#pwr")
    pg.click("#hx");ok(pg.query_selector("#hint") is None,"hint close")
    ok(pg.evaluate("()=>document.querySelectorAll('#icList .card').length")==6,"6 IC cards")
    ok(pg.evaluate("()=>document.querySelectorAll('#expList .exp svg').length")==7,"7 experiment diagrams")
    ok("2521720044" in pg.inner_text("footer"),"footer ID")
    pg.screenshot(path="/tmp/desk.png")
    b.close()
    # mobile
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':360,'height':740},has_touch=True,is_mobile=True,device_scale_factor=2,user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")
    m=ctx.new_page();m.on("pageerror",lambda e:errs.append("m:"+str(e)));m.goto(URL)
    for h in ['#board','#sheet','#experiments','#ics','#help']:
        m.evaluate("(h)=>{location.hash=h}",h);m.wait_for_timeout(100)
        w=m.evaluate("()=>[document.documentElement.scrollWidth,innerWidth]");ok(w[0]<=w[1],f"mobile no h-overflow {h} {w}")
        m.screenshot(path=f"/tmp/m{h[1:]}.png")
    m.evaluate("()=>{location.hash='#board';B.clear()}")
    m.tap("#palette button:has-text('Switch')");m.tap("#palette button:has-text('LED')")
    def pxy(id):return m.evaluate("(id)=>{const r=document.querySelector(`[data-pin='${id}']`).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}",id)
    ids=m.evaluate("()=>B.comps.map(c=>c.id)")
    m.touchscreen.tap(*pxy(ids[0]+':o'));m.touchscreen.tap(*pxy(ids[1]+':a'))
    ok(m.evaluate("()=>B.wires.length")==1,"mobile touch wiring")
    r=m.evaluate("()=>{const r=B.comps[0].g.querySelector('rect.body').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}")
    m.touchscreen.tap(*r);ok(m.evaluate("()=>B.nv(B.comps[1].id+':a')")==1,"mobile tap switch lights LED")
    m.screenshot(path="/tmp/mboard.png")
    b.close()
print("ERRORS:",errs);print("FAILS:",fails)
