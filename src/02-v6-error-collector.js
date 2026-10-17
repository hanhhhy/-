
/* 汇总资源加载错误、运行时异常和未处理的 Promise 拒绝，显示最近八条错误；不阻止异常传播。已知噪声只在日志入口过滤，事件收集路径仍记录错误。 */
(function () {
  'use strict';
  var errors = [], panel = null, lastSig = '', lastAt = 0;

  /* 浏览器/页面已知噪声：命中就完全不记（连控制台也不额外刷） */
  var NOISE = [
    /ResizeObserver loop/i,
    /ResizeObserver loop completed with undelivered notifications/i,
    /Script error\.?$/i,
    /^null$/,                                   /* 有脚本用 null 当错误消息 */
    /Non-Error promise rejection captured/i,
    /The play\(\) request was interrupted/i,
    /AbortError/i
  ];
  function isNoise(msg) {
    var s = String(msg == null ? '' : msg);
    for (var i = 0; i < NOISE.length; i++) if (NOISE[i].test(s)) return true;
    return false;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function show() {
    if (!panel) panel = document.getElementById('dshErrPanel');
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<b style="flex:1">⚠ 运行时报错 ' + errors.length + ' 条</b>' +
        '<button type="button" data-dsh-close style="flex:none;padding:1px 8px;border:1px solid #ffd9de;border-radius:6px;background:transparent;color:#ffd9de;cursor:pointer;font:inherit">✕</button>' +
      '</div>' +
      '<div style="margin:2px 0 6px;opacity:.75">（复制这一块发给开发者即可；F2 还能导出运行轨迹）</div>' +
      '<div style="opacity:.6">' + esc(navigator.userAgent.slice(0, 90)) + '</div>' +
      errors.slice(-8).map(function (e) {
        return '<div style="margin:4px 0;padding-top:4px;border-top:1px solid rgba(255,255,255,.12)">' +
          esc(e.where) + '<br>' + esc(e.message) + '</div>';
      }).join('') +
      '<div style="margin-top:8px"><button type="button" data-dsh-clear ' +
      'style="padding:3px 10px;border:1px solid #ffd9de;border-radius:6px;background:transparent;color:#ffd9de;cursor:pointer;font:inherit">清空</button></div>';
  }
  /* 面板上的按钮走事件委托，避免依赖全局函数名（减少对其他脚本命名空间的占用） */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-dsh-close]')) { if (panel) { panel.hidden = true; } return; }
    if (t.closest('[data-dsh-clear]')) {
      errors.length = 0;
      if (panel) { panel.hidden = true; panel.innerHTML = ''; }
    }
  }, true);

  window.__dshErrors = errors;
  window.__dshLog = function (msg) {
    var s = String(msg || '');
    if (isNoise(s)) return;
    var sig = s.slice(0, 120);
    var now = Date.now();
    if (sig === lastSig && now - lastAt < 1500) return;      /* 同一个错误刷屏只记一次 */
    lastSig = sig; lastAt = now;
    try { console.error('[V6]', msg); } catch (e) {}
  };
  function add(where, message) {
    if (isNoise(message) || isNoise(where)) return;          /* 事件收集路径直接记录错误；噪声过滤仅用于 __dshLog。 */
    errors.push({ where: String(where || ''), message: String(message || '') });
    if (errors.length > 40) errors.shift();
    try { show(); } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    var t = e && e.target;
    if (t && t !== window && t.tagName) { add('资源加载失败 ' + t.tagName + ' ' + (t.src || t.href || ''), 'load error'); return; }
    var msg = (e && (e.message || (e.error && e.error.message))) || '';
    if (!msg) return;                                        /* 空消息不记 */
    add('window.onerror @ ' + (e && e.filename ? String(e.filename).slice(-60) : '?') + ':' + (e && e.lineno || 0), msg);
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    add('未捕获的 Promise', (r && (r.message || r)) || 'unknown rejection');
  });
})();
