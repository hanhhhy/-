
/* Mobile adapter v1.5.0. Load after the original application script. */
(function () {
  'use strict';
  if (window.ViscosityMobileAdapter) return;
  const mediaQuery = window.matchMedia('(max-width: 768px), (max-width: 1366px) and (hover: none) and (pointer: coarse)');
  const landscapeQuery = window.matchMedia('(orientation: landscape) and (max-width: 768px), (orientation: landscape) and (max-width: 1366px) and (hover: none) and (pointer: coarse)');
  const anyTouchQuery = window.matchMedia('(any-pointer: coarse)');
  // CSS and JS use these same resolved flags, instead of independent queries.
  const media = {matches: mediaQuery.matches};
  const landscape = {matches: landscapeQuery.matches};
  let lastUnobscured = null;
  let dimensions = {};
  let rotationTimers = [];
  let manualLandscape = false;
  let rotationButton = null;
  function resolveLayout() {
    const root = document.documentElement, nav = window.navigator || {};
    const screen = window.screen || {};
    const w = window.innerWidth || root.clientWidth || (typeof innerWidth === 'number' ? innerWidth : 0);
    const h = window.innerHeight || root.clientHeight || (typeof innerHeight === 'number' ? innerHeight : 0);
    const ua = nav.userAgent || '';
    const touch = (nav.maxTouchPoints || 0) > 0 || anyTouchQuery.matches;
    const shortScreen = screen.width && screen.height ? Math.min(screen.width, screen.height) : 0;
    const mobilePlatform = /Android|iPhone|iPad|iPod|HarmonyOS/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const desktopPlatform = /Windows NT|Macintosh|X11/i.test(ua) && !mobilePlatform;
    const phoneScreen = touch && shortScreen > 0 && shortScreen <= 600;
    const otherTouchDevice = touch && !desktopPlatform && w > 0 && h > 0 && Math.min(w,h) <= 900 && Math.max(w,h) <= 1600;
    media.matches = mediaQuery.matches || mobilePlatform || phoneScreen || otherTouchDevice;
    let horizontal = w > 0 && h > 0 ? w > h : landscapeQuery.matches;
    const active = document.activeElement;
    const editing = active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName));
    const type = screen.orientation && screen.orientation.type || '';
    // A portrait keyboard can make the viewport wider than it is tall.
    // Do not mistake this for a rotation when its width has not changed.
    const visible = window.visualViewport;
    const visibleHeight = visible && (!visible.scale || visible.scale === 1) ? Math.min(h, visible.height) : h;
    const keyboard = (editing || dimensions.keyboard) && lastUnobscured && Math.abs(w-lastUnobscured.width) < 24 && visibleHeight < lastUnobscured.height * 0.8;
    if (keyboard) horizontal = lastUnobscured.landscape;
    else if (editing && /^portrait/.test(type) && w < 600) horizontal = false;
    if (!keyboard && w > 0 && h > 0) lastUnobscured = {width:w,height:h,landscape:horizontal};
    // Temporarily return to natural orientation for keyboard entry, then resume.
    const rotatedView = media.matches && manualLandscape && !horizontal && !keyboard;
    landscape.matches = media.matches && (horizontal || rotatedView);
    if (root.classList) {
      root.classList.toggle('viscosity-mobile', media.matches);
      root.classList.toggle('viscosity-landscape', landscape.matches);
      root.classList.toggle('viscosity-rotated', rotatedView);
    }
    if (root.setAttribute) root.setAttribute('data-mobile-adapter-version', '1.5.0');
    dimensions = {width:w,height:h,mobile:media.matches,landscape:landscape.matches,manualLandscape,rotatedView,keyboard:!!keyboard,
      detection:mobilePlatform?'mobile-platform':phoneScreen?'touch-phone':otherTouchDevice?'touch-device':'media-query'};
  }
  let frame = 0;
  const watched = new Map();
  let compare = null;
  let help = null;
  let workspace = null;

  function prepareRotationButton() {
    if (!document.querySelector) return;
    const target = document.querySelector('#experimentPage .experiment-nav .nav-right');
    if (!target) return;
    if (!rotationButton) {
      rotationButton = document.createElement('button');
      rotationButton.id = 'mobile-landscape-toggle'; rotationButton.type = 'button';
      rotationButton.title = '微信未自动横屏时，点击切换横屏工作区；再次点击恢复自动适配';
      rotationButton.addEventListener('click', () => { manualLandscape = !manualLandscape; viewport(); });
      target.appendChild(rotationButton);
    }
    rotationButton.hidden = !media.matches;
    rotationButton.textContent = manualLandscape ? '自动适配' : '横屏查看';
    rotationButton.setAttribute('aria-pressed', String(manualLandscape));
  }

  function prepareWorkspace() {
    const layout = document.getElementById('normalLayout');
    const page = document.getElementById('lineSimPage');
    if (workspace && workspace.layout !== layout) {
      workspace.bar.remove(); workspace = null;
    }
    if (!page || !layout) return;
    if (landscape.matches && !workspace) {
      const bar = document.createElement('div');
      bar.className = 'mobile-landscape-toolbar';
      bar.setAttribute('aria-label', '横屏实验控制');
      const params = document.createElement('button');
      const data = document.createElement('button');
      params.type = data.type = 'button';
      params.textContent = '参数'; data.textContent = '数据 / 图表';
      params.setAttribute('aria-pressed', 'true'); data.setAttribute('aria-pressed', 'false');
      function showData(value) {
        layout.classList.toggle('mobile-show-data', value);
        params.setAttribute('aria-pressed', String(!value)); data.setAttribute('aria-pressed', String(value));
        if (value && typeof AppState !== 'undefined' && AppState.chartInstance) AppState.chartInstance.resize();
      }
      params.addEventListener('click', () => showData(false));
      data.addEventListener('click', () => showData(true));
      bar.append(params, data);
      const controls = layout.querySelector('.bottom-controls');
      const anchor = document.createComment('mobile-controls-original-position');
      if (controls) { controls.before(anchor); bar.appendChild(controls); }
      const report = layout.querySelector('#btn-report');
      const reportAnchor = document.createComment('mobile-report-original-position');
      if (report) { report.before(reportAnchor); bar.appendChild(report); }
      layout.before(bar);
      workspace = {layout, bar, controls, anchor, report, reportAnchor};
    }
    // Compare mode already has its own controls. Observe its display switch.
    page.classList.toggle('mobile-comparing', landscape.matches && layout.style.display === 'none');
    if (!landscape.matches && workspace) {
      const old = workspace;
      if (old.controls && old.anchor.parentNode) old.anchor.replaceWith(old.controls);
      if (old.report && old.reportAnchor.parentNode) old.reportAnchor.replaceWith(old.report);
      old.bar.remove(); old.layout.classList.remove('mobile-show-data'); workspace = null;
    }
  }

  function prepareTouch() {
    const page = document.getElementById('3dSimPage');
    const container = document.getElementById('canvas-container');
    if (!page || !container) return;
    if (media.matches && !help) {
      help = document.createElement('p');
      help.className = 'mobile-3d-help';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '开启三维操作';
      button.setAttribute('aria-pressed', 'false');
      const text = document.createElement('span');
      text.textContent = '当前可在画面上滑动页面';
      button.addEventListener('click', () => {
        const scrolling = page.classList.toggle('mobile-3d-scroll');
        button.textContent = scrolling ? '开启三维操作' : '切回页面滚动';
        button.setAttribute('aria-pressed', String(!scrolling));
        text.textContent = scrolling ? '当前可在画面上滑动页面' : '单指旋转，双指缩放；滑动页面请先切回';
      });
      help.append(button, text);
      container.before(help);
      page.classList.add('mobile-3d-scroll');
    } else if (!media.matches && help) {
      help.remove(); help = null;
      page.classList.remove('mobile-3d-scroll');
    }
  }

  function resizeCompare(canvas) {
    // Presentation-only resize: do not call resizeCompCanvas(), which resets
    // falling balls. Preserve simulation time, particles and recorded data.
    const width = 720;
    const height = Math.max(280, parseFloat(compare.originalHeight) || 280);
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      if (typeof window.renderCompCanvas === 'function') window.renderCompCanvas();
    }
  }

  function prepareCompare() {
    const canvas = document.getElementById('compare-canvas');
    if (compare && compare.canvas !== canvas) compare = null;
    if (!canvas) return;
    if (media.matches && !compare) {
      const scroll = document.createElement('div');
      scroll.className = 'mobile-compare-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('aria-label', '三组动画，可左右滑动查看');
      const surface = document.createElement('div');
      surface.className = 'mobile-compare-surface';
      const hint = document.createElement('p');
      hint.className = 'mobile-compare-hint';
      hint.textContent = '左右滑动查看 A / B / C 三组动画';
      compare = { canvas, scroll, hint, originalWidth: canvas.style.width, originalHeight: canvas.style.height };
      canvas.before(hint, scroll);
      scroll.appendChild(surface);
      surface.appendChild(canvas);
    }
    if (media.matches && compare) resizeCompare(canvas);
    if (!media.matches && compare) {
      const old = compare;
      old.scroll.before(canvas);
      old.scroll.remove(); old.hint.remove();
      canvas.style.width = old.originalWidth;
      canvas.style.height = old.originalHeight;
      compare = null;
      // Restore drawing dimensions without resetting the comparison state.
      const width = Math.max(canvas.parentElement.clientWidth - 40, 100);
      const height = parseFloat(canvas.style.height) || 280;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = width + 'px';
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      if (typeof window.renderCompCanvas === 'function') window.renderCompCanvas();
    }
  }

  function sync() {
    frame = 0;
    resolveLayout();
    prepareRotationButton();
    prepareTouch();
    prepareWorkspace();
    prepareCompare();
    const elements = [...document.querySelectorAll('.canvas-area, #canvas-container, #comp-overlay-vt, #normalLayout .chart-container')];
    for (const [element] of watched) {
      if (!elements.includes(element)) { observer.unobserve(element); watched.delete(element); }
    }
    for (const element of elements) {
      if (!watched.has(element)) { watched.set(element, ''); observer.observe(element); }
    }
    if (!media.matches) return;
    for (const element of elements) {
      const key = element.clientWidth + ':' + element.clientHeight;
      if (!element.clientWidth || !element.clientHeight) { watched.set(element, ''); continue; }
      if (watched.get(element) === key) continue;
      watched.set(element, key);
      if (element.id === 'canvas-container') {
        if (element.querySelector('canvas') && window.ThreeDSimulation) window.ThreeDSimulation.resize();
      } else if (element.id === 'comp-overlay-vt') {
        if (window.LabPlot) {
          const chart = window.LabPlot.getInstanceByDom(element);
          if (chart) chart.resize();
        }
      } else if (element.classList.contains('chart-container')) {
        if (typeof AppState !== 'undefined' && AppState.chartInstance) AppState.chartInstance.resize();
      } else if (element.querySelector('canvas')) {
        if (typeof window.resizeCanvas === 'function') window.resizeCanvas();
        if (typeof window.drawSimulationCanvas === 'function') window.drawSimulationCanvas();
      }
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : {observe() {}, unobserve() {}};
  function viewport() {
    resolveLayout();
    const root = document.documentElement;
    if (media.matches) {
      const v = window.visualViewport;
      root.style.setProperty('--mobile-visible-height', (v ? v.height : innerHeight) + 'px');
      root.style.setProperty('--mobile-visible-top', (v ? v.offsetTop : 0) + 'px');
      // Manual fallback rotates only the experiment work area, not browser UI.
      // Native range/button hit-testing follows the CSS transform.
      const unzoomed = v && (!v.scale || v.scale === 1);
      const width = unzoomed && v.width || dimensions.width;
      const height = unzoomed && v.height || dimensions.height;
      root.style.setProperty('--mobile-physical-width', width + 'px');
      root.style.setProperty('--mobile-physical-height', height + 'px');
      root.style.setProperty('--mobile-workspace-width', (dimensions.rotatedView ? height : width) + 'px');
      root.style.setProperty('--mobile-workspace-height', (dimensions.rotatedView ? width : height) + 'px');
      const fab = document.getElementById('ai-launcher');
      // Drag stores absolute top/left. Clamp only if it is outside the visible
      // viewport, including rotation and opening the virtual keyboard.
      if (fab) {
        const r = fab.getBoundingClientRect();
        const left = v ? v.offsetLeft : 0, top = v ? v.offsetTop : 0;
        const width = v ? v.width : innerWidth, height = v ? v.height : innerHeight;
        const x = Math.max(left + 8, Math.min(r.left, left + width - r.width - 8));
        const y = Math.max(top + 8, Math.min(r.top, top + height - r.height - 8));
        if (Math.abs(x - r.left) > 1 || Math.abs(y - r.top) > 1) {
          fab.style.left = x + 'px'; fab.style.right = 'auto'; fab.style.top = y + 'px'; fab.style.bottom = 'auto';
        }
      }
    } else {
      root.style.removeProperty('--mobile-visible-height');
      root.style.removeProperty('--mobile-visible-top');
      root.style.removeProperty('--mobile-workspace-height');
      root.style.removeProperty('--mobile-workspace-width');
      root.style.removeProperty('--mobile-physical-width');
      root.style.removeProperty('--mobile-physical-height');
    }
    schedule();
  }
  function listenQuery(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else if (query.addListener) query.addListener(callback);
  }
  function rotated() {
    rotationTimers.forEach(id => clearTimeout(id));
    viewport();
    // Some WebViews report the old size during orientationchange. Re-read
    // after layout settles; cancel pending probes on another rotation.
    rotationTimers = [100, 350, 800].map(delay => setTimeout(() => {
      watched.forEach((_, element) => watched.set(element, ''));
      viewport();
    }, delay));
  }

  let experimentWasVisible = false;
  function preparePageTransitions() {
    const page = document.getElementById('experimentPage');
    if (!page || page.dataset.mobileTransitionWatch) return;
    page.dataset.mobileTransitionWatch = 'true';
    experimentWasVisible = getComputedStyle(page).display !== 'none';
    new MutationObserver(() => {
      const visible = getComputedStyle(page).display !== 'none';
      if (media.matches && visible && !experimentWasVisible) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const content = page.querySelector('.content-area');
        if (content) content.scrollTop = 0;
      }
      experimentWasVisible = visible;
    }).observe(page, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function init() {
    preparePageTransitions();
    // Presentation-only fitting. Keep logical physics/state and the DPR
    // transform unchanged; restore the context even when drawing fails.
    ['drawNewtonSimulation', 'drawStokesSimulation'].forEach(name => {
      const original = window[name];
      if (typeof original !== 'function') return;
      window[name] = function (w, h, dark) {
        if (!landscape.matches || typeof canvasCtx === 'undefined' || !canvasCtx || w <= 0 || h <= 0)
          return original.apply(this, arguments);
        const stokes = name === 'drawStokesSimulation';
        const scale = Math.min(1, w / 480, h / (stokes ? 480 : 320));
        const padding = stokes ? 40 : 0;
        canvasCtx.save();
        try {
          canvasCtx.scale(scale, scale);
          canvasCtx.translate(0, padding);
          return original.call(this, w / scale, h / scale - 2 * padding, dark);
        } finally { canvasCtx.restore(); }
      };
    });
    // The outer handler ALSO calls initCompParticles(), after resizeCompCanvas.
    // Replace the mobile path before enterCompareMode registers the listener.
    const originalCompHandler = window.compResizeHandler;
    if (typeof originalCompHandler === 'function') {
      window.compResizeHandler = function () {
        if (!media.matches && !compare) return originalCompHandler.apply(this, arguments);
        if (window.LabPlot) {
          const element = document.getElementById('comp-overlay-vt');
          const chart = element && window.LabPlot.getInstanceByDom(element);
          if (chart) chart.resize();
        }
        schedule();
      };
    }
    // WebGL owns its drawing buffer. The original generic resize assigns
    // canvas.width/height before renderer.setSize, problematic at high DPR.
    const originalCanvasResize = window.resizeCanvas;
    if (typeof originalCanvasResize === 'function') {
      window.resizeCanvas = function () {
        if (media.matches && typeof poiseuille3DRenderer !== 'undefined' && poiseuille3DRenderer &&
            typeof AppState !== 'undefined' && AppState.currentExperiment === 'poiseuille') {
          const canvas = document.getElementById('simCanvas');
          if (!canvas || !canvas.parentElement.clientWidth || !canvas.parentElement.clientHeight) return;
          const width = canvas.parentElement.clientWidth, height = canvas.parentElement.clientHeight;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (poiseuille3DRenderer.getPixelRatio() !== dpr) poiseuille3DRenderer.setPixelRatio(dpr);
          poiseuille3DRenderer.setSize(width, height);
          canvas._cssW = width; canvas._cssH = height;
          if (typeof poiseuille3DCamera !== 'undefined' && poiseuille3DCamera) {
            poiseuille3DCamera.aspect = width / height;
            poiseuille3DCamera.updateProjectionMatrix();
            if (typeof poiseuille3DScene !== 'undefined' && poiseuille3DScene)
              poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
          }
          return;
        }
        return originalCanvasResize.apply(this, arguments);
      };
    }
    const originalResize = window.resizeCompCanvas;
    if (typeof originalResize === 'function') {
      window.resizeCompCanvas = function () {
        if (!media.matches) return originalResize.apply(this, arguments);
        const sameCanvas = window.compCanvas === document.getElementById('compare-canvas');
        const balls = window.stokesCompBalls, particles = window.compParticles;
        try { return originalResize.apply(this, arguments); }
        finally {
          // Mobile browser toolbars / rotation must not release the balls again.
          if (sameCanvas && balls) {
            window.stokesCompBalls = balls;
            window.compParticles = particles;
          }
          schedule();
        }
      };
    }
    // Observe only layout roots. Per-frame data-panel text changes are ignored.
    ['lineSimPage', 'principlePage', '3dSimPage', 'experimentPage'].forEach(id => {
      const element = document.getElementById(id);
      if (element) new MutationObserver(schedule).observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    const line = document.getElementById('lineSimPage');
    if (line) new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 &&
        (node.matches('canvas, #normalLayout, .card') || node.querySelector('canvas'))))) schedule();
    }).observe(line, { childList: true, subtree: true });
    // Attribute-only layout watching avoids reacting to each numerical readout.
    if (line) new MutationObserver(records => {
      if (records.some(r => r.target.id === 'normalLayout' || r.target.id === 'compare-container')) schedule();
    }).observe(line, {attributes:true, subtree:true, attributeFilter:['style']});
    listenQuery(mediaQuery, viewport);
    listenQuery(landscapeQuery, rotated);
    listenQuery(anyTouchQuery, viewport);
    window.addEventListener('resize', viewport, { passive: true });
    window.addEventListener('orientationchange', rotated, { passive: true });
    if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener)
      window.screen.orientation.addEventListener('change', rotated);
    window.addEventListener('pageshow', rotated);
    if (document.addEventListener) document.addEventListener('visibilitychange', () => { if (!document.hidden) rotated(); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', viewport, { passive: true });
      window.visualViewport.addEventListener('scroll', viewport, { passive: true });
    }
    viewport();
  }
  window.ViscosityMobileAdapter = Object.freeze({ version: '1.5.0', refresh: viewport,
    setLandscapeMode(enabled) { if (media.matches || !enabled) { manualLandscape = !!enabled; viewport(); } },
    getStatus: () => ({version:'1.5.0', ...dimensions}) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
