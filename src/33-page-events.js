
// Print visibility follows the currently active page without hiding its ancestors.
window.addEventListener('beforeprint',function(){var n=document.getElementById('inquiryPage');document.body.classList.toggle('v72-print-inquiry',!!(n&&n.classList.contains('active')&&document.getElementById('experimentPage').style.display!=='none'));});
window.addEventListener('afterprint',function(){document.body.classList.remove('v72-print-inquiry');});
