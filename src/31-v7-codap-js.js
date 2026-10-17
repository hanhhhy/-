
/* 探究分析区采用 CODAP 式卡片布局：支持表格和图像卡片的拖动、缩放、行点联动及坐标选择。交互复用 V5 数据、纳入/排除状态与评分逻辑。 */
(function () {
  'use strict';
  if (window.V7Codap) return;

  function log(m) { try { if (window.__v6Log) window.__v6Log('[v7-codap] ' + m); } catch (e) {} }
  function q(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function shell() { return q('#inquiryPage #v5'); }

  /* 卡片布局记在这里，V5 每次重渲染都能沿用 */
  var layout = {
    table: { left: 14, top: 14, w: 0, h: 0 },
    plot: { left: 0, top: 14, w: 0, h: 0 }
  };
  var canvas = null, cards = {}, pinned = false, busy = false, interacting = false;

  function makeCard(name, title, hint) {
    var card = el('article', 'v7d-card');
    card.setAttribute('data-card', name);
    var head = el('header', 'v7d-head');
    head.appendChild(el('span', 'v7d-title', title));
    head.appendChild(el('span', 'v7d-hint', hint || ''));
    card.appendChild(head);
    var body = el('div', 'v7d-body');
    card.appendChild(body);
    var grip = el('span', 'v7d-grip');
    grip.title = '拖动改大小';
    card.appendChild(grip);
    head.addEventListener('pointerdown', function (e) { startDrag(e, card, name); });
    grip.addEventListener('pointerdown', function (e) { startResize(e, card, name); });
    return { node: card, head: head, body: body };
  }

  function buildCanvas(host) {
    canvas = el('div', 'v7d-canvas');
    cards = {
      table: makeCard('table', '数据表', '点一行 → 图上高亮'),
      plot: makeCard('plot', '图像', '把上面的坐标拖进来切换')
    };
    canvas.appendChild(cards.table.node);
    canvas.appendChild(cards.plot.node);
    var fit = host.querySelector('#il-fit');
    if (fit && fit.parentNode === host) host.insertBefore(canvas, fit);
    else host.appendChild(canvas);
    pinned = false;
    log('画布已建立');
  }

  /* 默认布局：左边表格、右边图像；一旦用户拖过就不再用默认值 */
  function applyLayout() {
    if (!canvas || interacting) return;
    var cw = canvas.clientWidth || 1100;
    var ch = canvas.clientHeight || 560;
    if (!pinned) {
      layout.table.w = Math.round(cw * 0.43);
      layout.table.h = ch - 28;
      layout.plot.left = layout.table.left + layout.table.w + 14;
      layout.plot.w = Math.max(320, cw - layout.plot.left - 14);
      layout.plot.h = ch - 28;
      layout.table.top = 14; layout.plot.top = 14;
    }
    ['table', 'plot'].forEach(function (k) {
      var L = layout[k], n = cards[k] && cards[k].node;
      if (!n) return;
      n.style.left = L.left + 'px';
      n.style.top = L.top + 'px';
      n.style.width = L.w + 'px';
      n.style.height = L.h + 'px';
    });
  }

  function startDrag(e, card, name) {
    if (e.button != null && e.button !== 0) return;
    var sx = e.clientX, sy = e.clientY, ox = card.offsetLeft, oy = card.offsetTop;
    interacting = true; card.classList.add('is-dragging');
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    function mv(ev) {
      var L = Math.max(0, Math.min(cw - card.offsetWidth, ox + ev.clientX - sx));
      var T = Math.max(0, Math.min(ch - card.offsetHeight, oy + ev.clientY - sy));
      card.style.left = L + 'px';
      card.style.top = T + 'px';
    }
    function up() {
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      interacting = false; card.classList.remove('is-dragging');
      layout[name].left = card.offsetLeft;
      layout[name].top = card.offsetTop;
      pinned = true;
    }
    document.addEventListener('pointermove', mv);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    e.preventDefault();
  }

  function startResize(e, card, name) {
    if (e.button != null && e.button !== 0) return;
    var sx = e.clientX, sy = e.clientY, ow = card.offsetWidth, oh = card.offsetHeight;
    interacting = true; card.classList.add('is-dragging');
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    function mv(ev) {
      var W = Math.max(240, Math.min(cw - card.offsetLeft, ow + ev.clientX - sx));
      var H = Math.max(160, Math.min(ch - card.offsetTop, oh + ev.clientY - sy));
      card.style.width = W + 'px';
      card.style.height = H + 'px';
    }
    function up() {
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      interacting = false; card.classList.remove('is-dragging');
      layout[name].w = card.offsetWidth;
      layout[name].h = card.offsetHeight;
      pinned = true;
    }
    document.addEventListener('pointermove', mv);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    e.preventDefault();
    e.stopPropagation();
  }

  /* ------------------------- 表格 ↔ 图上点 联动 ------------------------- */
  function rowNo(tr) {
    var td = tr.children[1];
    var m = td && /#\s*(\d+)/.exec(td.textContent || '');
    return m ? Number(m[1]) : null;
  }
  function markRow(n, cls, on) {
    var tr = all('#il-rows tr').filter(function (x) { return rowNo(x) === n; })[0];
    if (tr) tr.classList.toggle(cls, on);
  }
  function markDot(n, cls, on) {
    all('#il-plot circle[data-n]').forEach(function (c) {
      if (Number(c.getAttribute('data-n')) === n) c.classList.toggle(cls, on);
    });
  }
  function selectRow(n) {
    if (n == null) return;
    all('#il-rows tr').forEach(function (tr) { tr.classList.remove('v7d-sel'); });
    all('#il-plot circle[data-n]').forEach(function (c) { c.classList.remove('v7d-sel'); });
    if (n > 0) { markRow(n, 'v7d-sel', true); markDot(n, 'v7d-sel', true); }
  }

  var tableBound = false, plotBound = false;
  function bindTable() {
    var tbody = q('#il-rows');
    if (!tbody || tbody.__v7d) return;
    tbody.__v7d = true;
    tbody.addEventListener('click', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tr') : null;
      if (!tr) return;
      if (e.target.closest('input, select, textarea')) return;   /* 勾选/填理由不算选中 */
      selectRow(rowNo(tr));
    });
    tbody.addEventListener('mouseover', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tr') : null;
      if (!tr) return;
      markDot(rowNo(tr), 'v7d-hover', true);
    });
    tbody.addEventListener('mouseout', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tr') : null;
      if (!tr) return;
      markDot(rowNo(tr), 'v7d-hover', false);
    });
  }
  function bindPlot() {
    var svg = q('#il-plot svg');
    if (!svg || svg.__v7d) return;
    svg.__v7d = true;
    svg.addEventListener('click', function (e) {
      var c = e.target && e.target.closest ? e.target.closest('circle[data-n]') : null;
      if (!c) return;
      selectRow(Number(c.getAttribute('data-n')));
    });
  }

  /* --------------------------- 坐标药丸 --------------------------- */
  function buildAxisPills() {
    if (!cards.plot) return;
    var sel = q('#il-axis');
    var bar = q('.v7d-axisbar', cards.plot.node);
    if (!sel || !sel.options || !sel.options.length) { if (bar) bar.remove(); return; }
    var sig = sel.value + '|' + all('option', sel).map(function (o) { return o.value; }).join(',');
    if (bar && bar.getAttribute('data-sig') === sig) return;
    if (!bar) {
      bar = el('div', 'v7d-axisbar');
      bar.title = '把药丸拖到图里即可换坐标，点一下也行';
      cards.plot.node.insertBefore(bar, cards.plot.body);
    }
    bar.setAttribute('data-sig', sig);
    bar.innerHTML = '';
    all('option', sel).forEach(function (o) {
      var b = el('button', 'v7d-pill' + (o.value === sel.value ? ' is-on' : ''), o.textContent);
      b.type = 'button';
      b.setAttribute('draggable', 'true');
      b.setAttribute('data-axis', o.value);
      b.addEventListener('dragstart', function (e) {
        try { e.dataTransfer.setData('text/plain', o.value); e.dataTransfer.effectAllowed = 'copy'; } catch (err) {}
      });
      b.addEventListener('click', function () { switchAxis(o.value); });
      bar.appendChild(b);
    });
  }
  function switchAxis(key) {
    var sel = q('#il-axis');
    if (!sel || !key) return;
    sel.value = key;
    try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    log('切换坐标 ' + key);
  }
  function bindDrop() {
    if (!cards.plot || cards.plot.node.__v7dDrop) return;
    cards.plot.node.__v7dDrop = true;
    ['dragenter', 'dragover'].forEach(function (t) {
      cards.plot.node.addEventListener(t, function (e) {
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {}
        cards.plot.node.classList.add('v7d-drop');
      });
    });
    ['dragleave', 'dragend'].forEach(function (t) {
      cards.plot.node.addEventListener(t, function () { cards.plot.node.classList.remove('v7d-drop'); });
    });
    cards.plot.node.addEventListener('drop', function (e) {
      e.preventDefault();
      cards.plot.node.classList.remove('v7d-drop');
      var key = '';
      try { key = e.dataTransfer.getData('text/plain'); } catch (err) {}
      if (!key) {
        var pill = e.target && e.target.closest ? e.target.closest('[data-axis]') : null;
        key = pill ? pill.getAttribute('data-axis') : '';
      }
      switchAxis(key);
    });
  }

  /* ----------------------------- 装配 ----------------------------- */
  function removeCanvas() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; cards = {}; pinned = false;
  }

  function ensure() {
    if (busy) return;
    busy = true;
    try {
      var sh = shell();
      if (!sh) { removeCanvas(); return; }
      var rec = sh.querySelector('#v5-records');
      var plot = sh.querySelector('#il-plot');
      if (!rec && !plot) { removeCanvas(); return; }
      var host = plot ? plot.closest('section.v-card') : null;
      if (!host) return;
      if (canvas && !canvas.isConnected) { canvas = null; cards = {}; }
      if (!canvas) buildCanvas(host);
      if (!canvas || !canvas.isConnected) return;
      if (rec && rec.parentNode !== cards.table.body) cards.table.body.appendChild(rec);
      if (plot && plot.parentNode !== cards.plot.body) cards.plot.body.appendChild(plot);
      applyLayout();
      buildAxisPills();
      bindDrop();
      bindTable();
      bindPlot();
    } catch (e) {
      log('装配失败: ' + (e && e.message || e));
    } finally {
      busy = false;
    }
  }

  var timer = null;
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = null;
      ensure();
    }, 120);
  }

  function boot() {
    ensure();
    window.setInterval(function () { try { ensure(); } catch (e) {} }, 900);
    window.addEventListener('resize', function () { pinned = false; applyLayout(); }, { passive: true });
    try {
      var host = document.getElementById('inquiryPage');
      if (host && window.MutationObserver) {
        new MutationObserver(schedule).observe(host, { childList: true, subtree: true });
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.V7Codap = {
    version: '7.0.0',
    refresh: ensure,
    resetLayout: function () { pinned = false; applyLayout(); }
  };
})();

