
/* 助手消息格式：调用 aiRenderMath / aiMathUnstash 将已知公式转为原生 MathML，并过滤装饰性表情；字体规则见 styles/24-v7-guide-style.css。 */
(function () {
  'use strict';
  if (window.V7AiLook) return;

  function log(m) { try { if (window.__v6Log) window.__v6Log('[v7-ai-look] ' + m); } catch (e) {} }

  /* ------------------------- 公式：走一遍 原生MathML 桥 ------------------------- */
  /* 传入可能含 HTML 的字符串，返回公式已渲染成 原生MathML 的 HTML */
  function withMath(html) {
    var s = String(html == null ? '' : html);
    try {
      if (typeof window.aiRenderMath !== 'function') return s;
      var pair = window.aiRenderMath(s);
      s = pair[0];
      if (typeof window.aiMathUnstash === 'function') s = window.aiMathUnstash(s, pair[1]);
    } catch (e) { log('公式渲染失败: ' + (e && e.message || e)); }
    return s;
  }

  /* ------------------------------ emoji 过滤 ------------------------------ */
  /* 只去掉真正的表情符号；✓ ✔ ✗ ✘ 和箭头（→ ↑）属于界面符号，保留 */
  var KEEP = { 0x2713: 1, 0x2714: 1, 0x2717: 1, 0x2718: 1 };
  function isEmoji(cp) {
    if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;   /* 常见表情、手势、物件 */
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) return true;   /* 区域旗帜 */
    if (cp === 0xFE0F || cp === 0xFE0E) return true;   /* 变体选择符 */
    if (cp === 0x203C || cp === 0x2049) return true;   /* ‼ ⁉ */
    if (cp >= 0x2B00 && cp <= 0x2BFF) return true;     /* ⭐ ⬛ 等 */
    if (cp >= 0x2600 && cp <= 0x27BF) return !KEEP[cp];
    return false;
  }
  function stripEmoji(s) {
    try { return s.replace(/[\s\S]/gu, function (ch) { return isEmoji(ch.codePointAt(0)) ? '' : ch; }); }
    catch (e) { return s; }
  }
  function stripEmojiIn(node) {
    if (!node) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = (p.nodeName || '').toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'input') return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('math, [data-keep-emoji]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var targets = [];
    var n;
    while ((n = walker.nextNode())) targets.push(n);
    targets.forEach(function (t) {
      var v = stripEmoji(t.nodeValue);
      if (v !== t.nodeValue) t.nodeValue = v.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
    });
  }

  /* 剥掉消息开头因为删 emoji 留下的空白/空行 */
  function tidyTitles(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('.ai-msg-title'), function (t) {
      t.textContent = String(t.textContent || '').replace(/^[\s·、,，:：]+/, '');
    });
  }

  function clean(root) {
    if (!root) return;
    stripEmojiIn(root);
    tidyTitles(root);
  }

  /* ------------------- 给 AIAssistant.addAssistantMsg 接上公式 ------------------- */
  function patchAssistant() {
    var A = window.AIAssistant;
    if (!A || A.__v7MathPatched || typeof A.addAssistantMsg !== 'function') return;
    A.__v7MathPatched = true;
    var orig = A.addAssistantMsg;
    A.addAssistantMsg = function (text, title) {
      var body = text;
      try {
        if (typeof window.aiRenderMath === 'function') {
          var pair = window.aiRenderMath(String(body == null ? '' : body));
          body = pair[0];
          this.__v7Slots = pair[1];
        }
      } catch (e) { this.__v7Slots = null; }
      orig.call(this, body, title);
      try {
        var box = document.getElementById('ai-messages');
        var last = box && box.lastElementChild;
        if (last && this.__v7Slots && typeof window.aiMathUnstash === 'function') {
          last.innerHTML = window.aiMathUnstash(last.innerHTML, this.__v7Slots);
        }
        if (last) clean(last);
      } catch (e) { log('收尾失败: ' + (e && e.message || e)); }
      this.__v7Slots = null;
    };
    log('addAssistantMsg 已接上公式与 emoji 过滤');
  }

  /* ------------------------- 持续盯着消息流做清理 ------------------------- */
  function boot() {
    patchAssistant();
    var box = document.getElementById('ai-messages');
    if (box) {
      clean(box);
      if (window.MutationObserver) {
        var pending = false;
        new MutationObserver(function (ms) {
          if (pending) return;
          pending = true;
          window.requestAnimationFrame(function () {
            pending = false;
            try {
              ms.forEach(function (m) {
                Array.prototype.forEach.call(m.addedNodes || [], function (n) {
                  if (n.nodeType === 1 || n.nodeType === 3) clean(n.nodeType === 1 ? n : n.parentNode);
                });
              });
            } catch (e) {}
          });
        }).observe(box, { childList: true, subtree: true });
      }
    }
    /* 面板或消息区可能被重建，低频兜底一次 */
    window.setInterval(function () {
      try {
        patchAssistant();
        var b = document.getElementById('ai-messages');
        if (b) clean(b);
      } catch (e) {}
    }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.V7AiLook = {
    version: '7.0.0',
    math: withMath,
    stripEmoji: stripEmoji,
    clean: clean
  };
})();

