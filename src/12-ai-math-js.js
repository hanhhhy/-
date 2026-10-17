
/* 固定公式字典，仅使用浏览器原生 MathML。 */
(function(){
window.aiRenderMath=function(text){
 const slots=[];
 function fixed(_,tex){const html=C2_MATH.formulas[tex.replace(/\s/g,'')]||'<span>（该公式未收录，请查看原理页固定公式）</span>';slots.push(html);return '\u0001K'+(slots.length-1)+'X\u0001';}
 text=String(text??'').replace(/\$\$([\s\S]+?)\$\$/g,fixed).replace(/\\\[([\s\S]+?)\\\]/g,fixed).replace(/\\\(([\s\S]+?)\\\)/g,fixed).replace(/\$([^$\n]+?)\$/g,fixed);
 return [text,slots];
};
window.aiMathUnstash=(html,slots)=>html.replace(/\u0001K(\d+)X\u0001/g,(_,i)=>slots[Number(i)]||'');
})();

