
/* 四步入门引导：题目使用独立弹窗，提示通过助手消息和气泡展示。引导由显式入口启动；进度仅保存在本页内存。助手或进阶模块不可用时保留引导栏及弹窗。 */
(function () {
  'use strict';
  if (window.V7Guide) return;

  function log(msg) { try { if (window.__v6Log) window.__v6Log('[v7-guide] ' + msg); } catch (e) {} }

  /* 引导题目沿用项目 V6 内容，采用点选作答。 */
  var EXPS = {
    newton: {
      label: '牛顿黏性定律实验',
      step1: '先看「原理」页：牛顿黏性定律讲的是相邻流层之间的内摩擦，τ = μ·(du/dz)。看完点引导栏里的按钮。',
      step1Tex: '先看「原理」页：牛顿黏性定律讲的是相邻流层之间的内摩擦，$\\tau=\\mu\\dfrac{du}{dz}$。看完点引导栏里的按钮。',
      step3: '现在轮到你自己动手了。切到「线图模拟」或「3D 模拟」，改一改上板速度、板间距、板面积，盯住剪切应力的读数怎么变。',
      bank: {"basic": [{"id": "N-01", "title": "牛顿黏性定律指出，流体内部的剪切应力与速度梯度成正比。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。τ = μ·du/dy，线性本构关系。", "fbNo": "正确答案：正确。τ = μ·du/dy，线性本构关系。"}, {"id": "N-02", "title": "改变上板速度的大小，不会改变两板间流体的速度梯度。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。上板速度增大，速度梯度直线斜率变陡。", "fbNo": "正确答案：错误。上板速度增大，速度梯度直线斜率变陡。"}, {"id": "N-03", "title": "减小两平板之间的间距，速度梯度将增大。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。梯度 = U/h，h 减小则梯度增大。", "fbNo": "正确答案：正确。梯度 = U/h，h 减小则梯度增大。"}, {"id": "N-04", "title": "增大流体的黏滞系数，速度梯度直线的数值会随之改变。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。黏度只影响力的大小，不改变速度梯度。", "fbNo": "正确答案：错误。黏度只影响力的大小，不改变速度梯度。"}, {"id": "N-05", "title": "改变平板的面积，剪切应力的大小不会发生变化。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。F 随 A 变，但 τ = F/A 不变。", "fbNo": "正确答案：正确。F 随 A 变，但 τ = F/A 不变。"}, {"id": "N-06", "title": "速度梯度仅由上板速度与板间距共同决定。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。与黏度、面积无关。", "fbNo": "正确答案：正确。与黏度、面积无关。"}, {"id": "N-07", "title": "若上板速度与板间距同比例增大，速度梯度保持不变。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。U/h 比值不变，梯度不变。", "fbNo": "正确答案：正确。U/h 比值不变，梯度不变。"}, {"id": "N-08", "title": "牛顿流体在任意剪切速率下黏度均保持为常数。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。牛顿流体的定义。", "fbNo": "正确答案：正确。牛顿流体的定义。"}, {"id": "N-09", "title": "增大板面积可以同时增大速度梯度和黏滞力。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。面积只改变力，不改变梯度。", "fbNo": "正确答案：错误。面积只改变力，不改变梯度。"}], "summary": [{"id": "N-02", "title": "其他条件不变，仅增大上板速度 U，则两板间速度梯度", "kind": "three", "options": ["不变", "增大", "减小"], "correct": 1, "explain": "梯度 = U/h，U 增大则梯度增大。"}, {"id": "N-03", "title": "其他条件不变，仅增大板间距 h，则速度梯度", "kind": "three", "options": ["不变", "增大", "减小"], "correct": 2, "explain": "梯度 = U/h，h 增大则梯度减小。"}, {"id": "N-04", "title": "增大流体黏滞系数 μ，对速度梯度的影响是", "kind": "three", "options": ["梯度增大", "梯度不变", "梯度减小"], "correct": 1, "explain": "μ 只改变力的大小，速度梯度由 U/h 决定。"}, {"id": "N-05", "title": "增大板面积 A，则剪切应力 τ 与黏滞力 F 的变化为", "kind": "three", "options": ["两者均增大", "τ 不变、F 增大", "两者均不变"], "correct": 1, "explain": "F = μAU/h 随 A 增大，τ = F/A 与 A 无关。"}, {"id": "N-06", "title": "上板速度与板间距同时增大为原来的 2 倍，速度梯度", "kind": "three", "options": ["增大为 4 倍", "不变", "减小为 1/2"], "correct": 1, "explain": "U/h 比值不变，梯度不变。"}, {"id": "N-07", "title": "流体粒子拖尾效应越明显，说明", "kind": "three", "options": ["流速越高", "流体黏度越大", "板间距越小"], "correct": 1, "explain": "拖尾是黏性阻力增大的可视化表征。"}, {"id": "N-08", "title": "下列属于牛顿流体的是", "kind": "three", "options": ["甘油水溶液", "牙膏", "血液"], "correct": 0, "explain": "甘油为牛顿流体；牙膏、血液呈非牛顿特性。"}, {"id": "N-09", "title": "在对比模式中固定 U、h、A 仅改变 μ，可观察到", "kind": "three", "options": ["速度梯度改变", "速度梯度不变、阻力分层", "粒子运动消失"], "correct": 1, "explain": "梯度不变而黏滞力随 μ 线性分层。"}, {"id": "N-10", "title": "牛顿黏性定律反映的是", "kind": "three", "options": ["动量守恒", "黏性剪切的线性本构关系", "能量守恒"], "correct": 1, "explain": "本构关系，非守恒方程。"}]}
    },

    poiseuille: {
      label: '泊肃叶定律实验',
      step1: '先看「原理」页：泊肃叶定律讲的是圆管层流的流量规律 Q = πR⁴ΔP/(8μL)。看完点引导栏里的按钮。',
      step1Tex: '先看「原理」页：泊肃叶定律讲的是圆管层流的流量规律 $Q=\\dfrac{\\pi R^{4}\\Delta P}{8\\mu L}$。看完点引导栏里的按钮。',
      step3: '现在轮到你自己动手了。切到「线图模拟」或「3D 模拟」，改一改管子粗细、压强差、管长，盯住流量的读数怎么变。',
      bank: {"basic": [{"id": "P-01", "title": "泊肃叶定律适用于圆管内的定常层流流动。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。理论前提：层流、牛顿流体、充分发展。", "fbNo": "正确答案：正确。理论前提：层流、牛顿流体、充分发展。"}, {"id": "P-02", "title": "圆管中黏性层流的速度剖面呈抛物线形，最大流速位于管壁处。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。最大流速位于管轴线，壁面为零。", "fbNo": "正确答案：错误。最大流速位于管轴线，壁面为零。"}, {"id": "P-03", "title": "体积流率与管半径的四次方成正比。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。Q ∝ R⁴，哈根-泊肃叶公式。", "fbNo": "正确答案：正确。Q ∝ R⁴，哈根-泊肃叶公式。"}, {"id": "P-04", "title": "增大管两端压强差，体积流率将减小。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。Q 与 Δp 成正比。", "fbNo": "正确答案：错误。Q 与 Δp 成正比。"}, {"id": "P-05", "title": "流体的黏度越大，相同压强差下的体积流率越小。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。Q 与 η 成反比。", "fbNo": "正确答案：正确。Q 与 η 成反比。"}, {"id": "P-06", "title": "增加管长会增大体积流率。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。Q 与 L 成反比，管越长阻力越大。", "fbNo": "正确答案：错误。Q 与 L 成反比，管越长阻力越大。"}, {"id": "P-07", "title": "泊肃叶流动中，壁面剪切应力与管半径无关。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。τ_w ∝ R，半径越大壁面切应力越大。", "fbNo": "正确答案：错误。τ_w ∝ R，半径越大壁面切应力越大。"}, {"id": "P-08", "title": "若管半径减半，体积流率将变为原来的 1/16。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。四次方关系，1/2⁴ = 1/16。", "fbNo": "正确答案：正确。四次方关系，1/2⁴ = 1/16。"}, {"id": "P-10", "title": "泊肃叶定律仅适用于牛顿流体。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。非牛顿流体需修正本构关系。", "fbNo": "正确答案：正确。非牛顿流体需修正本构关系。"}], "summary": [{"id": "P-01", "title": "泊肃叶定律描述的圆管层流，其速度剖面形状为", "kind": "three", "options": ["直线形", "抛物线形", "对数形"], "correct": 1, "explain": "黏性剪切与压力驱动平衡，剖面为抛物线。"}, {"id": "P-02", "title": "圆管层流的最大流速位于", "kind": "three", "options": ["管壁处", "管轴线处", "任意位置均相同"], "correct": 1, "explain": "无滑移边界下轴线流速最大、壁面为零。"}, {"id": "P-03", "title": "体积流率 Q 与管半径 R 的关系为", "kind": "three", "options": ["Q ∝ R", "Q ∝ R²", "Q ∝ R⁴"], "correct": 2, "explain": "哈根-泊肃叶公式，四次方依赖。"}, {"id": "P-04", "title": "其他条件不变，增大压强差 Δp，则 Q", "kind": "three", "options": ["增大", "不变", "减小"], "correct": 0, "explain": "Q 与 Δp 成正比。"}, {"id": "P-05", "title": "流体黏度 η 增大，则体积流率 Q", "kind": "three", "options": ["增大", "不变", "减小"], "correct": 2, "explain": "Q 与 η 成反比。"}, {"id": "P-06", "title": "管长 L 增大，则体积流率 Q", "kind": "three", "options": ["增大", "不变", "减小"], "correct": 2, "explain": "Q 与 L 成反比，管越长沿程阻力越大。"}, {"id": "P-07", "title": "管半径减半，其他不变，体积流率变为原来的", "kind": "three", "options": ["1/2", "1/8", "1/16"], "correct": 2, "explain": "四次方关系，(1/2)⁴ = 1/16。"}, {"id": "P-08", "title": "泊肃叶定律成立的前提条件不包括", "kind": "three", "options": ["定常层流", "牛顿流体", "高雷诺数湍流"], "correct": 2, "explain": "仅适用于低雷诺数层流。"}]}
    },

    stokes: {
      label: '斯托克斯定律实验',
      step1: '先看「原理」页：斯托克斯定律讲的是小球在黏性流体里受到的阻力 F = 6πμrv。看完点引导栏里的按钮。',
      step1Tex: '先看「原理」页：斯托克斯定律讲的是小球在黏性流体里受到的阻力 $F=6\\pi\\mu rv$。看完点引导栏里的按钮。',
      step3: '现在轮到你自己动手了。切到「线图模拟」或「3D 模拟」，换一换小球大小和流体黏度，盯住速度读数的变化。',
      bank: {"basic": [{"id": "S-01", "title": "斯托克斯定律适用于任意雷诺数下的球体绕流。", "kind": "two", "options": ["正确", "错误"], "correct": 1, "fbOk": "回答正确。仅适用于低雷诺数（Re ≪ 1）蠕流。", "fbNo": "正确答案：错误。仅适用于低雷诺数（Re ≪ 1）蠕流。"}, {"id": "S-02", "title": "斯托克斯阻力与球体半径、流体黏度及沉降速度均成正比。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。F = 6πηrv。", "fbNo": "正确答案：正确。F = 6πηrv。"}, {"id": "S-03", "title": "颗粒尺寸增大或沉降速度提高时，惯性力不可忽略，斯托克斯公式将失效。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。雷诺数超限，需引入惯性修正。", "fbNo": "正确答案：正确。雷诺数超限，需引入惯性修正。"}, {"id": "S-05", "title": "增大流体黏度会减小颗粒的终端沉降速度。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。阻力增大，终端速度降低。", "fbNo": "正确答案：正确。阻力增大，终端速度降低。"}, {"id": "S-08", "title": "颗粒半径增大一倍，在相同条件下黏滞阻力也增大一倍。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。F ∝ r，线性关系。", "fbNo": "正确答案：正确。F ∝ r，线性关系。"}, {"id": "S-09", "title": "绕流场中出现流线分离和尾涡，说明流动已偏离斯托克斯定律的适用条件。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。分离是惯性效应显现的标志。", "fbNo": "正确答案：正确。分离是惯性效应显现的标志。"}, {"id": "S-10", "title": "终端速度是指颗粒在流体中受力平衡后的匀速沉降速度。", "kind": "two", "options": ["正确", "错误"], "correct": 0, "fbOk": "回答正确。重力 = 浮力 + 黏滞阻力。", "fbNo": "正确答案：正确。重力 = 浮力 + 黏滞阻力。"}], "summary": [{"id": "S-01", "title": "斯托克斯阻力公式为 F = 6πηrv，其中 r 表示", "kind": "three", "options": ["流体密度", "球体半径", "沉降距离"], "correct": 1, "explain": "r 为球体半径。"}, {"id": "S-02", "title": "斯托克斯定律适用的雷诺数条件是", "kind": "three", "options": ["Re ≫ 1", "Re ≪ 1", "任意 Re"], "correct": 1, "explain": "低雷诺数蠕流，惯性可忽略。"}, {"id": "S-03", "title": "增大流体黏度 η，颗粒终端沉降速度将", "kind": "three", "options": ["增大", "不变", "减小"], "correct": 2, "explain": "阻力增大，终端速度降低。"}, {"id": "S-04", "title": "增大球体半径 r，黏滞阻力 F 将", "kind": "three", "options": ["不变", "线性增大", "平方增大"], "correct": 1, "explain": "F ∝ r，线性关系。"}, {"id": "S-06", "title": "当颗粒尺寸过大或沉降速度过高时，应", "kind": "three", "options": ["继续使用斯托克斯公式", "引入惯性修正", "忽略阻力"], "correct": 1, "explain": "Re 超限时需修正阻力系数。"}, {"id": "S-07", "title": "颗粒达到终端速度时，满足", "kind": "three", "options": ["重力 = 浮力 + 黏滞阻力", "合力为零后加速", "阻力为零"], "correct": 0, "explain": "三力平衡，匀速沉降。"}]}
    }
  };

  /* 任务大厅的补充文案（与 V5 探究实验室保持一致） */
  var HALL_TITLES = {
    N1: '剪切应力和速度梯度',
    N2: '面积增大，力和应力都增大吗？',
    P1: '管道半径怎样影响流量？',
    P2: '什么时候不能继续使用层流模型？',
    S2: '小球半径怎样影响终端速度？'
  };
  var HALL_DELIVER = {
    N1: '应力—速度梯度图、斜率及其物理意义',
    N2: '力—面积与应力—面积两张图及比较',
    N3: '测量方案、应力—梯度图、黏度估计与适用条件',
    P1: '至少两种坐标的比较，以及幂指数估计',
    P2: '压差—Re 图，以及对阈值内外记录的不同处理',
    P3: '反演黏度结果，以及使用的测量关系和误差说明',
    P4: '至少四种方案、流量倍率和模型约束的比较',
    S1: '三个计时区间、区间速度及稳定性比较',
    S2: '半径、半径平方和对数坐标的比较',
    S3: '逐组阻力模型选择、Re 与力平衡依据',
    S4: '计时区间、适用性检查和黏度估计',
    C1: '三种方法的黏度结果及不确定度、适用性比较'
  };
  var HALL_FAMS = [['all', '全部'], ['N', '平行板'], ['P', '毛细管'], ['S', '落球'], ['C', '方法比较']];

  /* ============================= 二、小工具 ============================= */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* AppState 是顶层 const，位于全局词法环境，不能通过 window 属性读取。 */
  function appState() {
    try { return (typeof AppState !== 'undefined' && AppState) ? AppState : (window.AppState || null); } catch (e) { return null; }
  }
  function nowExp() {
    var s = appState();
    try { return (s && s.currentExperiment) || null; } catch (e) { return null; }
  }
  function onExperimentPage() {
    var hp = document.getElementById('homePage');
    var ep = document.getElementById('experimentPage');
    if (!hp || !ep) return true;
    if (hp.style.display === 'flex' || hp.style.display === 'block') return false;
    if (ep.style.display === 'none') return false;
    return true;
  }
  function goSub(name) {
    try { if (typeof Navigation !== 'undefined' && Navigation.switchSubPage) { Navigation.switchSubPage(name); return true; } } catch (e) {}
    return false;
  }

  /* ================== 三、提示性消息：从 实验助手弹出 ================== */
  /* 两种形态同时给：① 右下角 实验助手小气泡；② 写进 AI 对话框正文。 */
  function aiOpenPanel() {
    try { var A = window.AIAssistant; if (A && typeof A.open === 'function') A.open(); } catch (e) {}
  }
  function aiBox() { return document.getElementById('ai-messages'); }
  function aiDropIntro() {
    var box = aiBox();
    var intro = box && box.querySelector('#ai-intro');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
  }

  var bubble = null, bubbleTimer = null, bubbleQueue = [];
  /* 气泡可以拖着走：位置只记在本次页面里，刷新后回到默认的右下角 */
  var bubblePos = null;

  function clampPos(left, top, w, h) {
    var vw = window.innerWidth || 1024;
    var vh = window.innerHeight || 768;
    return {
      left: Math.min(Math.max(4, left), Math.max(4, vw - w - 4)),
      top: Math.min(Math.max(4, top), Math.max(4, vh - h - 4))
    };
  }
  function applyBubblePos() {
    if (!bubble || !bubblePos) return;
    var r = bubble.getBoundingClientRect();
    bubblePos = clampPos(bubblePos.left, bubblePos.top, r.width, r.height);
    bubble.style.left = bubblePos.left + 'px';
    bubble.style.top = bubblePos.top + 'px';
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
    bubble.classList.add('is-dragged');
  }
  function startBubbleTimer(ms) {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, ms == null ? 9000 : ms);
  }
  function hideBubble() {
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
    if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
    bubble = null;
    /* 提示队列按顺序展示，避免同时出现的消息互相覆盖。 */
    if (bubbleQueue.length) {
      var next = bubbleQueue.shift();
      window.setTimeout(function () { showBubble(next.t, next.x); }, 420);
    }
  }
  /* 按住气泡任意位置即可拖动；拖过之后那一次点击不算「打开 实验助手」 */
  function makeDraggable(node) {
    var drag = null;
    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      var t = e.target;
      if (t && t.closest && t.closest('.v7-bubble-x, .v7-bubble-go')) return;
      var r = node.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, moved: false };
      if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
      node.classList.add('is-dragging');
      try { node.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    }
    function onMove(e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      drag.moved = true;
      var r = node.getBoundingClientRect();
      bubblePos = clampPos(drag.left + dx, drag.top + dy, r.width, r.height);
      applyBubblePos();
      e.preventDefault();
    }
    function onUp() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      node.classList.remove('is-dragging');
      if (moved) {
        node.setAttribute('data-moved', '1');
        setTimeout(function () { if (node) node.removeAttribute('data-moved'); }, 80);
        startBubbleTimer(9000);
      } else {
        startBubbleTimer(5000);
      }
    }
    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
    /* 拖动拦截必须先于点击打开助手的监听器注册。 */
    node.addEventListener('click', function (e) {
      if (node.getAttribute('data-moved')) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  }
  function showBubble(title, text) {
    try {
      if (bubble) {
        bubbleQueue.push({ t: title, x: text });
        if (bubbleQueue.length > 2) bubbleQueue.shift();
        return;
      }
      if (!document.body) return;
      bubble = el('div', 'v7-bubble');
      bubble.setAttribute('role', 'status');
      bubble.title = '按住可以拖动';
      var head = el('div', 'v7-bubble-head');
      head.appendChild(el('span', 'v7-bubble-drag', '⠿'));
      head.appendChild(el('b', null, title));
      var x = el('button', 'v7-bubble-x', '×');
      x.type = 'button';
      x.title = '关闭提示';
      x.addEventListener('click', function (e) { e.stopPropagation(); hideBubble(); });
      head.appendChild(x);
      bubble.appendChild(head);
      bubble.appendChild(el('p', 'v7-bubble-text', text));
      var go = el('button', 'v7-bubble-go', '打开 实验助手');
      go.type = 'button';
      go.addEventListener('click', function (e) { e.stopPropagation(); hideBubble(); aiOpenPanel(); });
      bubble.appendChild(go);
      makeDraggable(bubble);
      bubble.addEventListener('click', function () { hideBubble(); aiOpenPanel(); });
      document.body.appendChild(bubble);
      applyBubblePos();
      startBubbleTimer(9000);
    } catch (e) { log('气泡失败: ' + (e && e.message || e)); }
  }

  /* title：气泡与对话里的标题；bodyHtml：只进对话框正文；bubbleText：气泡里那一行 */
  function aiHint(title, bodyHtml, bubbleText, hintKey) {
    try {
      var box = aiBox();
      if (box) {
        aiDropIntro();
        var html = '<div class="ai-msg-title">' + title + '</div>' + (bodyHtml || '');
        if (window.V7AiLook && V7AiLook.math) html = V7AiLook.math(html);
        var d = hintKey ? box.querySelector('[data-hint-key="' + hintKey + '"]') : null;
        if (d && d.innerHTML === html) return;
        if (!d) {
          d = el('div', 'ai-msg assistant v7-msg');
          if (hintKey) d.setAttribute('data-hint-key', hintKey);
          box.appendChild(d);
        }
        d.innerHTML = html;
        box.scrollTop = box.scrollHeight;
        if (window.V7AiLook && V7AiLook.clean) V7AiLook.clean(d);
      }
    } catch (e) {}
    showBubble(title, bubbleText || '');
  }

  /* ================== 四、弹窗：沿用 V6 的 .v6ovl 外观 ================== */
  var ovl = el('div', 'v6ovl');
  var ovlMask = el('div', 'v6ovl-mask');
  var ovlPanel = el('div', 'v6ovl-panel');
  ovl.hidden = true;
  ovl.appendChild(ovlMask);
  ovl.appendChild(ovlPanel);
  /* 答题前收起助手面板，避免较高层级遮挡弹窗。 */
  function closeAiPanel() {
    try {
      var A = window.AIAssistant;
      if (A && typeof A.close === 'function' && A.isOpen) A.close();
    } catch (e) {}
  }
  function openModal(node, wide) {
    ovlPanel.className = 'v6ovl-panel' + (wide ? ' v7-wide' : '');
    ovlPanel.innerHTML = '';
    ovlPanel.appendChild(node);
    ovl.hidden = false;
    closeAiPanel();
    if (document.body && ovl.parentNode !== document.body) document.body.appendChild(ovl);
  }
  function closeModal() {
    ovl.hidden = true;
    ovlPanel.innerHTML = '';
  }
  function modalActions(buttons) {
    var wrap = el('div', 'v6ovl-actions');
    (buttons || []).forEach(function (a) {
      var b = el('button', a.ghost ? 'v6ovl-ghost' : (a.primary ? 'v6ovl-primary' : ''), a.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (a.keep !== true) closeModal();
        try { if (a.onClick) a.onClick(); } catch (e) { log('弹窗按钮失败: ' + (e && e.message || e)); }
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ======================= 五、引导栏（页面内） ======================= */
  var bar = el('div');
  bar.id = 'v7GuideBar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', '入门引导');
  bar.innerHTML =
    '<span class="v7gb-badge">入门引导<b class="v7gb-step">未开始</b></span>' +
    '<span class="v7gb-dots">' +
      '<i class="v7gb-dot" data-dot="1"></i><i class="v7gb-dot" data-dot="2"></i>' +
      '<i class="v7gb-dot" data-dot="3"></i><i class="v7gb-dot" data-dot="4"></i>' +
    '</span>' +
    '<span class="v7gb-text" aria-live="polite"></span>' +
    '<span class="v7gb-actions">' +
      '<button type="button" class="v7gb-btn primary v7gb-entry">帮我引导</button>' +
      '<button type="button" class="v7gb-btn primary v7gb-next" hidden>下一步</button>' +
      '<button type="button" class="v7gb-btn primary v7gb-conclude" hidden>得出结论</button>' +
      '<button type="button" class="v7gb-btn adv v7gb-advanced">进阶任务</button>' +
      '<button type="button" class="v7gb-btn ghost v7gb-skip" hidden>跳过引导</button>' +
    '</span>';
  var barStep = q('.v7gb-step', bar);
  var barBadge = q('.v7gb-badge', bar);
  var barText = q('.v7gb-text', bar);
  var barDots = q('.v7gb-dots', bar);
  var btnEntry = q('.v7gb-entry', bar);
  var btnNext = q('.v7gb-next', bar);
  var btnConclude = q('.v7gb-conclude', bar);
  var btnAdv = q('.v7gb-advanced', bar);
  var btnSkip = q('.v7gb-skip', bar);

  /* ============================= 六、状态 ============================= */
  var st = { exp: null, phase: 0, q: 0, touched: false };
  var DONE = 'done';

  function draw(pool, count) {
    var shuffled = pool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    return shuffled.slice(0, count);
  }
  function reset(exp) { st = { exp: exp, phase: 0, q: 0, touched: false, skipped: false }; }
  function selectQuestions(exp) {
    EXPS[exp].q2 = draw(EXPS[exp].bank.basic, 2);
    EXPS[exp].q4 = draw(EXPS[exp].bank.summary, 1)[0];
  }
  function conf() { return st.exp ? EXPS[st.exp] : null; }

  function leadText(c) {
    var p = st.phase;
    if (p === 0) return '想让我带你走一遍这个实验吗？点右边「帮我引导」，我会一步一步提示你。';
    if (p === 1) return c.step1;
    if (p === 2) return '第 2 步 · 基础判断题：点一下选项就能答，答错也有讲解，答完继续。';
    if (p === 3) return c.step3 + ' 想好了就点「得出结论」。';
    if (p === 4) return '第 4 步 · 收尾结论：最后一道单选题，答完这一轮引导就结束了。';
    return '引导完成。点「进阶任务」挑一个任务继续深入探究。';
  }

  function render() {
    var exp = nowExp();
    var c = exp ? EXPS[exp] : null;
    if (!c || !onExperimentPage()) { bar.hidden = true; return; }
    /* 换实验：引导没开始就跟着换；正做到一半就退回未开始，避免串台 */
    if (st.exp !== exp) {
      if (st.phase === 0 || st.phase === DONE) st.exp = exp;
      else { reset(exp); closeModal(); }
    }
    if (st.exp !== exp) st.exp = exp;
    c = conf();
    if (!c) { bar.hidden = true; return; }

    /* 没开始引导时，整条栏（含两个入口按钮）都不出现；引导只从「帮我探究 → AI 卡片」进入 */
    if (st.phase === 0 || st.skipped) { bar.hidden = true; return; }

    bar.hidden = false;
    var p = st.phase;
    var isDone = (p === DONE);
    var running = (typeof p === 'number' && p >= 1 && p <= 4);
    var idle = (p === 0);

    barStep.textContent = isDone ? '已完成' : (p === 0 ? '未开始' : ('第 ' + p + '/4 步'));
    barText.textContent = leadText(c);
    bar.setAttribute('data-phase', isDone ? 'done' : (p === 0 ? 'idle' : 'run'));
    barBadge.hidden = false;
    barText.hidden = false;

    barDots.hidden = false;
    Array.prototype.forEach.call(bar.querySelectorAll('.v7gb-dot'), function (d) {
      var n = Number(d.getAttribute('data-dot'));
      var cls = 'v7gb-dot';
      if (isDone) cls += ' is-done';           /* 引导完成后四个点全亮 */
      else if (n < p) cls += ' is-done';
      else if (n === p) cls += ' is-current';
      d.className = cls;
    });

    btnEntry.hidden = !(p === 0 || isDone);
    btnEntry.textContent = isDone ? '再引导一遍' : '帮我引导';
    btnSkip.hidden = !running;
    btnConclude.hidden = !(p === 3);

    if (p === 1) { btnNext.hidden = false; btnNext.textContent = '看完了，下一步'; }
    else if (p === 2) { btnNext.hidden = false; btnNext.textContent = '继续答题'; }
    else if (p === 4) { btnNext.hidden = false; btnNext.textContent = '做结论题'; }
    else btnNext.hidden = true;
  }

  /* ============================= 七、四步流程 ============================= */
  /* 入口只有一个：首页「帮我探究」→ AI 卡片选实验 → 这里开始第 1 步。
     expArg 由 AI 卡片传进来（那时页面可能刚切完，取 nowExp() 也一致）。 */
  function startGuide(expArg) {
    /* 注意：直接把这个函数当 click 监听器时，第一个参数是事件对象，
       所以只有明确传进来一个合法的实验 key 才用它。 */
    var exp = (typeof expArg === 'string' && EXPS[expArg]) ? expArg : nowExp();
    if (!exp || !EXPS[exp]) return;
    reset(exp);
    selectQuestions(exp);
    st.phase = 1;
    render();
    goSub('principle');
    aiHint('入门引导 · 第 1 步 / 共 4 步 · 读原理',
           '<p>' + esc(EXPS[exp].step1Tex || EXPS[exp].step1) + '</p>' +
           '<p class="v7-tip">看完原理页，回来点引导栏里的「看完了，下一步」。</p>',
           '第 1 步：先读一遍原理页，看完点引导栏里的「看完了，下一步」。');
    log('startGuide ' + exp);
  }

  /* 通用选项渲染：答对答错都放行（判断题为 ✓/✗，结论题为 A/B/C/D） */
  function paintOptions(host, item, onDone) {
    var wrap = el('div', 'v6ovl-opts ' + (item.kind === 'three' ? 'v6ovl-three' : 'v6ovl-two'));
    var btns = [];
    item.options.forEach(function (o, k) {
      var key = (item.kind === 'two') ? (k === 0 ? '✓' : '✗') : String.fromCharCode(65 + k);
      var b = el('button', 'v6ovl-opt');
      b.type = 'button';
      b.appendChild(el('span', 'v6ovl-key', key));
      b.appendChild(el('span', null, o));
      b.addEventListener('click', function () {
        if (host.dataset.locked) return;
        host.dataset.locked = '1';
        btns.forEach(function (bb, idx) {
          bb.disabled = true;
          if (idx === item.correct) bb.classList.add('is-right');
          else if (idx === k) bb.classList.add('is-wrong');
        });
        onDone(k === item.correct, item);
      });
      btns.push(b);
      wrap.appendChild(b);
    });
    host.appendChild(wrap);
    return wrap;
  }

  /* ---- 第 2 步：两道基础判断题（正常弹窗） ---- */
  function askQ2() {
    var c = conf();
    if (!c || st.phase !== 2) return;
    if (st.q >= c.q2.length) { toStep3(); return; }
    var item = c.q2[st.q];
    var box = el('div');
    box.appendChild(el('p', 'v6ovl-eyebrow', '第 2 步 基础判断题（题库随机抽取） ' + (st.q + 1) + '/' + c.q2.length));
    box.appendChild(el('p', 'v6ovl-q', item.title));
    var fb = el('div', 'v6ovl-fb');
    fb.hidden = true;
    box.appendChild(fb);
    var acts = el('div', 'v6ovl-actions');
    var next = el('button', 'v6ovl-primary', '下一步');
    next.type = 'button';
    next.hidden = true;
    acts.appendChild(next);
    box.appendChild(acts);
    openModal(box);

    paintOptions(box, item, function (ok) {
      fb.hidden = false;
      fb.className = 'v6ovl-fb ' + (ok ? 'ok' : 'no');
      fb.textContent = ok ? item.fbOk : item.fbNo;
      next.hidden = false;
      next.textContent = (st.q + 1 >= c.q2.length) ? '答完了，进入自主探究' : '下一题';
    });
    next.addEventListener('click', function () {
      if (next.disabled) return;
      next.disabled = true;
      st.q += 1;
      if (st.q >= EXPS[st.exp].q2.length) toStep3();
      else askQ2();
    });
  }

  /* ---- 第 2 步与第 3 步之间：正常弹窗 ---- */
  function toStep3() {
    var c = conf();
    if (!c) return;
    var box = el('div');
    box.appendChild(el('p', 'v6ovl-eyebrow', '下一步 自主探究'));
    box.appendChild(el('p', 'v6ovl-q', '判断题做完了，接下来轮到你动手'));
    var p1 = el('p', null, '已经替你切到「线图模拟」，也可以自己切到「3D 模拟」或线图里的「对比实验」。');
    p1.style.margin = '0 0 8px';
    var p2 = el('p', null, '改一改参数，盯住读数怎么变；玩够了就点引导栏里的「得出结论」，我们再对答案。');
    p2.style.margin = '0';
    box.appendChild(p1);
    box.appendChild(p2);
    box.appendChild(modalActions([{
      label: '知道了，我自己动手',
      primary: true,
      onClick: function () {
        st.phase = 3;
        st.touched = false;
        render();
        aiHint('第 3 步 / 共 4 步 · 自主探究',
               '<p>' + esc(c.step3) + '</p>' +
               '<p class="v7-tip">调完参数，点引导栏里的「得出结论」。</p>',
               '第 3 步：自己调一调参数，看看读数怎么变；想好了点「得出结论」。');
        goSub('lineSim');
      }
    }]));
    openModal(box);
  }

  /* ---- 第 4 步：收尾结论单选题（正常弹窗） ---- */
  function toStep4() {
    var c = conf();
    if (!c) return;
    st.phase = 4;
    render();
    var item = c.q4;
    var box = el('div');
    box.appendChild(el('p', 'v6ovl-eyebrow', '第 4 步 收尾结论（题库随机抽取）'));
    box.appendChild(el('p', 'v6ovl-q', item.title));
    var fb = el('div', 'v6ovl-fb');
    fb.hidden = true;
    box.appendChild(fb);
    var acts = el('div', 'v6ovl-actions');
    var done = el('button', 'v6ovl-primary', '完成引导');
    done.type = 'button';
    done.hidden = true;
    acts.appendChild(done);
    box.appendChild(acts);
    openModal(box);

    paintOptions(box, item, function () {
      fb.hidden = false;
      fb.className = 'v6ovl-fb tip';
      fb.textContent = '正确答案：' + String.fromCharCode(65 + item.correct) + '　' + item.explain;
      done.hidden = false;
    });
    done.addEventListener('click', function () {
      if (done.disabled) return;
      done.disabled = true;
      finishGuide(false);
    });
  }

  function finishGuide(skipped) {
    st.phase = DONE;
    st.skipped = !!skipped;
    closeModal();
    render();
    if (skipped) { bubbleQueue = []; hideBubble(); return; }
    aiHint('入门引导' + (skipped ? '已跳过' : '完成'),
           '<p>' + (skipped
             ? '没关系，随时可以点引导栏里的「再引导一遍」。'
             : '你已经亲手走了一遍完整的入门流程，接下来可以挑战进阶任务了。') + '</p>' +
           '<p class="v7-tip">点引导栏里的「进阶任务」，在任务大厅里挑一个任务继续。</p>',
           skipped ? '引导已跳过，随时可以点「再引导一遍」。'
                   : '入门引导完成！接下来点「进阶任务」继续深入。');
    log('finishGuide skipped=' + !!skipped);
  }

  /* ---- 引导栏按钮 ---- */
  btnEntry.addEventListener('click', startGuide);
  btnSkip.addEventListener('click', function () { finishGuide(true); });
  btnAdv.addEventListener('click', openHall);
  btnNext.addEventListener('click', function () {
    if (st.phase === 1) { st.phase = 2; st.q = 0; render(); askQ2(); }
    else if (st.phase === 2) askQ2();
    else if (st.phase === 4) toStep4();
  });
  btnConclude.addEventListener('click', function () {
    if (st.phase === 3) {
      if (!st.touched) {
        aiHint('还没动手哦',
               '<p>要不要先调一调参数，看看读数怎么变？没调过也可以继续，点一次「得出结论」就好。</p>',
               '还没动手哦——要不要先调一调参数？没调过也可以直接继续。');
        st.touched = true;   /* 只提醒一次，不拦着 */
        return;
      }
      toStep4();
      return;
    }
    if (st.phase === 4) toStep4();
    else if (st.phase === 1 || st.phase === 2) {
      aiHint('还要再走两步', '<p>先把前面几步走完，马上就到自主探究了。</p>', '先把前面几步走完就到自主探究了。');
    }
  });

  /* 「有没有自己动过手」：全局监听滑块/数值框，只做标记 */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && /^(range|number)$/.test(t.type || '')) st.touched = true;
  }, true);

  /* =================== 八、进阶任务：弹窗 + 任务大厅 =================== */
  function openV5Task(id) {
    var V = window.V5Inquiry;
    if (V && typeof V.tool === 'function') {
      var r = '';
      try { r = V.tool('open', { task: id }); } catch (e) { r = '打开失败：' + (e && e.message || e); }
      aiHint('进阶任务 · ' + id, '<p>' + esc(String(r || '已打开任务。')) + '</p>',
             '已打开 ' + id + '，去探究工作台继续吧。');
      return;
    }
    /* 兜底：V5 模块不可用时，只把页面切到进阶任务页 */
    try {
      var s = appState();
      if (typeof Navigation !== 'undefined') {
        if (!s || s.currentPage !== 'experiment') Navigation.goToExperiment(nowExp() || 'newton');
        setTimeout(function () { try { Navigation.switchSubPage('inquiry'); } catch (e2) {} }, 900);
      }
    } catch (e) {}
    aiHint('进阶任务 · ' + id,
           '<p>没能自动打开 ' + esc(id) + '，已经帮你切到进阶任务页，请在任务大厅里点它。</p>',
           '没能自动打开 ' + id + '，已经在进阶任务页了。');
  }

  function openHall() {
    var L = window.InquiryLab;
    if (!L || !L.TASKS) {
      aiHint('进阶任务', '<p>进阶任务模块还没加载好，过一会儿再点「进阶任务」。</p>', '任务模块还没加载好，稍后再试。');
      return;
    }
    var box = el('div');
    box.appendChild(el('h3', 'v7-hall-title', currentInquiryLabel() + ' · 进阶任务'));
    var tabs = el('div', 'v7-hall-tabs');
    var grid = el('div', 'v7-hall');
    box.appendChild(tabs);
    box.appendChild(grid);
    box.appendChild(modalActions([
      {
        label: '打开完整探究实验室',
        onClick: function () { var V = window.V5Inquiry; if (V && V.openHome) V.openHome(); }
      },
      { label: '关闭', primary: true, onClick: function () {} }
    ]));
    openModal(box, true);

    function paint(f) {
      Array.prototype.forEach.call(tabs.children, function (b) {
        b.classList.toggle('active', b.getAttribute('data-f') === f);
      });
      var list = L.TASKS.filter(function (t) { return t.family === currentInquiryFamily(); });
      grid.innerHTML = list.map(function (t) {
        var name = HALL_TITLES[t.id] || t.title;
        return '<article class="v7-hall-card">' +
                 '<span class="v7-hall-pill">' + esc(t.id) + ' · ' +
                   esc((L.CATS && L.CATS[t.family]) || t.family) + '</span>' +
                 '<b>' + esc(name) + '</b>' +
                 '<small>' + esc(t.question) + '</small>' +
                 (t.id==='N1'?'':'<small class="v7-hall-deliver">提交成果：'+esc(HALL_DELIVER[t.id] || '按任务要求提交记录与分析')+'</small>') +
                 '<button type="button" data-task="' + esc(t.id) + '">开始这项任务 →</button>' +
               '</article>';
      }).join('');
      Array.prototype.forEach.call(grid.querySelectorAll('[data-task]'), function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-task');
          closeModal();
          openV5Task(id);
        });
      });
    }
    HALL_FAMS.filter(function(pair){return pair[0]===currentInquiryFamily();}).forEach(function (pair) {
      var b = el('button', null, pair[1]);
      b.type = 'button';
      b.setAttribute('data-f', pair[0]);
      b.addEventListener('click', function () { paint(pair[0]); });
      tabs.appendChild(b);
    });
    paint(currentInquiryFamily());
  }

  /* ======================= 九、挂载、跟随与自愈 ======================= */
  function mountBar() {
    var mc = q('#experimentPage .main-content');
    if (!mc) return false;
    if (bar.parentNode !== mc) {
      var nav = q('#experimentPage .experiment-nav');
      if (nav && nav.nextSibling) mc.insertBefore(bar, nav.nextSibling);
      else mc.appendChild(bar);
      log('引导栏已挂载');
    }
    if (document.body && ovl.parentNode !== document.body) document.body.appendChild(ovl);
    return true;
  }
  function tick() {
    try {
      if (!mountBar()) return;
      render();
    } catch (e) { log('tick 失败: ' + (e && e.message || e)); }
    try { syncBubbles(); } catch (e) {}
  }

  /* 将进阶任务的当前步骤和诊断提示同步到助手消息与气泡。 */
  var lastNowHint = '', lastCoachHint = '';
  function syncBubbles() {
    try {
      var labPage=document.getElementById('inquiryPage');
      if(!labPage || !labPage.getClientRects().length)return;
      var p = q('#v5 .v-now p');
      var t = p ? String(p.textContent || '').trim() : '';
      if (!t) lastNowHint = '';
      else if (t !== lastNowHint) {
        lastNowHint = t;
        var oldCoach = q('#ai-messages [data-hint-key="inquiry-coach"]');
        if (oldCoach) oldCoach.remove();
        aiHint('当前步骤', '<p>' + esc(t) + '</p>', t, 'inquiry-step');
      }

      var c = document.getElementById('v5-coach');
      var ct = c ? String(c.textContent || '').trim() : '';
      if (!ct) lastCoachHint = '';
      else if (ct !== lastCoachHint) {
        lastCoachHint = ct;
        if (ct !== t && ct !== '点击上面的按钮，获取与当前步骤对应的帮助。') {
          aiHint('实验提示', '<p>' + esc(ct) + '</p>', ct, 'inquiry-coach');
        }
      }

      /* 标记「直接在进阶任务里」的实验室首页，好让标题按单独页面排布 */
      var sh = document.getElementById('v5');
      if (sh) sh.classList.toggle('v7-lab-home', !!sh.querySelector('.v-three'));
    } catch (e) {}
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    var run = function () { pending = false; tick(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 60);
  }
  function watchExperiment() {
    var exp = nowExp(), page = null;
    try { page = appState() && appState().currentPage; } catch (e) {}
    if (page !== 'experiment' || !exp || !EXPS[exp]) return;
    if (st.exp !== exp) schedule();
  }
  function boot() {
    tick();
    try {
      var host = document.getElementById('experimentPage') || document.body;
      if (host && window.MutationObserver) {
        new MutationObserver(function () { schedule(); }).observe(host, { childList: true, subtree: true });
      }
    } catch (e) {}
    window.setInterval(function () { try { watchExperiment(); schedule(); } catch (e) {} }, 800);
    document.addEventListener('click', function (e) {
      try {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#backBtn')) { hideBubble(); closeModal(); window.setTimeout(schedule, 240); }
        else if (t.closest('.menu-item[data-page]') || t.closest('#compareToggleBtn')) window.setTimeout(schedule, 240);
      } catch (e2) {}
    }, true);
    window.addEventListener('resize', function () { applyBubblePos(); schedule(); }, { passive: true });
    window.addEventListener('pageshow', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.V7Guide = {
    version: '7.1.0',
    /* 从 AI 卡片进入某个实验时调用：直接把引导开到第 1 步（完整显示引导栏） */
    arm: function (exp) { if (EXPS[exp]) { startGuide(exp); } },
    start: startGuide,
    skip: function () { finishGuide(true); },
    step: function () { return st.phase; },
    openHall: openHall,
    openTask: openV5Task,
    hint: aiHint,
    refresh: schedule,
    config: EXPS
  };
})();

