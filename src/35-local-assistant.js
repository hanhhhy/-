
/* 本地文字问答唯一入口。知识检索复用既有同义词和加权匹配；数值来自 PhysicsEngine。 */
(function(){'use strict';
const A=AIAssistant;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const units={velocityGradient:'s⁻¹',shearStress:'Pa',frictionForce:'N',spacingMm:'mm',flowRate:'m³/s',maxVelocity:'m/s',avgVelocity:'m/s',resistance:'Pa·s/m³',terminalVelocity:'m/s',gravity:'N',buoyancy:'N',netForce:'N',volume:'m³',mass:'kg',reynoldsNumber:'',timeConstant:'s'};
const labels={velocityGradient:'速度梯度',shearStress:'剪切应力',frictionForce:'黏性力',flowRate:'体积流量',maxVelocity:'最大流速',avgVelocity:'平均流速',resistance:'流阻',terminalVelocity:'终端速度',gravity:'重力',buoyancy:'浮力',reynoldsNumber:'雷诺数'};
A.fillTemplate=function(text){const ctx=this.getContext(),def=EXPERIMENTS[AppState.currentExperiment];const values={expName:ctx.expName};
 if(def)def.params.forEach(p=>{const v=ctx.params[p.id];values[p.id]=Number.isFinite(v)?v+' '+p.unit:'未取得';});
 Object.keys(ctx.simulationState).forEach(k=>{const v=ctx.simulationState[k];values[k]=typeof v==='number'?this.formatNumber(v,4)+' '+(units[k]||''):escape(v);});
 return String(text).replace(/\{([A-Za-z][\w]*)\}/g,(_,k)=>values[k]??'未取得');};
A.localData=function(){
 if(AppState.currentPage!=='experiment'||!AppState.currentExperiment)return '请先打开一个实验，再查询当前数据。';
 if(AppState.compareMode)return ['A','B','C'].map(k=>{const c=compParams[k];return k+' 组参数：'+escape(JSON.stringify(c));}).join('\n')+'\n各组结果请查看对比面板。';
 if(AppState.currentSubPage==='3dSim'||AppState.currentSubPage==='inquiry')return '当前处于独立的三维/探究工作台，请查看该页实时读数；文字数据查询用于普通演示页，避免混用不同工作台参数。';
 const ctx=this.getContext(),params=EXPERIMENTS[AppState.currentExperiment].params.map(p=>p.name+'：'+ctx.params[p.id]+' '+p.unit).join('；');
 let text=ctx.expName+' · 当前参数\n'+params+'\n\n';
 Object.keys(labels).forEach(k=>{if(ctx.simulationState[k]!=null)text+=labels[k]+'：'+this.formatNumber(ctx.simulationState[k],5)+' '+units[k]+'\n';});
 if(AppState.currentExperiment==='stokes')text+='当前球速：'+this.formatNumber(AppState.stokesBallV,5)+' m/s\n阻力模型：'+ctx.simulationState.dragFormula+'。F = 6πμrv 只适用于严格低雷诺数；其他区间采用现有引擎的修正模型。';
 if(AppState.currentExperiment==='poiseuille')text+='泊肃叶关系以稳态、充分发展层流及牛顿流体为前提。';
 return text;
};
A.showEntry=function(entry){let response=this.fillTemplate(entry.response);if(entry.experiment==='stokes')response+='\n\n适用条件：低雷诺数简式仅用于 Re ≪ 1；程序在其他区间采用现有修正模型。';this.addAssistantMsg(this.formatResponse(response),entry.title);};
A.showFallback=function(){const candidates=(this._lastScored||[]).filter(x=>x.hits>0).slice(0,3).map(x=>x.entry.title);
 this.addAssistantMsg('知识库暂未收录或问题不明确。'+(candidates.length?'可以进一步询问：'+candidates.map(escape).join('、')+'。':'')+'\n可问“牛顿黏性定律是什么”“当前数值是多少”，或输入单步指令“将板间距设为 10 mm”。');};
A.processQuery=A.processQueryWithTypewriter=async function(text){
 this.conversationHistory.push({role:'user',text,time:new Date()});
 const action=await LocalCommands.execute(text);
 if(action!==null){this.addAssistantMsg(escape(action));return;}
 if(/^(当前|现在|此时).*(多少|数值|参数|数据|流量|速度|力|雷诺)/.test(text)){this.addAssistantMsg(this.localData());return;}
 const match=this.matchQuery(text);if(match)this.showEntry(match);else this.showFallback();
};
A.send=async function(){const input=document.getElementById('ai-user-input');if(!input||!input.value.trim()||this._localBusy)return;
 const text=input.value.trim();input.value='';document.getElementById('ai-intro')?.remove();this.addUserMsg(text);this.syncInputState();this._localBusy=true;
 try{await this.processQuery(text);}finally{this._localBusy=false;this.syncInputState();}
};
A.localOnly=true;
})();

