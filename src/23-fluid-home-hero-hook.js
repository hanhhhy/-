
/* FluidHero 基础入口：按 mode 打开助手或引导面板，失败时回退；在空输入框预填引导语并广播 fluid:hero-guide。后加载的 askz-explore-ui 会覆盖 openGuide 以显示实验选择卡。 */
(function () {
  var DEFAULT_PROMPT = '请引导我完成一次探究性学习：先帮我确定要研究的流体现象，再一步步带我做预测、设计实验、采集数据、分析并写出结论。';

  function prefillPrompt(text) {
    try {
      var input = document.getElementById('ai-user-input');
      if (!input) return false;
      if (!input.value || !input.value.trim()) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setAttribute('data-prefilled-by', 'hero-guide');
      }
      if (window.AIAssistant && typeof window.AIAssistant.syncInputState === 'function') {
        window.AIAssistant.syncInputState();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  var FluidHero = {
    prompt: DEFAULT_PROMPT,
    /* 'assistant' = 开 实验助手对话面板（默认）；'guide' = 开引导助教 */
    mode: 'assistant',

    /* 按钮调用入口；options 可传 { source: 'hero', prompt: '...', mode: 'guide' } */
    openGuide: function (options) {
      options = options || {};
      var mode = options.mode || this.mode;
      var prompt = options.prompt || this.prompt;
      var result = { mode: mode, guideOpened: false, assistantOpened: false, prefilled: false };

      function openAssistant() {
        try {
          if (window.AIAssistant && typeof window.AIAssistant.open === 'function') {
            window.AIAssistant.open();
            result.assistantOpened = true;
            return true;
          }
        } catch (e) {}
        return false;
      }

      function openGuide() {
        try {
          if (window.GuideLayer && typeof window.GuideLayer.openPanel === 'function') {
            window.GuideLayer.openPanel();
            result.guideOpened = true;
            return true;
          }
        } catch (e) {}
        return false;
      }

      /* 1) 按模式选主入口，失败时退回另一个 */
      if (mode === 'guide') {
        if (!openGuide()) openAssistant();
      } else {
        if (!openAssistant()) openGuide();
      }

      /* 2) 预填引导语（放在开面板之后：首页没有选中实验，开面板不会覆盖输入框） */
      result.prefilled = prefillPrompt(prompt);

      /* 广播入口调用结果与来源。 */
      try {
        document.dispatchEvent(new CustomEvent('fluid:hero-guide', {
          detail: { prompt: prompt, source: options.source || 'hero', mode: mode, result: result }
        }));
      } catch (e) {}

      return result;
    }
  };

  window.FluidHero = FluidHero;
})();


/* 首页引导区域保留标题、介绍和探究按钮。 */
(function () {
  function tune() {
    var hero = document.querySelector('.home-ai-hero');
    if (!hero) return false;
    var tag = hero.querySelector('.ai-hero-tag');
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
    var hint = hero.querySelector('.hero-ai-hint');
    if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
    var btn = hero.querySelector('.hero-ai-btn');
    if (btn) {
      var ico = btn.querySelector('.hero-ai-btn-ico');
      if (ico && ico.parentNode) ico.parentNode.removeChild(ico);
      var span = btn.querySelector('span:not(.hero-ai-btn-ico)');
      if (span) { span.textContent = '帮我探究'; }
      else { btn.textContent = '帮我探究'; }
    }
    return true;
  }
  if (!tune()) {
    document.addEventListener('DOMContentLoaded', tune);
    var n = 0, t = setInterval(function () { if (tune() || ++n > 40) clearInterval(t); }, 250);
  }
})();
