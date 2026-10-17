
/* 助手消息流中的实验选择卡：选择实验后进入该实验并启动入门引导；题目由页内引导栏组织。 */
(function () {
  'use strict';
  if (window.AskzExplore) return;

  var META = {
    newton:     { name: '牛顿黏性实验', overview: '核心任务 3 项：剪切应力、黏度影响、速度梯度' },
    poiseuille: { name: '泊肃叶实验',   overview: '核心任务 4 项：四次方关系、线性关系、黏度影响、综合调控' },
    stokes:     { name: '斯托克斯实验', overview: '核心任务 3 项：半径与沉降、黏度与沉降、密度差' }
  };

  function cardsHtml() {
    return Object.keys(META).map(function (exp) {
      var m = META[exp];
      var progress = '入门引导 · 4 步';
      try {
        var G = window.GuideLayer;
        var o = (G && typeof G.getOverview === 'function') ? G.getOverview(exp) : null;
        if (o) {
          var core = o.coreDone >= o.core.length ? '核心 ✅' : '核心 ' + o.coreDone + '/' + o.core.length;
          progress = core + ' ｜ 拓展 ' + o.bonusDone + '/' + o.bonus.length;
        }
      } catch (e) {}
      return '<button type="button" class="askz-exp-card" data-exp="' + exp + '">' +
        '<span class="aec-text">' +
          '<span class="aec-name">' + m.name + '</span>' +
          '<span class="aec-overview">' + m.overview + '</span>' +
        '</span>' +
        '</button>';
    }).join('');
  }

  /* ⚠️ 基底的 AppState 是顶层 const，不会挂到 window 上，必须用裸标识符读 */
  function appState() {
    try { return (typeof AppState !== 'undefined' && AppState) ? AppState : (window.AppState || null); } catch (e) { return null; }
  }

  function chatMessageHtml() {
    return '<div class="askz-exp-title">探究式学习 · 请选择要探究的实验</div>' +
      '<p style="margin:8px 0 0;font-size:13px;line-height:1.75">本模拟器共有 <b>3 个流体黏性实验</b>。' +
      '点下面的卡片会直接进入该实验，并在实验页顶部打开 4 步入门引导。</p>' +
      '<div class="askz-exp-cards">' + cardsHtml() + '</div>';
  }

  function choose(exp) {
    if (!META[exp]) return;
    try {
      if (window.GuideLayer && GuideLayer.closePanel) GuideLayer.closePanel();
      if (window.AIAssistant && AIAssistant.close) AIAssistant.close();
      var s0 = appState();
      var nav = !(s0 && s0.currentPage === 'experiment' && s0.currentExperiment === exp);
      if (typeof Navigation !== 'undefined' && Navigation.goToExperiment) Navigation.goToExperiment(exp);
      var tries = 0;
      (function wait() {
        var ready = false;
        var s = appState();
        try { ready = s && s.currentPage === 'experiment' && s.currentExperiment === exp; } catch (e) {}
        if (!ready && tries++ < 60) { setTimeout(wait, 100); return; }
        if (!ready) { if (window.__v6Log) window.__v6Log('卡片进入实验超时：' + exp); return; }
        setTimeout(function () {
          try {
            if (window.V7Guide && V7Guide.arm) V7Guide.arm(exp, { source: 'ai-card' });
          } catch (e) { if (window.__v6Log) window.__v6Log('引导启动失败: ' + (e && e.message || e)); }
        }, nav ? 320 : 60);
      })();
    } catch (e) {
      if (window.__v6Log) window.__v6Log('实验卡片处理失败: ' + (e && e.message || e));
    }
  }

  /* 事件委托：卡片随消息重建也能点 */
  document.addEventListener('click', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.askz-exp-card[data-exp]') : null;
    if (!card) return;
    choose(card.getAttribute('data-exp'));
  });

  window.AskzExplore = {
    version: '6.0.0',
    cardsHtml: cardsHtml,
    chatMessageHtml: chatMessageHtml,
    choose: choose
  };

  /* 首页探究入口直接打开助手并挂载实验选择卡，不依赖发送预填文本；清除预填引导语以便继续输入。 */
  (function wireHero() {
    var baseOpen = window.FluidHero && window.FluidHero.openGuide;
    if (!baseOpen) return;

    function clearPrefill() {
      var input = document.getElementById('ai-user-input');
      if (!input) return;
      if (input.getAttribute('data-prefilled-by') !== 'hero-guide') return;
      input.removeAttribute('data-prefilled-by');
      input.value = '';
      var A = window.AIAssistant;
      try { if (A && A.syncInputState) A.syncInputState(); } catch (e) {}
    }

    function ensureCards() {
      var box = document.getElementById('ai-messages');
      if (!box) return false;
      /* 每次点击都重新展示一轮实验选择卡，避免旧卡片存在时直接跳过渲染。 */
      var oldCards = box.querySelectorAll('.askz-exp-card');
      Array.prototype.forEach.call(oldCards, function (card) {
        var message = card.closest ? card.closest('.ai-msg') : card.parentNode;
        if (message && message.parentNode) message.parentNode.removeChild(message);
      });
      var intro = box.querySelector('#ai-intro');
      var A = window.AIAssistant;
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
      if (A && typeof A.addAssistantMsg === 'function') A.addAssistantMsg(chatMessageHtml());
      else box.insertAdjacentHTML('beforeend', '<div class="ai-msg assistant">' + chatMessageHtml() + '</div>');
      var last = box.lastElementChild;
      if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest' });
      return true;
    }

    function watchCards() {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (ensureCards() || tries > 30) clearInterval(timer);
      }, 120);
    }

    window.FluidHero.openGuide = function (options) {
      options = options || {};
      var res = null;
      try {
        res = baseOpen.call(this, {
          source: options.source || 'hero',
          prompt: options.prompt,
          mode: options.mode || 'assistant'
        });
      } catch (e) {
        if (window.__v6Log) window.__v6Log('打开 AI 面板失败: ' + (e && e.message || e));
      }
      try {
        var A = window.AIAssistant;
        if (A && typeof A.open === 'function') A.open();     /* 兜底：确保面板真的开着 */
      } catch (e) {}
      clearPrefill();
      setTimeout(function () { ensureCards(); watchCards(); }, 60);
      return res;
    };
  })();
})();
