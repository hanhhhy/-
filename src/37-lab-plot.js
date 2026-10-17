
/* 项目专用 Canvas 绘图：折线、散点、柱形、图例、悬停与 PNG 导出。 */
function installLabPlot(root){
'use strict';
const instances=new WeakMap(),palette=['#2166ac','#cf6b22','#7953b8','#13826b','#b63c67'];
const num=v=>v===0?'0':Math.abs(v)<.001||Math.abs(v)>=10000?Number(v).toExponential(2):String(Number(Number(v).toPrecision(4)));
function range(values,axis={},zero=false){
 let lo=Infinity,hi=-Infinity;for(const v of values)if(Number.isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v);}
 if(!Number.isFinite(lo)){lo=0;hi=1;}
 if(zero){lo=Math.min(0,lo);hi=Math.max(0,hi);}
 if(typeof axis.min==='number')lo=axis.min;if(typeof axis.max==='number')hi=axis.max;
 if(hi===lo){const d=Math.abs(lo)*.1||1;lo-=d;hi+=d;}
 else if(!zero){const d=(hi-lo)*.06;if(typeof axis.min!=='number')lo-=d;if(typeof axis.max!=='number')hi+=d;}
 return [lo,hi];
}
class Plot{
 constructor(host){
  this.host=host;this.canvas=host.tagName==='CANVAS'?host:document.createElement('canvas');
  if(this.canvas!==host){host.replaceChildren(this.canvas);this.canvas.style.cssText='display:block;width:100%;height:100%';}
  this.option={series:[]};this.dead=false;this.hits=[];this.frame=0;
  this.tip=document.createElement('div');this.tip.style.cssText='position:fixed;z-index:99999;pointer-events:none;display:none;white-space:pre-line;background:#172234;color:#fff;padding:8px;border-radius:5px;font:12px sans-serif;max-width:300px';document.body.appendChild(this.tip);
  this.move=e=>this.hover(e);this.leave=()=>this.tip.style.display='none';this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerleave',this.leave);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host.tagName==='CANVAS'?host.parentElement:host);
  instances.set(host,this);this.resize();
 }
 setOption(next){for(const k of Object.keys(next)){if(['xAxis','yAxis','title'].includes(k))this.option[k]={...(this.option[k]||{}),...next[k]};else this.option[k]=next[k];}this.resize();}
 resize(){if(this.dead||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
 draw(){
  if(this.dead)return;
  const box=(this.host.tagName==='CANVAS'?this.host.parentElement:this.host).getBoundingClientRect();
  const w=Math.max(180,Math.round(box.width||600)),h=Math.max(140,Math.round(box.height||300)),dpr=Math.min(devicePixelRatio||1,2);
  this.canvas.width=w*dpr;this.canvas.height=h*dpr;
  const c=this.canvas.getContext('2d');c.scale(dpr,dpr);const o=this.option;
  const dark=o.backgroundColor==='transparent'&&!o.title?.textStyle?.color?.match(/^#0/)||document.body.classList.contains('dark-theme');
  const ink=dark?'#dce5ef':'#25364b';c.fillStyle=o.backgroundColor&&o.backgroundColor!=='transparent'?o.backgroundColor:(dark?'#172234':'#ffffff');c.fillRect(0,0,w,h);
  const series=(o.series||[]).map((s,i)=>({...s,color:s.lineStyle?.color||s.itemStyle?.color||o.color?.[i]||palette[i%palette.length],points:(s.data||[]).map((v,j)=>Array.isArray(v)?[Number(v[0]),Number(v[1])]:[j,Number(v&&typeof v==='object'?v.value:v)]).filter(v=>v.every(Number.isFinite))}));
  const legend=series.filter(s=>s.name&&o.legend?.show!==false);let ly=o.title?.subtext?50:o.title?.text?36:10,lx=74;
  c.font='11px sans-serif';
  const legendPos=[];for(const s of legend){const width=Math.min(w-90,c.measureText(s.name).width+25);if(lx+width>w-16){ly+=16;lx=74;}legendPos.push([s,lx,ly]);lx+=width;}
  const top=Math.max(o.title?.subtext?64:o.title?.text?48:18,legend.length?ly+20:0),left=Math.min(82,w*.3),right=22,bottom=48;
  const pw=Math.max(20,w-left-right),ph=Math.max(25,h-top-bottom);
  const xs=series.flatMap(s=>s.points.map(p=>p[0])),ys=series.flatMap(s=>s.points.map(p=>p[1]));
  const categorical=o.xAxis?.type==='category',category=o.xAxis?.data||[],bar=series.some(s=>s.type==='bar');
  const xr=categorical?[-.5,Math.max(.5,category.length-.5)]:range(xs,o.xAxis),yr=range(ys,o.yAxis,bar);
  this.bounds={x:xr,y:yr};const X=v=>left+(v-xr[0])/(xr[1]-xr[0])*pw,Y=v=>top+ph-(v-yr[0])/(yr[1]-yr[0])*ph;
  c.fillStyle=ink;c.textAlign='center';c.font='bold 12px sans-serif';if(o.title?.text)c.fillText(o.title.text,w/2,16,w-24);
  if(o.title?.subtext){c.font='10px sans-serif';c.fillText(o.title.subtext,w/2,30,w-24);}
  c.font='10px sans-serif';
  for(let i=0;i<=4;i++){const v=yr[0]+(yr[1]-yr[0])*i/4,y=Y(v);c.strokeStyle=dark?'#344156':'#e1e6ed';c.beginPath();c.moveTo(left,y);c.lineTo(left+pw,y);c.stroke();c.fillStyle=ink;c.textAlign='right';c.fillText(num(v),left-7,y+3);}
  const ticks=categorical?category.map((label,i)=>[i,label]):Array.from({length:5},(_,i)=>{const v=xr[0]+(xr[1]-xr[0])*i/4;return [v,num(v)]});
  c.textAlign='center';ticks.forEach(([v,label])=>c.fillText(label,X(v),top+ph+16,Math.max(40,pw/ticks.length)));
  c.strokeStyle=ink;c.beginPath();c.moveTo(left,top);c.lineTo(left,top+ph);c.lineTo(left+pw,top+ph);c.stroke();
  c.fillText(o.xAxis?.name||'',left+pw/2,h-8,w-20);c.save();c.translate(13,top+ph/2);c.rotate(-Math.PI/2);c.fillText(o.yAxis?.name||'',0,0,h-50);c.restore();
  legendPos.forEach(([s,x,y])=>{c.fillStyle=s.color;c.fillRect(x,y-5,14,3);c.fillStyle=ink;c.textAlign='left';c.fillText(s.name,x+18,y,w-x-20);});
  this.hits=[];c.save();c.beginPath();c.rect(left,top,pw,ph);c.clip();
  series.forEach(s=>{
   c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.lineStyle?.width||2;c.setLineDash(s.lineStyle?.type==='dashed'?[5,4]:[]);c.globalAlpha=s.lineStyle?.opacity??1;
   if(s.type==='bar')s.points.forEach(([x,y])=>{const width=Math.min(56,pw/Math.max(1,category.length)*.6);c.fillRect(X(x)-width/2,Math.min(Y(y),Y(0)),width,Math.max(1,Math.abs(Y(y)-Y(0))));});
   else {if(s.type!=='scatter'){c.beginPath();s.points.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.stroke();}
    if(s.type==='scatter'||s.points.length===1||s.symbol&&s.symbol!=='none')s.points.forEach(([x,y])=>{c.beginPath();c.arc(X(x),Y(y),s.type==='scatter'?3:2.5,0,2*Math.PI);c.fill();});}
   s.points.forEach(([x,y])=>this.hits.push({px:X(x),py:Y(y),text:(s.name||'数据')+'\n'+(o.xAxis?.name||'x')+': '+(categorical?category[x]:num(x))+'\n'+(o.yAxis?.name||'y')+': '+num(y)}));
  });c.restore();
  if(bar){c.font='10px sans-serif';c.textAlign='center';c.fillStyle=ink;series.forEach(s=>s.points.forEach(([x,y])=>c.fillText(num(y),X(x),Math.max(top+10,Math.min(top+ph-4,Y(y)-5)))));}
  if(!this.hits.length){c.fillStyle=ink;c.textAlign='center';c.fillText('暂无数据',left+pw/2,top+ph/2);}
 }
 hover(event){const rect=this.canvas.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top;let best=null,d=Infinity;for(const p of this.hits){const t=Math.hypot(p.px-x,p.py-y);if(t<d){d=t;best=p;}}if(best&&d<45){this.tip.textContent=best.text;this.tip.style.left=Math.min(innerWidth-240,event.clientX+12)+'px';this.tip.style.top=Math.min(innerHeight-100,event.clientY+12)+'px';this.tip.style.display='block';}else this.leave();}
 getDataURL(){this.draw();return this.canvas.toDataURL('image/png');}
 toBase64Image(){return this.getDataURL();}
 dispose(){if(this.dead)return;this.dead=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerleave',this.leave);this.tip.remove();instances.delete(this.host);}
 destroy(){this.dispose();}
}
root.LabPlot={create:host=>new Plot(host),getInstanceByDom:host=>instances.get(host),range,format:num};
}
installLabPlot(window);

