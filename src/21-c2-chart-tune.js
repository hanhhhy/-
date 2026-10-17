
(function () {
  var FAM = '"Times New Roman","Source Han Serif SC","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
  /* 参数符号按 LaTeX 惯例排版：
     拉丁/小写希腊 → 斜体；大写希腊 → 正体；
     希腊字母后面跟字母（ρs / ρf）→ 后面那个做下标。 */
  window.__fmtSym = function (s) {
    if (!s) return '';
    var m = /^([\u0391-\u03c9]+)([A-Za-z0-9]+)$/.exec(String(s));
    if (m) {
      var head = m[1], tail = m[2];
      if (/^[\u03b1-\u03c9]$/.test(head)) {
        return '<i>' + head + '</i><sub>' + tail + '</sub>';
      }
      return head + '<i>' + tail + '</i>';
    }
    return '<i>' + s + '</i>';
  };
})();
