
window.currentInquiryFamily=function(){try{return {newton:'N',poiseuille:'P',stokes:'S'}[AppState.currentExperiment]||'N';}catch(e){return 'N';}};
window.currentInquiryLabel=function(){return {N:'牛顿黏性定律',P:'泊肃叶定律',S:'斯托克斯定律'}[window.currentInquiryFamily()];};
