
/* 本地实验操作：解析单步指令并分发到滑块与按钮，严格拒绝模糊或越界输入。 */
(function(){
'use strict';
const aliases={viscosity:['黏度','粘度','动力黏度','动力粘度'],distance:['间距','板间距','两板间距'],velocity:['速度','上板速度'],area:['面积','板面积'],radius:['半径','管道半径','管半径'],length:['管长','长度','管道长度'],pressure:['压差','压强差','压降'],density:['流体密度','密度'],ballRadius:['小球半径','球半径','半径'],ballDensity:['小球密度','球密度'],fluidDensity:['流体密度','密度']};
function parseValue(raw,expected){
 const match=/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*(.+)$/i.exec(raw.trim());
 if(!match)return NaN;
 let value=Number(match[1]),unit=match[2].toLowerCase().replace(/[\s·*]/g,'').replace(/³/g,'3').replace(/²/g,'2');
 expected=expected.toLowerCase().replace(/[\s·*]/g,'').replace(/³/g,'3').replace(/²/g,'2');
 if(unit===expected)return value;
 const length={m:1,cm:.01,mm:.001,'μm':.000001,um:.000001};
 if(length[unit]&&length[expected])return value*length[unit]/length[expected];
 if(unit==='kpa'&&expected==='pa')return value*1000;
 if(unit==='mpas'&&expected==='pas')return value*.001;
 return NaN;
}
function command(text){
 const raw=text.trim().replace(/[。！!]$/,'');
 if(!/^(请)?(把|将|设置|设定|开始|继续|暂停|重置|打开|切换|返回)/.test(raw))return null;
 if(/然后|并且|同时|再|[，,；;]/.test(raw))return '一次只支持一项明确操作，请分条发送；本次未执行。';
 const target=/^(?:请)?(?:打开|切换到)(牛顿|泊肃叶|斯托克斯)(?:实验)?$/.exec(raw);
 if(target){const exp={牛顿:'newton',泊肃叶:'poiseuille',斯托克斯:'stokes'}[target[1]];Navigation.goToExperiment(exp);return new Promise(resolve=>setTimeout(()=>resolve(AppState.currentExperiment===exp?'已打开'+EXPERIMENTS[exp].name:'页面尚未完成切换，请重试。'),750));}
 if(raw==='返回首页'){Navigation.goToHome();return AppState.currentPage==='home'?'已返回首页。':'返回未完成。';}
 if(AppState.currentPage!=='experiment'||!AppState.currentExperiment)return '请先打开一个实验。';
 if(AppState.currentSubPage!=='lineSim'||AppState.compareMode)return '文字调参和开始/暂停操作用于普通演示页。请切换到普通演示并退出对比模式；当前页面可使用自身的控制按钮。';
 if(/^(请)?(开始|继续|暂停|重置)(实验|仿真)?$/.test(raw)){
  const act=/(开始|继续|暂停|重置)/.exec(raw)[1];
  if(act==='重置'){document.getElementById('resetBtn').click();return !AppState.simulationRunning&&AppState.simTime===0?'已重置仿真。':'重置未完成，请检查页面。';}
  const running=AppState.simulationRunning&&!AppState.simulationPaused,want=act!=='暂停';
  if(running!==want)document.getElementById('playPauseBtn').click();
  return (AppState.simulationRunning&&!AppState.simulationPaused)===want?(want?'已开始仿真。':'已暂停仿真。'):'状态未达到目标，请检查页面。';
 }
 const match=/^(?:请)?(?:(?:将|把)(.+?)(?:设置为|设为|改为|改成)|(?:设置|设定)(.+?)(?:为|=))\s*(.+)$/.exec(raw);
 if(!match)return '支持单步指令，例如“将板间距设为 10 mm”“开始实验”“暂停实验”“重置实验”。本次未执行。';
 const name=(match[1]||match[2]).trim(),valueText=match[3],def=EXPERIMENTS[AppState.currentExperiment];
 const candidates=def.params.filter(p=>[p.id,p.name,p.symbol,...(aliases[p.id]||[])].includes(name));
 if(candidates.length!==1)return '参数名称不明确。可用参数：'+def.params.map(p=>p.name+'（'+p.unit+'）').join('、')+'。本次未修改。';
 const param=candidates[0],value=parseValue(valueText,param.unit),el=document.getElementById(param.id);
 if(!Number.isFinite(value))return '请提供数值及正确单位，例如“将'+param.name+'设为 '+param.value+' '+param.unit+'”。本次未修改。';
 if(value<param.min||value>param.max)return '超出范围：'+param.name+'允许 '+param.min+'～'+param.max+' '+param.unit+'。本次未修改。';
 if(!el)return '参数控件尚未就绪，本次未修改。';
 el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 const actual=getParamValues()[param.id];
 if(!Number.isFinite(actual))return '未能回读实际参数，请检查页面。';
 return '已设置'+param.name+'为 '+actual+' '+param.unit+(Math.abs(actual-value)>1e-10?'（按控件步长取值）':'')+'。';
}
window.LocalCommands={execute:command,parseValue};
})();

