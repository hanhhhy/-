

// 黏性现象仿真实验教学软件 - 完整网页版



// Three.js 3D场景变量（泊肃叶实验）
// THREE 由入口 v8.html 先加载本地 vendor/three.min.js。
let poiseuille3DScene = null;
let poiseuille3DCamera = null;
let poiseuille3DRenderer = null;
let poiseuille3DPipe = null;
let poiseuille3DParticles = [];
let poiseuille3DGrid = null;
let poiseuille3DControls = null;  // 轨道控制器，用于自由调整视角
let poiseuille3DInitialParticlePositions = [];  // 保存粒子的初始位置，用于重置

// 全局状态管理
const AppState = {
  currentPage: 'home',
  currentExperiment: null,
  currentSubPage: 'principle',
  sidebarCollapsed: false,
  isDarkTheme: false,
  simulationRunning: false,
  simulationPaused: false,
  simTime: 0,
  stokesBallY: 0,  // 初始位置在顶部（0米）
  stokesBallV: 0,
  stokesBallDistance: 0,  // 初始下落距离0米
  stokesBallStartTime: null,  // 小球开始下落时间
  stokesBallFd: 0,  // 阻力（用于实时显示）
  newtonGradientLineStartTime: null,  // 牛顿实验虚线开始时间
  chartInstance: null,
  animFrameId: null,
  dataHistory: [],  // 历史数据
  timeHistory: [],   // 时间轴数据
  // 事件监听器引用，用于清理
  eventListeners: {
    experimentCards: [],
    presetGrid: null
  },
  // 对比模式
  compareMode: false,
  // 测量模式：加入 ±1.5% 仪器读数误差（由实验任务清单里的开关控制）
  measurementMode: false,
  // 拖尾长度（仅黏度滑块变化时更新）
  trailLength: 2
};


// 对比模式状态

var compParams = { A:{}, B:{}, C:{} };
var _compDefaults = {
  newton: [
    {viscosity:0.001, velocity:0.1, spacing:0.01, area:0.1},
    {viscosity:0.001, velocity:0.1, spacing:0.01, area:0.1},
    {viscosity:0.001, velocity:0.1, spacing:0.01, area:0.1}
  ],
  poiseuille: [
    {radius:0.002, length:1.0, dp:102, viscosity:0.001, _rho:1000},
    {radius:0.002, length:1.0, dp:102, viscosity:0.001, _rho:1000},
    {radius:0.002, length:1.0, dp:102, viscosity:0.001, _rho:1000}
  ],
  stokes: [
    {radius:0.003, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    {radius:0.003, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    {radius:0.003, viscosity:1.0, rhop:2500, rhof:1000, g:9.8}
  ]
};
var compParticles = null;
var compCanvas = null;
var compCtx = null;
var compBuilt = false;
var compBuiltExp = null;   // 当前这套对比 UI 是为哪个实验建的
var _compBound = {};
var compOverlayChart = null;
var compOverlayFrame = 0;
var stokesCompBalls = null;
var stokesCompType = 'radius';
var _stokesCompPresets = {
  radius: {
    A: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    B: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    C: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8}
  },
  viscosity: {
    A: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    B: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8},
    C: {radius:0.004, viscosity:1.0, rhop:2500, rhof:1000, g:9.8}
  }
};
var _compAnimId = null;
var _compLastTime = 0;
var _compAnimRunning = false;
var _compPrevParams = { A:{}, B:{}, C:{} };
// 牛顿定律对比模式：标记黏度是否被调节过（只有调节η后才显示拖尾）
var _compViscAdjusted = { A: false, B: false, C: false };


// 流体预设数据

const FLUID_PRESETS = {
  '氢气 (20°C)': { mu: 0.0000088, rho: 0.0899 },
  '氦气 (0°C)': { mu: 0.0000186, rho: 0.1786 },
  '空气 (20°C)': { mu: 0.0000181, rho: 1.225 },
  '乙醚 (20°C)': { mu: 0.00023, rho: 713 },
  '苯 (20°C)': { mu: 0.00065, rho: 879 },
  '丙酮 (20°C)': { mu: 0.00032, rho: 784 },
  '甲醇 (20°C)': { mu: 0.00059, rho: 791 },
  '汽油 (20°C)': { mu: 0.0006, rho: 750 },
  '煤油 (20°C)': { mu: 0.00164, rho: 800 },
  '水 (20°C)': { mu: 0.001, rho: 1000 },
  '酒精 (20°C)': { mu: 0.0012, rho: 789 },
  '牛奶 (20°C)': { mu: 0.002, rho: 1030 },
  '血液 (37°C)': { mu: 0.0035, rho: 1060 },
  '玉米油 (20°C)': { mu: 0.065, rho: 925 },
  '橄榄油 (20°C)': { mu: 0.081, rho: 920 },
  '蓖麻油 (20°C)': { mu: 0.985, rho: 961 },
  '甘油 (20°C)': { mu: 1.412, rho: 1260 },
  '糖浆 (20°C)': { mu: 2.0, rho: 1330 }
};


// 实验配置数据

const EXPERIMENTS = {
  newton: {
    name: '牛顿黏性定律实验',
    icon: '',
    formula: 'F = -η × A × (du/dz)',
    description: '探索牛顿黏性定律，理解剪切应力与速度梯度的关系',
    variables: {
      'F': '黏性力 (N)',
      'τ': '剪切应力 (Pa)',
      'grad': '速度梯度 (s⁻¹)'
    },
    params: [
      { id: 'distance', name: '板间距', symbol: 'z', unit: 'mm', min: 1, max: 50, step: 1, value: 50 },
      { id: 'velocity', name: '上板速度', symbol: 'u', unit: 'm/s', min: 0.01, max: 1.0, step: 0.01, value: 0.1 },
      { id: 'area', name: '板面积', symbol: 'A', unit: 'm²', min: 0.01, max: 1.0, step: 0.01, value: 0.1 },
      { id: 'viscosity', name: '动力黏度', symbol: 'η', unit: 'Pa·s', min: 0.000001, max: 2.0, step: 'any', value: 0.001, useFluidPreset: true }
    ]
  },
  poiseuille: {
    name: '泊肃叶定律实验',
    icon: '',
    formula: 'Q = πR⁴ΔP / (8μL)',
    description: '研究管道中的层流流动，掌握流量与压降的关系',
    variables: {
      'Q': '体积流量 (m³/s)',
      'vmax': '最大速度 (m/s)',
      'Rf': '流阻 (Pa·s/m³)',
      'Re': '雷诺数',
      'v_avg': '平均速度 (m/s)'
    },
    params: [
      { id: 'radius', name: '管道半径', symbol: 'R', unit: 'm', min: 0.0005, max: 0.005, step: 0.0001, value: 0.002 },
      { id: 'length', name: '管道长度', symbol: 'L', unit: 'm', min: 0.1, max: 2.0, step: 0.05, value: 1.0 },
      { id: 'pressure', name: '压强差', symbol: 'ΔP', unit: 'Pa', min: 102, max: 105, step: 0.01, value: 102 },
      { id: 'viscosity', name: '动力黏度', symbol: 'μ', unit: 'Pa·s', min: 0.000001, max: 2.0, step: 'any', value: 0.001, useFluidPreset: true },
      { id: 'density', name: '流体密度', symbol: 'ρ', unit: 'kg/m³', min: 0.05, max: 1500, step: 'any', value: 1000, useFluidPreset: true }
    ]
  },
  stokes: {
    name: '斯托克斯定律实验',
    icon: '⚪',
    formula: 'F = 6πμrv',
    description: '观察球体在黏性流体中的沉降，学习阻力计算公式',
    variables: {
      'Fg': '重力 (N)',
      'Fb': '浮力 (N)',
      'vt': '终端速度 (m/s)',
      's': '沉降系数',
      'Re': '雷诺数'
    },
    params: [
      { id: 'ballRadius', name: '小球半径', symbol: 'r', unit: 'm', min: 0.0001, max: 0.01, step: 0.0001, value: 0.001 },
      { id: 'ballDensity', name: '小球密度', symbol: 'ρs', unit: 'kg/m³', min: 500, max: 20000, step: 10, value: 2500 },
      { id: 'fluidDensity', name: '流体密度', symbol: 'ρf', unit: 'kg/m³', min: 0.05, max: 1500, step: 'any', value: 1000, useFluidPreset: true },
      { id: 'viscosity', name: '动力黏度', symbol: 'μ', unit: 'Pa·s', min: 0.000001, max: 2.0, step: 'any', value: 0.001, useFluidPreset: true }
    ]
  }
};


// 物理计算引擎

const PhysicsEngine = {
  // 牛顿黏性定律
  newtonViscosity(v, mu, z, A = 0.1) {
    // 参数验证和默认值
    if (!z || z === 0 || isNaN(z) || !isFinite(z)) z = 0.01;
    if (!mu || mu === 0 || isNaN(mu) || !isFinite(mu)) mu = 0.00001;
    if (!v || isNaN(v) || !isFinite(v)) v = 0;
    if (!A || A === 0 || isNaN(A) || !isFinite(A)) A = 0.1;
    
    // 将板间距从 mm 转换为 m
    const z_m = z / 1000;
    
    const grad = v / z_m;  // 速度梯度 (s⁻¹)
    const tau = mu * grad;  // 剪切应力 (Pa)
    const F = tau * A;  // 黏性力 (N)
    
    // 防止NaN和Infinity
    return { 
      grad: isFinite(grad) ? grad : 0, 
      tau: isFinite(tau) ? tau : 0,
      F: isFinite(F) ? F : 0
    };
  },

  // 泊肃叶定律
  poiseuille(R, L, dP, mu, rho) {
    // 参数验证和默认值
    if (!mu || mu === 0 || isNaN(mu) || !isFinite(mu)) mu = 0.00001; // 防止除以零
    if (!L || L === 0 || isNaN(L) || !isFinite(L)) L = 0.1;
    if (!R || R === 0 || isNaN(R) || !isFinite(R)) R = 0.001;
    if (!rho || rho === 0 || isNaN(rho) || !isFinite(rho)) rho = 1000;
    if (!Number.isFinite(dP)) dP = 100;
    
    const R4 = Math.pow(R, 4);
    const Q = (Math.PI * R4 * dP) / (8 * mu * L);
    const vmax = (dP * R * R) / (4 * mu * L);
    const Rf = (8 * mu * L) / (Math.PI * R4);
    const v_avg = Q / (Math.PI * R * R);
    const Re = (rho * v_avg * 2 * R) / mu;
    
    // 防止NaN和Infinity
    return {
      Q: isFinite(Q) ? Q : 0,
      vmax: isFinite(vmax) ? vmax : 0,
      Rf: isFinite(Rf) ? Rf : 0,
      Re: isFinite(Re) ? Re : 0,
      v_avg: isFinite(v_avg) ? v_avg : 0
    };
  },

  // Re is based on sphere diameter. Smooth transitions are an educational
  // interpolation of empirical laws, not a wall/Basset/added-mass model.
  dragFactor(Re) {
    Re = Math.max(0, Re);
    const mix = (a, b, lo, hi) => {
      const q = Math.max(0, Math.min(1, (Re - lo) / (hi - lo)));
      const w = q * q * (3 - 2 * q);
      return a + (b - a) * w;
    };
    const os = 1 + 3 * Re / 16;
    const sn = 1 + 0.15 * Math.pow(Re, 0.687);
    if (Re < 0.2) return mix(1, os, 0.05, 0.2);
    if (Re < 2) return mix(os, sn, 0.5, 2);
    if (Re < 1200) return mix(sn, 0.44 * Re / 24, 800, 1200);
    return 0.44 * Re / 24;
  },
  stokesDrag(mu, r, v, rhof) {
    if (!Number.isFinite(v) || v === 0) return 0;
    const Re = Math.max(0, rhof || 0) * Math.abs(v) * 2 * r / mu;
    return 6 * Math.PI * mu * r * v * this.dragFactor(Re);
  },
  stokes(r, rhos, rhof, mu, g = 9.8) {
    if (![r, rhos, rhof, mu, g].every(Number.isFinite) || r <= 0 || mu <= 0 || rhos <= 0 || rhof < 0 || g < 0)
      throw new RangeError('球半径、密度、黏度或重力参数无效');
    const volume = 4 * Math.PI * r ** 3 / 3;
    const mass = rhos * volume, Fg = mass * g, Fb = rhof * volume * g;
    const net = Fg - Fb, force = Math.abs(net), k = 6 * Math.PI * mu * r;
    let lo = 0, hi = force / k;
    for (let i = 0; i < 64 && hi > 0; i++) {
      const mid = (lo + hi) / 2;
      if (this.stokesDrag(mu, r, mid, rhof) > force) hi = mid;
      else lo = mid;
    }
    const vt = Math.sign(net) * (lo + hi) / 2;
    const Re = rhof * Math.abs(vt) * 2 * r / mu;
    const dragFormula = Re < 0.1 ? 'stokes' : Re < 1 ? 'oseen' : Re < 800 ? 'schiller-naumann' : 'newton';
    return { Fg, Fb, vt, Re, dragFormula, volume, mass, s: g ? vt / g : 0, tau: mass / k,
      blended: (Re > .05 && Re < .2) || (Re > .5 && Re < 2) || (Re > 800 && Re < 1200) };
  },
  // Integrate the same signed drag law as terminal-speed solving. RK4 uses
  // drag-dependent substeps; exact linear relaxation handles stiff creeping flow.
  advanceSphere(v, dt, r, rhos, rhof, mu, g = 9.8) {
    const p = this.stokes(r, rhos, rhof, mu, g);
    if (!(dt > 0)) return {v, dx: 0};
    const net = p.Fg - p.Fb, vt = p.vt, k = 6 * Math.PI * mu * r;
    const maxRe = rhof * Math.max(Math.abs(v), Math.abs(vt)) * 2 * r / mu;
    if (maxRe <= .05) {
      const q = -Math.expm1(-dt / p.tau);
      return {v: v + (vt - v) * q, dx: vt * dt + (v - vt) * p.tau * q};
    }
    const a = u => (net - this.stokesDrag(mu, r, u, rhof)) / p.mass;
    // Conservative bound on local drag slope, including transition zones.
    const hMax = p.mass / (8 * k * Math.max(1, this.dragFactor(maxRe)));
    let left = dt, dx = 0;
    for (let i = 0; left > 0 && i < 4000; i++) {
      if (Math.abs(v - vt) <= Math.max(1e-14, Math.abs(vt) * 1e-10)) {
        dx += vt * left; v = vt; left = 0; break;
      }
      const h = Math.min(left, hMax);
      const a1 = a(v), v2 = v + a1 * h / 2, a2 = a(v2);
      const v3 = v + a2 * h / 2, a3 = a(v3), v4 = v + a3 * h, a4 = a(v4);
      dx += h * (v + 2 * v2 + 2 * v3 + v4) / 6;
      v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
      left = Math.max(0, left - h);
    }
    if (left > 0) throw new Error('运动积分未收敛，请缩小时间步长');
    return {v, dx};
  }

};


// 工具函数


// 安全获取元素
function safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with id '${id}' not found`);
  }
  return element;
}

// 安全设置元素样式
function safeSetStyle(element, styles) {
  if (element && styles) {
    Object.assign(element.style, styles);
  }
}

// 主题颜色工具函数
const ThemeColors = {
  getColors() {
    const isDark = AppState.isDarkTheme;
    return {
      titleColor: isDark ? '#00D4FF' : '#1a3c7c',
      textColor: isDark ? '#ffffff' : '#495057',
      bgColor: isDark ? '#1a1a25' : '#f8fbff',
      borderColor: isDark ? '#2a2a3a' : '#e1e8f0'
    };
  }
};


// 主题管理

const ThemeManager = {
  init() {
    const toggle = safeGetElement('themeToggle');
    if (!toggle) return;
    
    toggle.addEventListener('change', (e) => {
      AppState.isDarkTheme = e.target.checked;
      this.applyTheme();
      // 主题切换后重新渲染当前页面
      this.onThemeChanged();
      // 同步首页工具栏上的按钮文字
      this.syncHomeThemeButton();
    });

    // 首页工具栏的"浅色/深色"按钮：代理这个隐藏的 checkbox
    const homeThemeBtn = safeGetElement('homeThemeBtn');
    if (homeThemeBtn) {
      homeThemeBtn.addEventListener('click', () => toggle.click());
    }
    this.syncHomeThemeButton();
  },

  // 同步首页工具栏按钮上的文字与提示（深色/浅色）
  syncHomeThemeButton() {
    const label = document.getElementById('homeThemeLabel');
    if (label) label.textContent = AppState.isDarkTheme ? '深色' : '浅色';
    const btn = document.getElementById('homeThemeBtn');
    if (btn) {
      btn.title = AppState.isDarkTheme
        ? '切换浅色模式（快捷键 T）'
        : '切换深色模式（快捷键 T）';
    }
  },

  applyTheme() {
    if (AppState.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  },
  
  // 主题切换后的处理
  onThemeChanged() {
    // 如果当前在实验页面，重新渲染原理页面（任何子页面都重新渲染原理页，因为原理页可能在后台）
    if (AppState.currentPage === 'experiment') {
      renderPrinciplePage();
    }
    
    // 重新初始化图表（如果存在）- 销毁旧图表并创建新图表以完全应用新主题
    if (AppState.chartInstance) {
      // 销毁旧图表实例
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
      
      // 重新初始化图表
      setTimeout(() => {
        initRealtimeChart();
        // 如果有历史数据，更新图表
        if (AppState.dataHistory.length > 0) {
          updateRealtimeChart();
        }
      }, 50);
    }
    
    // 更新泊肃叶3D场景的背景颜色
    if (poiseuille3DScene) {
      const isDark = AppState.isDarkTheme || (window.c2WorkDark && window.c2WorkDark());
      const bgColor = isDark ? 0x1a1a25 : 0xf0f4f8;
      poiseuille3DScene.background = new THREE.Color(bgColor);
      if (poiseuille3DRenderer) {
        poiseuille3DRenderer.setClearColor(bgColor, 1);
        // 立即渲染一帧
        if (poiseuille3DCamera) {
          poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
        }
      }
    }

    // 更新3D模拟场景的主题
    if (window.ThreeDSimulation && window.ThreeDSimulation.updateTheme) {
      window.ThreeDSimulation.updateTheme(AppState.isDarkTheme || (window.c2WorkDark && window.c2WorkDark()));
    }
    
    // 重新绘制线图模拟Canvas（如果当前在线图模拟页面）
    if (AppState.currentPage === 'experiment' && AppState.currentSubPage === 'lineSim') {
      // 使用requestAnimationFrame确保在下一帧重绘
      requestAnimationFrame(() => {
        if (canvasCtx) {
          drawSimulationCanvas();
        }
      });
    }
  },
};


// 页面导航

const Navigation = {
  goToHome() {
    AppState.currentPage = 'home';
    document.getElementById('homePage').style.display = 'flex';
    document.getElementById('experimentPage').style.display = 'none';
    this.stopSimulation();
    cleanupCanvas();
    
    // 如果在对比模式，退出对比
    if (AppState.compareMode) {
      // 恢复侧边栏
      var sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.style.display = '';
      // 恢复正常布局
      var normalLayout = document.getElementById('normalLayout');
      if (normalLayout) normalLayout.style.display = '';

      pauseCompAnim();
      destroyCompareUI();
      AppState.compareMode = false;
      window.removeEventListener('resize', compResizeHandler);
    }
    
    // 注意：不清理实验卡片的事件监听器，它们需要保持可点击状态
    // 只清理实验内部的事件监听器（如流体预设按钮）
    cleanupExperimentInternalListeners();
  },

  goToExperiment(expType) {
    // 获取被点击的卡片
    const clickedCard = document.querySelector(`.experiment-card[data-experiment="${expType}"]`);
    const allCards = document.querySelectorAll('.experiment-card');
    const cardsContainer = document.querySelector('.experiment-cards');
      
    // 添加展开动画类
    if (clickedCard) {
      clickedCard.classList.add('expanding');
      cardsContainer.classList.add('has-expanding');
    }
      
    // 等待动画播放完毕后切换页面（缩短到200ms，卡片刚扩大到1.2倍时）
    setTimeout(() => {
      AppState.currentPage = 'experiment';
      AppState.currentExperiment = expType;

      // 开始记录本次实验的操作数据
      LabRecorder.reset(expType);
        
      // 清除图表历史数据
      AppState.dataHistory = [];
      AppState.timeHistory = [];
        
      // 重置斯托克斯小球状态（顶部位置，0米）
      AppState.stokesBallY = 0;
      AppState.stokesBallV = 0;
      AppState.stokesBallDistance = 0;
        
      // 清理之前的Canvas资源
      cleanupCanvas();
        
      // 切换页面显示
      document.getElementById('homePage').style.display = 'none';
      const experimentPage = document.getElementById('experimentPage');
      experimentPage.style.display = 'block';
        
      // 添加淡入动画
      experimentPage.classList.add('fade-in');
        
      const exp = EXPERIMENTS[expType];
      document.getElementById('experimentTitle').textContent = exp.name;
        
      Navigation.switchSubPage('principle');
            
      // 泊肃叶实验：先应用预设，再渲染页面（避免雷诺数警告误报）
      if (expType === 'poiseuille') {
        // 立即应用预设，不延迟
        // Preset is applied after controls exist.
      }
            
      renderPrinciplePage();
      renderLineSimPage();
      if (expType === 'poiseuille') applyFluidPreset('蓖麻油 (20°C)');
        
      // 动画结束后移除类，以便下次使用（缩短到500ms）
      setTimeout(() => {
        experimentPage.classList.remove('fade-in');
        // 重置所有卡片状态
        allCards.forEach(card => {
          card.classList.remove('expanding');
        });
        cardsContainer.classList.remove('has-expanding');
      }, 500);
    }, 200);  // 缩短等待时间，卡片刚扩大到1.2倍时切换
  },

  switchSubPage(pageName) {
    AppState.currentSubPage = pageName;
    
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      }
    });
    
    document.querySelectorAll('.sub-page').forEach(page => {
      page.classList.remove('active');
    });
    
    const pageMap = {
      'principle': 'principlePage',
      'lineSim': 'lineSimPage',
      '3dSim': '3dSimPage',
      'inquiry': 'inquiryPage'
    };
    
    document.getElementById(pageMap[pageName]).classList.add('active');
    
    // 如果切换到线图模拟页面，需要确保Canvas已初始化
    if (pageName === 'lineSim') {
      deferCanvasTask(() => {
        const canvas = document.getElementById('simCanvas');
        const exp = AppState.currentExperiment;
        
        // 泊肃叶实验使用3D WebGL，检查poiseuille3DRenderer
        if (exp === 'poiseuille') {
          if (canvas && !poiseuille3DRenderer) {
            initSimulationCanvas();
          } else if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
            // 已初始化，重新渲染一帧
            updatePoiseuille3D();
          }
        } else {
          // 其他实验使用2D Canvas
          if (canvas && !canvasCtx) {
            initSimulationCanvas();
          } else if (canvas && canvasCtx) {
            resizeCanvas();
            drawSimulationCanvas();
          }
        }
      }, 100);
    }

    // 如果切换到3D模拟页面，需要初始化Three.js 3D引擎
    if (pageName === '3dSim') {
      if (window.ThreeDSimulation) {
        var sceneMap3d = { newton: 'newton', poiseuille: 'poiseuille', stokes: 'stokes' };
        var targetScene3d = sceneMap3d[AppState.currentExperiment] || 'newton';
        // 双层 rAF：rAF 回调在绘制前执行，单层无法让页面过渡先绘制。
        // 第一层注册后，当前帧先完成首帧绘制（页面过渡立即显现，旧画面最多停留 1 帧 ~16ms）；
        // 第二层回调在下一帧绘制前执行 init——重活不再阻塞点击响应，且场景同步仍先于渲染循环。
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.ThreeDSimulation.init(targetScene3d);
            setTimeout(() => {
              if (window.ThreeDSimulation.resize) window.ThreeDSimulation.resize();
            }, 200);
          });
        });
      }
    }
  },

  toggleSidebar() {
    AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    
    sidebar.classList.toggle('collapsed');
    
    // 在CSS过渡动画期间持续更新3D场景尺寸，防止拉伸变形
    // 使用requestAnimationFrame循环监听，直到动画结束
    let animationId = null;
    const startTime = Date.now();
    const duration = 350;  // CSS过渡300ms + 50ms余量
    
    const updateDuringTransition = () => {
      const elapsed = Date.now() - startTime;

      if (resizeHandler) {
        resizeHandler();
      }

      // 每帧都强制渲染，防止黑屏
      if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
        poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
      }

      // 如果动画还未结束，继续下一帧
      if (elapsed < duration) {
        animationId = requestAnimationFrame(updateDuringTransition);
      }
    };
    
    // 开始监听
    animationId = requestAnimationFrame(updateDuringTransition);
    
    // 动画结束后再执行一次最终调整
    setTimeout(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (resizeHandler) {
        resizeHandler();
      }

      // 强制渲染一帧，确保画面不黑屏
      if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
        poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
      }
    }, duration);
  },

  stopSimulation() {
    AppState.simulationRunning = false;
    AppState.simulationPaused = false;
    if (AppState.animFrameId) {
      cancelAnimationFrame(AppState.animFrameId);
    }
  }
};


// 原理页面渲染

function renderPrinciplePage() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const container = safeGetElement('principlePage');
  if (!container) return;
  
  const colors = ThemeColors.getColors();
  
  // 根据实验类型生成不同的原理内容
  let principleContent = '';
  
  if (AppState.currentExperiment === 'newton') {
    // 牛顿粘性定律原理 — 来自专业文档
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}; font-size: 28px; border-bottom: 2px solid ${colors.borderColor}; padding-bottom: 12px; margin-bottom: 24px;">${exp.icon} ${exp.name} — 实验现象</h2>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.titleColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">一、实验简介</h3>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">本实验通过模拟流体在两平行平板间的流动现象，探究上板速度、两板间距、流体动力粘度及平板接触面积对流体速度分布、层间剪切效应的影响，验证牛顿粘性定律的核心规律，明确流体粘性作用的本质特征。</p>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">二、核心概念</h3>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li><strong>粘性</strong>：流体抵抗层间相对运动的内摩擦特性，是流体的固有属性之一；</li>
            <li><strong>速度梯度</strong>：流体层间速度的变化率（du/dz），反映层间速度差异的大小；</li>
            <li><strong>动力粘度（η）</strong>：衡量流体粘性强弱的物理量，数值越大，流体粘性越强，抵抗剪切的能力越强；</li>
            <li><strong>剪切效应</strong>：流体层间发生相对运动时，因粘性产生的相互拉扯、摩擦的作用效果。</li>
          </ol>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">三、实验装置</h3>
          <p style="color: ${colors.textColor}; line-height: 1.8; font-size: 15px; margin-bottom: 8px;">实验采用平行平板流动装置，核心组成包括：</p>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li>上下两块平行放置的刚性平板，可调节两板间距（z）及平板接触面积（A）；</li>
            <li>动力驱动装置，可调节上板运动速度（u），下板固定不动；</li>
            <li>待测试流体，填充于两平板之间，其动力粘度（η）可更换或调节；</li>
            <li>测量与记录装置，用于捕捉流体层位移轨迹，绘制位移-板间距曲线，分析速度梯度及剪切效应。</li>
          </ol>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.titleColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">四、基本实验原理</h3>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">牛顿粘性定律指出：流体层间的剪切应力（τ）与速度梯度（du/dz）成正比，比例系数为流体的动力粘度（η），表达式为：</p>
          <div class="formula-box">τ = η · (du/dz)</div>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">由于剪切应力定义为 τ = F/A（单位面积上的内摩擦力），将其代入牛顿粘性定律 τ = η · (du/dz)，可得<strong>内摩擦力公式</strong>：</p>
          <div class="formula-box">F = η · A · (du/dz)</div>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">该公式表明：流体层间的内摩擦力（F）与<strong>动力粘度（η）</strong>、<strong>接触面积（A）</strong>及<strong>速度梯度（du/dz）</strong>三者成正比。η 反映流体自身的粘稠特性，A 反映层间接触范围，du/dz 反映层间速度变化的剧烈程度——三者共同决定了流体抵抗剪切变形的内摩擦力大小。</p>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">实验中，下板固定，上板以恒定速度（u）运动，带动相邻流体层运动，因流体粘性，各层流体速度从下板的0逐渐过渡到上板的u，形成连续的速度分布。通过改变u、z、η、A四个参数，观察流体位移轨迹及速度梯度的变化，验证粘性定律的适用性，明确各参数对流体流动特性的影响规律。</p>
          <div style="margin-top:12px;padding:10px 14px;background:rgba(0,212,255,0.06);border-radius:6px;border:1px dashed rgba(0,212,255,0.2);font-size:13px;color:${colors.titleColor};text-align:center;">
             横轴：流体微团位移 <b>x</b>　｜　纵轴：板间距 <b>z</b>　｜　虚线：流体层位移轨迹　｜　实线：稳态速度梯度趋势线
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：上板速度 u 变化（z、η、A 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ u 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移轨迹整体右移，流体层位移速率增大；</li>
                <li>稳态速度梯度趋势线斜率增大，层间速度差增大；</li>
                <li>位移轨迹波动振幅增大，层间剪切效应增强。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ u 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移轨迹整体左移，流体层位移速率减小；</li>
                <li>稳态速度梯度趋势线斜率减小，层间速度差减小；</li>
                <li>位移轨迹波动振幅减小，层间剪切效应减弱。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：两板间距 z 变化（u、η、A 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ z 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移曲线簇沿纵轴拉伸，分布变稀疏；</li>
                <li>稳态速度梯度趋势线斜率减小，层间速度过渡更平缓；</li>
                <li>位移轨迹波动减弱，剪切效应减弱。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ z 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移曲线簇沿纵轴压缩，分布变密集；</li>
                <li>稳态速度梯度趋势线斜率增大，层间速度差增大；</li>
                <li>位移轨迹波动增强，剪切效应增强。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：流体动力粘度 η 变化（u、z、A 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ η 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移轨迹波动振幅显著减小，趋近平行直线；</li>
                <li>速度分布更接近理想线性关系；</li>
                <li>达到稳态位移分布的时间延长。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ η 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移轨迹波动振幅增大，偏离线性关系更明显；</li>
                <li>流体层响应上板运动更快，迅速达到稳态分布。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：平板接触面积 A 变化（u、z、η 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ A 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移曲线簇变宽，参与剪切的流体层数量增加；</li>
                <li>曲线簇整体波动效应增强，总粘性力作用更显著。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ A 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>位移曲线簇变窄，参与剪切的流体层数量减少；</li>
                <li>曲线簇整体波动效应减弱，总粘性力作用减弱。</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'poiseuille') {
    // 泊肃叶定律原理 — 来自专业文档
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}; font-size: 28px; border-bottom: 2px solid ${colors.borderColor}; padding-bottom: 12px; margin-bottom: 24px;">${exp.icon} ${exp.name} — 实验现象</h2>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.titleColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">一、实验简介</h3>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">本实验通过模拟粘性流体在圆管内的定常层流现象，探究圆管半径、流体动力粘度、管两端压强差及管长对流体流量、流速分布的影响，验证泊肃叶定律的核心规律，明确粘性流体在圆管内的流动特性。</p>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">二、核心概念</h3>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li><strong>定常层流</strong>：流体流动时，各流体质点的运动速度、方向不随时间变化，且流体层间无横向混合，呈分层流动状态；</li>
            <li><strong>圆管半径（r）</strong>：圆管横截面的半径，是影响流体流量的关键几何参数；</li>
            <li><strong>压强差（ΔP）</strong>：圆管两端的压力差值，是驱动流体流动的动力来源；</li>
            <li><strong>体积流量（Q）</strong>：单位时间内通过圆管横截面的流体体积，反映流体流动的快慢。</li>
          </ol>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">三、实验装置</h3>
          <p style="color: ${colors.textColor}; line-height: 1.8; font-size: 15px; margin-bottom: 8px;">实验采用圆管层流流动装置，核心组成包括：</p>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li>不同半径（r）、不同长度（L）的刚性圆管，可自主调节；</li>
            <li>流体存储与输送装置，可提供稳定的流体供应；</li>
            <li>压强调节装置，可调节圆管两端的压强差（ΔP），保持压强稳定；</li>
            <li>待测试粘性流体，其动力粘度（η）可更换或调节；</li>
            <li>测量与记录装置，用于测量流体体积流量（Q），绘制流量-管径/压强差关系曲线，分析流速分布规律。</li>
          </ol>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.titleColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">四、基本实验原理</h3>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">泊肃叶定律指出：粘性流体在圆管内做定常层流时，流体的体积流量（Q）与圆管两端的压强差（ΔP）、圆管半径（r）的四次方成正比，与圆管长度（L）、流体动力粘度（η）成反比，表达式为：</p>
          <div class="formula-box">Q = πΔP r⁴ / (8ηL)</div>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">实验中，保持流体层流状态，通过改变r、ΔP、η、L四个参数，观察流体体积流量的变化及管内流速分布特征，验证泊肃叶定律的适用性，明确各参数对圆管内流体流动特性的影响规律。</p>
          <div style="margin-top:12px;padding:10px 14px;background:rgba(0,212,255,0.06);border-radius:6px;border:1px dashed rgba(0,212,255,0.2);font-size:13px;color:${colors.titleColor};text-align:center;">
             横轴：流体体积流量 <b>Q</b>　｜　纵轴：圆管半径 <b>r</b>　｜　虚线：瞬时流量变化轨迹　｜　实线：稳态流量趋势线
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：圆管半径 r 变化（ΔP、η、L 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ r 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体右移，流体体积流量显著增大；</li>
                <li>流量随半径的变化更显著，体积流量增幅明显；</li>
                <li>流量轨迹波动振幅减小，流动更稳定，管内流速分布更均匀。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ r 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体左移，流体体积流量显著减小；</li>
                <li>流量随半径的变化更平缓，体积流量降幅减缓；</li>
                <li>流量轨迹波动振幅增大，流动稳定性下降，管内流速分布差异变大。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：管两端压强差 ΔP 变化（r、η、L 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ ΔP 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体右移，流体体积流量同步增大；</li>
                <li>流量与压强差呈线性正比关系，变化规律稳定；</li>
                <li>流量轨迹波动振幅增大，管内流体流动的动力增强，剪切效应略有增强。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ ΔP 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体左移，流体体积流量同步减小；</li>
                <li>流量与压强差的线性关系保持不变，变化规律稳定；</li>
                <li>流量轨迹波动振幅减小，管内流体流动更平缓，剪切效应减弱。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：流体动力粘度 η 变化（r、ΔP、L 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ η 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹波动振幅显著减小，趋近平稳直线；</li>
                <li>体积流量显著减小，流量与粘度呈反比关系；</li>
                <li>流体达到稳态流量的时间延长，管内流速分布更贴近理想层流状态。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ η 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹波动振幅增大，偏离平稳直线的程度更明显；</li>
                <li>体积流量增大，流体流动更顺畅，达到稳态流量的时间缩短；</li>
                <li>管内流速分布差异变大，层间剪切效应略有增强。</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;"> 现象观察：圆管长度 L 变化（r、ΔP、η 不变）</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(0,212,255,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(0,212,255,0.12);">
              <p style="color:#00d4ff;font-weight:700;margin-bottom:6px;">▲ L 增大</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体左移，流体体积流量减小；</li>
                <li>流量随管长的增加而缓慢降低，变化幅度平缓；</li>
                <li>流量轨迹波动减弱，管内流体流动阻力增大，流动更平稳。</li>
              </ol>
            </div>
            <div style="background:rgba(255,152,0,0.05);padding:12px 14px;border-radius:8px;border:1px solid rgba(255,152,0,0.12);">
              <p style="color:#ff9800;font-weight:700;margin-bottom:6px;">▼ L 减小</p>
              <ol style="color:${colors.textColor};font-size:14px;line-height:1.8;padding-left:18px;margin:0;">
                <li>流量轨迹整体右移，流体体积流量增大；</li>
                <li>流量随管长的变化更显著，体积流量增幅明显；</li>
                <li>流量轨迹波动增强，管内流体流动阻力减小，剪切效应略有增强。</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'stokes') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}; font-size: 28px; border-bottom: 2px solid ${colors.borderColor}; padding-bottom: 12px; margin-bottom: 24px;">${exp.icon} ${exp.name} — 实验现象</h2>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.titleColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">一、实验简介</h3>
          <p style="color: ${colors.textColor}; line-height: 1.9; font-size: 15px;">本实验通过模拟黏性流体中球形颗粒的沉降现象，探究颗粒粒径、流体动力黏度、颗粒密度及流体密度对颗粒沉降速度的影响，梳理不同流动状态下的沉降规律，明确球形颗粒在黏性流体中沉降的全区间特性。</p>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">二、核心概念</h3>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li><strong>终端速度（v<sub>t</sub>）</strong>：球形颗粒在黏性流体中匀速沉降时的速度，是衡量沉降快慢的核心物理量；</li>
            <li><strong>球形颗粒（r）</strong>：实验所用颗粒为规则球形，粒径均匀，可按需更换不同粒径的颗粒；</li>
            <li><strong>流体动力黏度（η）</strong>：衡量流体黏性强弱的物理量，数值越大，流体黏性越强；</li>
            <li><strong>颗粒密度（ρ<sub>p</sub>）</strong>：球形颗粒自身的密度，是影响沉降速度的重要因素；</li>
            <li><strong>流体密度（ρ）</strong>：流体自身的密度，与颗粒密度共同影响沉降动力；</li>
            <li><strong>雷诺数（Re）</strong>：无量纲数，表征流体流动的惯性力与黏性力比值，是划分沉降流动状态的核心判据，计算式为 Re = (ρ · v · d) / η（d 为颗粒直径，d = 2r）。</li>
          </ol>
        </div>

        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor}; border-left: 4px solid ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}; font-size: 18px;">三、实验装置</h3>
          <p style="color: ${colors.textColor}; line-height: 1.8; font-size: 15px; margin-bottom: 8px;">实验采用球形颗粒沉降装置，核心组成包括：</p>
          <ol style="color: ${colors.textColor}; line-height: 2.0; font-size: 15px; padding-left: 24px;">
            <li>透明沉降柱，用于盛装待测试黏性流体，便于观察颗粒沉降轨迹；</li>
            <li>不同粒径（r）的均匀球形颗粒；</li>
            <li>黏度调节装置，可更换不同动力黏度（η）的黏性流体；</li>
            <li>密度调节装置，可调节流体密度（ρ）及颗粒密度（ρ<sub>p</sub>）；</li>
            <li>测量与记录装置，用于捕捉颗粒沉降轨迹、测量沉降速度，绘制不同流动区间的沉降速度–时间关系曲线。</li>
          </ol>
        </div>

        <div class="principle-section" style="background:${colors.bgColor};color:${colors.textColor};border-color:${colors.borderColor};line-height:1.9">
          <h3 style="color:${colors.titleColor}">四、分区间实验原理与现象</h3>
          <p>本页采用静止、均匀牛顿流体中的单球竖直运动模型。向下为正，半径为 r，直径 d=2r；雷诺数统一按直径和速度大小计算：Re=2ρr|v|/η。ρ 表示流体密度，ρ<sub>p</sub> 表示球密度。</p>
          <div class="formula-box">m dv/dt = (ρ<sub>p</sub>−ρ)Vg − D(v)，V=4πr³/3，m=ρ<sub>p</sub>V</div>
          <p>D(v) 与速度同号，实际阻力方向与速度相反。终端速度由 D(v<sub>t</sub>)=(ρ<sub>p</sub>−ρ)Vg 求得。密度差为正时沉降，为负时上浮；密度相等且初始静止时保持静止。线图和对比模式到达容器边界后停止；3D 场景循环播放下落示意。</p>
          <h4>低雷诺数：Stokes 与 Oseen</h4>
          <p>Stokes 定律要求 Re≪1，不能把所有层流状态都视为 Stokes 区。低雷诺数下 D(v)=6πηrv，终端速度 v<sub>t</sub>=2r²(ρ<sub>p</sub>−ρ)g/(9η)。由静止释放时 v(t)=v<sub>t</sub>(1−exp(−t/τ))，τ=2ρ<sub>p</sub>r²/(9η)。</p>
          <p>在其他条件固定且仍满足低雷诺数近似时：半径增大使终端速度大小按 r² 增长；黏度增大使终端速度大小下降，同时使 τ 变小、达到同一终端速度比例所需时间缩短。沉降变慢与松弛时间变短并不矛盾。</p>
          <p>以直径定义 Re 时，一阶 Oseen 修正为 D(v)=6πηrv(1+3Re/16)，它仍是低雷诺数近似。</p>
          <h4>惯性影响：Schiller–Naumann 与牛顿阻力近似</h4>
          <p>Schiller–Naumann（SN）经验模型采用 C<sub>D</sub>=(24/Re)(1+0.15Re<sup>0.687</sup>)，常用于 Re 约小于 1000 的球体阻力估算。更高 Re 的亚临界范围采用 C<sub>D</sub>≈0.44，D(v)=½ρC<sub>D</sub>πr²v|v|。此时不能继续把 Stokes 指数运动解当作精确轨迹，应积分上述运动方程。</p>
          <p>为避免数值跳变，本演示在 Re=0.05～0.2、0.5～2、800～1200 之间平滑混合相邻模型，其余区间使用相应单一公式。平滑区属于教学插值，不是新的物理定律，也不是这些近似公式严格适用边界的证明。</p>
          <h4>能说明什么，不能说明什么</h4>
          <p>本模型可比较参数对竖直速度、阻力和终端状态的影响；它不计算横向摆动、尾涡脱落、壁面效应、附加质量或 Basset 历史力。不能据此断言真实高 Re 沉降必定没有稳定平均速度。Re 达到约 2×10<sup>5</sup> 及以上时，球面粗糙度与阻力危机等效应可能使常数 C<sub>D</sub> 近似失效。</p>
          <p>界面给出的数据是模型模拟值，不能代替实测证据。3D 的尺寸和播放速度用于可视化；定量分析应使用记录的物理时间、位移和参数，并注明采用的模型及范围。</p>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = principleContent;
  /* V6：原理页也是整体重建，通知一次引导条刷新 */
  try { if (window.__v6Hook) window.__v6Hook(); } catch (e) {}

  // 保留原理页内容供接入层重排。
  window.__c2Legacy = principleContent;
}


// 线图模拟页面渲染

function renderLineSimPage() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const container = document.getElementById('lineSimPage');
  
  console.log('Rendering line sim page for:', AppState.currentExperiment);
  console.log('Container element:', container);
  
  if (!container) {
    console.error('lineSimPage container not found!');
    return;
  }
  
  container.innerHTML = `
    <div class="line-sim-layout" id="normalLayout">
      <!-- 左侧控制面板 -->
      <div class="control-panel">
        <h3>参数控制</h3>
        
        <div id="paramsContainer"></div>
        
        ${exp.params.some(p => p.useFluidPreset) ? `
          <div class="fluid-presets">
            <h4>流体预设</h4>
            <div class="preset-grid" id="presetGrid"></div>
          </div>
        ` : ''}
      </div>
      
      <!-- 中央动画画布 -->
      <div class="canvas-area">
        <canvas id="simCanvas"></canvas>
        <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:10;">
          <button class="ctrl-btn" id="btn-report" title="根据你的实际操作生成实验报告：记录参数调节、仿真过程与流体切换，并绘制对应的仿真记录曲线（按钮上的数字为已记录的数据点数）" style="background:#5b6abf;color:#fff;font-size:12px;padding:5px 16px;">导出实验报告</button>
        </div>
      </div>
      
      <!-- 右侧数据面板 -->
      <div class="data-panel">
        <h3>实时数据</h3>
        <div id="reynoldsWarning" style="display: none; margin-bottom: 10px;"></div>
        <div id="dataContainer"></div>
        
        <!-- 实时图表 -->
        <div class="chart-container">
          <canvas id="realtimeChart"></canvas>
        </div>
        <div id="taskGuideHost"></div>
        
        <div class="bottom-controls">
          <button class="ctrl-btn play-pause" id="playPauseBtn">开始</button>
          <button class="ctrl-btn reset" id="resetBtn">重置</button>
          <button class="mode-toggle-btn" id="compareToggleBtn" title="三组独立参数对比">开启对比模式</button>
        </div>
      </div>
    </div>

    <!-- 对比模式容器（默认隐藏） -->
    <div id="compare-container" style="display:none;flex-direction:column;gap:14px;"></div>
  `;
  
  console.log('HTML inserted, now setting up controls...');
  
  setupLineSimControls();
  renderTaskGuide();
  /* V6：页面刚被整体重建，通知引导条补挂「得出结论」按钮（钩子不存在时什么都不做） */
  try { if (window.__v6Hook) window.__v6Hook(); } catch (e) {}
  
  // 如果当前处于对比模式，恢复对比布局（隐藏正常布局，独占页面）
  if (AppState.compareMode) {
    document.getElementById("normalLayout").style.display = "none";
    document.getElementById("compare-container").style.display = "flex";
    document.getElementById("compare-container").classList.add("active");
    /* 切换实验后须按新实验初始化 compParams，再重建对比界面，避免缺失参数导致 NaN。 */
    initCompParamsForExp(AppState.currentExperiment);
    destroyCompareUI();
    buildCompareUI();
    setTimeout(function() {
      resizeCompCanvas();
      initCompParticles();
      renderCompCanvas();
      updateCompDataDisplay();
      if (AppState.currentExperiment === "stokes") { initCompOverlayChart(); updateCompOverlayChart(); }
      startCompAnim();
    }, 120);
    var tBtn = document.getElementById("compareToggleBtn");
    if (tBtn) { tBtn.textContent = " 关闭对比模式"; tBtn.classList.add("active"); }
  } else {
    // 使用ResizeObserver确保容器有尺寸后再初始化Canvas
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    if (window._canvasInitObserver) window._canvasInitObserver.disconnect();
    const observer = deferredResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // 容器有尺寸了，初始化Canvas
          initSimulationCanvas();
          observer.disconnect(); // 只触发一次
          if (window._canvasInitObserver === observer) window._canvasInitObserver = null;
          break;
        }
      }
    });
    window._canvasInitObserver = observer;
    observer.observe(canvasArea);
  } else {
    // 降级方案：使用延迟
    deferCanvasTask(() => {
      initSimulationCanvas();
    }, 50);
  }
  } // end else (normal mode init)
}


// 线图模拟控件设置

function setupLineSimControls() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const paramsContainer = document.getElementById('paramsContainer');
  
  // 渲染参数控件
  paramsContainer.innerHTML = exp.params.map(param => `
    <div class="param-group">
      <div class="param-label">
        <span class="param-symbol">${(window.__fmtSym||function(x){return x})(param.symbol)} - ${param.name}</span>
        <span class="param-value" id="${param.id}Value">${formatScientific(param.value)}</span>
      </div>
      <input type="range" 
             id="${param.id}" 
             min="${param.min}" 
             max="${param.max}" 
             step="${param.step}" 
             value="${param.value}">
      <div style="font-size: 11px; color: var(--text-hint); text-align: right;">${param.unit}</div>
    </div>
  `).join('');
  
  // 渲染流体预设
  if (exp.params.some(p => p.useFluidPreset)) {
    const presetGrid = document.getElementById('presetGrid');
    presetGrid.innerHTML = Object.keys(FLUID_PRESETS).map(name => `
      <button class="preset-btn" data-fluid="${name}">${name}</button>
    `).join('');
    
    // 流体预设点击事件
    const presetHandler = (e) => {
      if (e.target.classList.contains('preset-btn')) {
        const fluidName = e.target.dataset.fluid;
        applyFluidPreset(fluidName);
      }
    };
    presetGrid.addEventListener('click', presetHandler);
    
    // 存储事件监听器引用
    AppState.eventListeners.presetGrid = { element: presetGrid, handler: presetHandler };
  }
  
  // 参数滑块事件
  exp.params.forEach(param => {
    const slider = document.getElementById(param.id);
    const valueDisplay = document.getElementById(`${param.id}Value`);
    
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = formatScientific(value);
      updateDataDisplay();

      // 只有黏度滑块变化时更新拖尾长度
      if (param.id === 'viscosity') {
        var minV = 0.00005, maxV = 2.0;
        var normV = (value - minV) / (maxV - minV);
        AppState.trailLength = 2 + normV * 23;
      }

      // 记录本次操作（供实验报告绘制仿真记录曲线）
      LabRecorder.onParamChange(param.id, value);

      // 实时重绘画布，让所有参数变化都能立即反映到动画中
      // 包括仿真运行时（特别是板间距、粘度等参数的视觉效果）
      drawSimulationCanvas();

      // 泊肃叶实验：参数变化时同步更新3D场景（管道尺寸变化）
      if (AppState.currentExperiment === 'poiseuille' && poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
        updatePoiseuille3D();
      }

      // 仿真未运行时，更新实时图表以反映参数变化
      if (!AppState.simulationRunning || AppState.simulationPaused) {
        updateRealtimeChart();
      }
    });

    // 松手时补记最终值，保证末态被记录
    slider.addEventListener('change', (e) => {
      LabRecorder.onParamChange(param.id, parseFloat(e.target.value), true);
    });
  });

  // 初始化操作记录器（进入实验即开始记录）
  LabRecorder.reset(AppState.currentExperiment);
  LabRecorder.logEvent('进入实验', (EXPERIMENTS[AppState.currentExperiment] || {}).name || '', '');
  _updateReportBadge();
  
  // 模式切换
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChartData();
    });
  });
  
  // 控制按钮（开始/暂停切换）
  const playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.addEventListener('click', () => {
    if (AppState.simulationRunning && !AppState.simulationPaused) {
      // 当前正在运行，暂停
      pauseSimulation();
      playPauseBtn.innerHTML = '继续';
      playPauseBtn.className = 'ctrl-btn play-pause';
    } else {
      // 当前暂停或未开始，开始
      startSimulation();
      playPauseBtn.innerHTML = '暂停';
      playPauseBtn.className = 'ctrl-btn play-pause running';
    }
  });
  
  document.getElementById('resetBtn').addEventListener('click', resetSimulation);
  
  // 对比模式切换按钮
  const compareToggleBtn = document.getElementById('compareToggleBtn');
  if (compareToggleBtn) {
    compareToggleBtn.addEventListener('click', toggleCompareMode);
  }

  // 实验报告按钮
  const reportBtn = document.getElementById('btn-report');
  if (reportBtn) {
    reportBtn.addEventListener('click', generateReport);
  }
  
  // 更新数据
  updateDataDisplay();
  
  // 使用ResizeObserver确保图表容器有尺寸后再初始化
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    const chartObserver = deferredResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // 容器有尺寸了，初始化图表
          initRealtimeChart();
          chartObserver.disconnect(); // 只触发一次
        }
      }
    });
    chartObserver.observe(chartContainer);
  } else {
    // 降级方案：使用延迟
    setTimeout(() => {
      initRealtimeChart();
    }, 200);
  }
}


// 应用流体预设

function applyFluidPreset(fluidName) {
  const fluid = FLUID_PRESETS[fluidName];
  if (!fluid) return;
  
  const exp = EXPERIMENTS[AppState.currentExperiment];
  
  exp.params.forEach(param => {
    if (param.useFluidPreset) {
      if (param.id === 'viscosity' || param.id === 'mu') {
        const slider = document.getElementById('viscosity');
        const valueDisplay = document.getElementById('viscosityValue');
        if (slider) {
          slider.value = fluid.mu;
          valueDisplay.textContent = formatScientific(fluid.mu);
        }
      }
      if (param.id === 'density' || param.id === 'rho' || param.id === 'fluidDensity') {
        const sliderId = param.id === 'density' ? 'density' : 'fluidDensity';
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(`${sliderId}Value`);
        if (slider) {
          slider.value = fluid.rho;
          valueDisplay.textContent = formatScientific(fluid.rho);
        }
      }
    }
  });
  
  updateDataDisplay();
  if (canvasCtx) drawSimulationCanvas();
  if (AppState.currentExperiment === 'poiseuille' && poiseuille3DScene) updatePoiseuille3D(0);
  // Do not append a fake time sample while paused.
  if (AppState.chartInstance) AppState.chartInstance.update('none');

  // 记录本次流体切换（报告据此生成流体对比图）
  LabRecorder.onPreset(fluidName);
}

// 清理实验内部的事件监听器（不包括实验卡片）
function cleanupExperimentInternalListeners() {
  // 清理流体预设网格事件监听器
  if (AppState.eventListeners.presetGrid) {
    const { element, handler } = AppState.eventListeners.presetGrid;
    if (element && handler) {
      element.removeEventListener('click', handler);
    }
    AppState.eventListeners.presetGrid = null;
  }
}

// 清理所有事件监听器，防止内存泄漏（包括实验卡片）
function cleanupEventListeners() {
  // 清理实验卡片事件监听器
  AppState.eventListeners.experimentCards.forEach(({ element, handler }) => {
    if (element && handler) {
      element.removeEventListener('click', handler);
    }
  });
  AppState.eventListeners.experimentCards = [];
  
  // 清理流体预设网格事件监听器
  cleanupExperimentInternalListeners();
}


// 动画画布实现

let canvasCtx = null;
// animParticles 保留用于未来扩展，当前绘制函数使用内联粒子生成
let animParticles = [];
let resizeHandler = null; // 保存resize事件处理器引用
let canvasGeneration = 0;
const canvasTimers = new Set();

// 延迟任务只服务于创建它的画布，不能跨实验或页面继续执行。
function deferCanvasTask(callback, delay) {
  const canvas = document.getElementById('simCanvas');
  const experiment = AppState.currentExperiment;
  const generation = canvasGeneration;
  const timer = setTimeout(() => {
    canvasTimers.delete(timer);
    if (generation !== canvasGeneration || !canvas || !canvas.isConnected ||
        canvas !== document.getElementById('simCanvas') ||
        experiment !== AppState.currentExperiment || AppState.currentPage !== 'experiment' ||
        AppState.currentSubPage !== 'lineSim' || AppState.compareMode) return;
    callback();
  }, delay);
  canvasTimers.add(timer);
}

// 清理Canvas资源
function cleanupCanvas() {
  canvasGeneration++;
  canvasTimers.forEach(timer => clearTimeout(timer));
  canvasTimers.clear();
  if (window._canvasInitObserver) {
    window._canvasInitObserver.disconnect();
    window._canvasInitObserver = null;
  }
  if (window._canvasResizeObserver) {
    window._canvasResizeObserver.disconnect();
    window._canvasResizeObserver = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  canvasCtx = null;
  
  // 清理泊肃叶3D场景
  if (poiseuille3DScene) {
    cleanupPoiseuille3D();
  }
  
  animParticles = [];
}

// 根据速度因子获取粒子颜色（快=红色，慢=蓝色，中间=紫色）
function getParticleColor(velocityFactor) {
  // velocityFactor: 0 (边缘，慢) ~ 1 (中心，快)
  
  // 慢速：蓝色 (0x0066ff)
  // 中速：紫色 (0xaa44cc)
  // 快速：红色 (0xff0044)
  
  const r = Math.floor(velocityFactor * 255); // 0 ~ 255
  const g = Math.floor(68 - velocityFactor * 68); // 68 ~ 0
  const b = Math.floor(255 - velocityFactor * 211); // 255 ~ 44
  
  return (r << 16) | (g << 8) | b;
}

// 泊肃叶3D场景初始化
function initPoiseuille3D(canvas) {
  // 防止重复初始化导致WebGL上下文冲突
  if (poiseuille3DScene) {
    cleanupPoiseuille3D();
  }

  const container = canvas.parentElement;
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  // 检查容器尺寸是否有效
  if (width <= 0 || height <= 0) {
    console.warn('Container has no size, waiting for resize...', width, 'x', height);
    // 尺寸无效时，等待ResizeObserver触发后重试
    const retryObserver = deferredResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          retryObserver.disconnect();
          initPoiseuille3D(canvas);
        }
      }
    });
    retryObserver.observe(container);
    return;
  }
  
  console.log('Initializing Poiseuille 3D with size:', width, 'x', height);
  
  // 创建场景
  poiseuille3DScene = new THREE.Scene();
  // 根据主题设置背景颜色
  const isDark = document.body.classList.contains('dark-theme') || (window.c2WorkDark && window.c2WorkDark());
  const bgColor = isDark ? 0x1a1a25 : 0xf0f4f8;
  poiseuille3DScene.background = new THREE.Color(bgColor);
  
  // 创建相机（从侧面观察横向管道）
  poiseuille3DCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  // 相机位置：从Z轴方向观察，放大视角（拉近）
  poiseuille3DCamera.position.set(0, 0, 4.0);
  
  // 创建渲染器
  poiseuille3DRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  poiseuille3DRenderer.setSize(width, height);
  poiseuille3DRenderer.setPixelRatio(window.devicePixelRatio);
  poiseuille3DRenderer.setClearColor(bgColor, 1); // 设置清除颜色
  
  // 完全禁用控制器（锁定视角）
  // OrbitControls 在 r128 中是全局 THREE 对象的一部分
  if (THREE.OrbitControls) {
    poiseuille3DControls = new THREE.OrbitControls(poiseuille3DCamera, poiseuille3DRenderer.domElement);
    // 完全禁用所有交互
    poiseuille3DControls.enableDamping = false;
    poiseuille3DControls.enableZoom = false;
    poiseuille3DControls.enablePan = false;
    poiseuille3DControls.enableRotate = false;
    // 设置观察点：看向管道中心
    poiseuille3DControls.target.set(0, 0, 0);
    poiseuille3DCamera.lookAt(poiseuille3DControls.target);
    poiseuille3DControls.update();
    console.log(' 视角已完全锁定 - 相机位置:', poiseuille3DCamera.position);
  } else {
    console.warn(' OrbitControls not available');
  }
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  poiseuille3DScene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(5, 5, 5);
  poiseuille3DScene.add(directionalLight);
  
  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(-5, -5, -5);
  poiseuille3DScene.add(backLight);
  
  // 添加额外的顶部光源
  const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
  topLight.position.set(0, 10, 0);
  poiseuille3DScene.add(topLight);
  
  // 创建玻璃管道
  createGlassPipe();
  
  // 创建流体粒子
  createFluidParticles();
  
  // 创建网格地面
  createGridFloor();
  
  // 添加resize监听器
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  resizeHandler = () => {
    if (!container || !poiseuille3DRenderer || !poiseuille3DCamera) return;

    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight;

    // 只有当尺寸有效时才更新相机和渲染器尺寸
    if (newWidth > 10 && newHeight > 10) {
      poiseuille3DCamera.aspect = newWidth / newHeight;
      poiseuille3DCamera.updateProjectionMatrix();
      poiseuille3DRenderer.setSize(newWidth, newHeight);
    }

    // 始终尝试渲染一帧，防止黑屏（即使尺寸无效也渲染）
    if (poiseuille3DScene) {
      poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
    }
  };
  window.addEventListener('resize', resizeHandler);
  
  // 立即更新并渲染一次，确保初始视角和粒子位置正确显示
  if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
    // 预加载第一帧：让粒子先流动一次，然后保存状态并重置
    // 临时设置为运行状态
    const wasRunning = AppState.simulationRunning;
    AppState.simulationRunning = true;
    AppState.simulationPaused = false;
    
    // 执行一次粒子更新（移动一帧）
    updatePoiseuille3D();
    
    // 保存移动后的粒子位置作为初始状态
    poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      radius: p.userData.radius,
      angle: p.userData.angle
    }));
    
    // 重置粒子到这个状态
    resetPoiseuilleParticles();
    
    // 恢复原来的运行状态
    AppState.simulationRunning = wasRunning;
    AppState.simulationPaused = false;
    
    console.log('Poiseuille 3D initial render complete with camera at:', poiseuille3DCamera.position);
  }
  
  console.log('Poiseuille 3D scene initialized');
}

// 创建玻璃管道（水平横向，沿X轴方向）
function createGlassPipe() {
  const pipeLength = 4;  // 管道长度（横向，沿X轴）
  const pipeRadius = 0.5;
  const wallThickness = 0.08;  // 管壁厚度
  
  // 创建管道几何体（横向圆柱，沿X轴）
  const pipeGeometry = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeLength, 64, 1, true);
  // 旋转90度，让管道沿X轴方向（横向）
  pipeGeometry.rotateZ(Math.PI / 2);
  
  // 高质量玻璃材质（几乎无反光）
  const pipeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.7,  // 提高管壁可见度
    roughness: 0.9,  // 高粗糙度抑制反光
    metalness: 0.0,  // 无金属度
    transmission: 0.4,  // 降低透光率以显示管壁
    thickness: 0.8,     // 玻璃材质厚度
    ior: 1.5,           // 折射率
    envMapIntensity: 0.0,  // 关闭环境光反射
    clearcoat: 0.0,  // 关闭清漆层
    clearcoatRoughness: 1.0,  // 清漆粗糙度
    side: THREE.DoubleSide
  });
  
  poiseuille3DPipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
  poiseuille3DScene.add(poiseuille3DPipe);
}

// 创建流体粒子（符合泊肃叶定律：中间快，边缘慢，横向流动）
function createFluidParticles() {
  const particleCount = 500; // 增加粒子数量以更好显示层流效果
  const pipeLength = 4;  // 管道长度（横向，沿X轴）
  const pipeRadius = 0.47; // 略小于管道内径（0.5 - 0.03 = 0.47）
  
  // 层流效果：创建多个同心圆层
  const layers = 8; // 8个同心圆层
  const particlesPerLayer = Math.floor(particleCount / layers);
  
  poiseuille3DParticles = [];
  
  for (let layer = 0; layer < layers; layer++) {
    // 计算当前层的半径（从中心到管壁均匀分布，留出适当余量）
    // 使用0.90因子，确保粒子在管道内部但蓝色层仍然可见
    const layerRadius = (layer / (layers - 1)) * pipeRadius * 0.90;
    
    // 根据泊肃叶定律计算该层的速度因子：v(r) = v_max * (1 - (r/R)^2)
    const rRatio = layerRadius / pipeRadius;
    const velocityFactor = 1 - rRatio * rRatio; // 抛物线分布
    
    // 为该层创建粒子
    for (let i = 0; i < particlesPerLayer; i++) {
      // 在层内均匀分布角度
      const angle = (i / particlesPerLayer) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      
      // X方向随机分布（横向）
      const x = (Math.random() - 0.5) * pipeLength;
      
      // 计算Y和Z坐标（在圆上）
      let y = layerRadius * Math.cos(angle);
      let z = layerRadius * Math.sin(angle);
      
      // 安全检查：确保粒子在管道内部
      const checkRadius = Math.sqrt(y * y + z * z);
      if (checkRadius > pipeRadius - 0.05) {
        const scale = (pipeRadius - 0.06) / checkRadius;
        y = y * scale;
        z = z * scale;
      }
      
      // 根据速度因子计算颜色（快=红色，慢=蓝色）
      const color = getParticleColor(velocityFactor);
      
      // 中心层粒子稍大，边缘层粒子稍小
      const particleSize = 0.02 + velocityFactor * 0.015;
      
      const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
      const particleMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        emissive: color,
        emissiveIntensity: 0.15 + velocityFactor * 0.25 // 速度越快自发光越强
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(x, y, z);
      
      // 存储层信息
      particle.userData = {
        layer: layer,
        radius: layerRadius,
        angle: angle,
        velocityFactor: velocityFactor
      };
      
      poiseuille3DScene.add(particle);
      poiseuille3DParticles.push(particle);
    }
  }
  
  // 保存粒子的初始位置，用于后续重置
  poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
    x: p.position.x,
    y: p.position.y,
    z: p.position.z,
    radius: p.userData.radius,
    angle: p.userData.angle
  }));
}

// 重置泊肃叶粒子位置（不清理整个场景）
function resetPoiseuilleParticles() {
  if (!poiseuille3DScene || poiseuille3DParticles.length === 0) return;
  
  // 使用保存的初始位置重置粒子
  poiseuille3DParticles.forEach((particle, index) => {
    if (index < poiseuille3DInitialParticlePositions.length) {
      const initialPos = poiseuille3DInitialParticlePositions[index];
      particle.position.x = initialPos.x;
      particle.position.y = initialPos.y;
      particle.position.z = initialPos.z;
      particle.userData.radius = initialPos.radius;
      particle.userData.angle = initialPos.angle;
    }
  });
  
  // 立即渲染一次
  if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
    poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
  }
}

// 创建网格地面（已禁用）
function createGridFloor() {
  // 不创建网格，保持干净背景
  
  
  
  
  
  
}

// 清理泊肃叶3D场景
function cleanupPoiseuille3D() {
  // 清理控制器
  if (poiseuille3DControls) {
    poiseuille3DControls.dispose();
    poiseuille3DControls = null;
  }
  
  // 清理粒子
  poiseuille3DParticles.forEach(particle => {
    poiseuille3DScene.remove(particle);
    particle.geometry.dispose();
    particle.material.dispose();
  });
  poiseuille3DParticles = [];
  poiseuille3DInitialParticlePositions = [];  // 清空初始位置
  
  // 清理管道
  if (poiseuille3DPipe) {
    poiseuille3DScene.remove(poiseuille3DPipe);
    poiseuille3DPipe.geometry.dispose();
    poiseuille3DPipe.material.dispose();
    poiseuille3DPipe = null;
  }
  
  // 清理网格
  if (poiseuille3DGrid) {
    poiseuille3DScene.remove(poiseuille3DGrid);
    poiseuille3DGrid = null;
  }
  
  // 清理渲染器
  if (poiseuille3DRenderer) {
    poiseuille3DRenderer.dispose();
    poiseuille3DRenderer = null;
  }
  
  // 清理场景和相机
  if (poiseuille3DScene) {
    // 移除所有光源
    while(poiseuille3DScene.children.length > 0){ 
      poiseuille3DScene.remove(poiseuille3DScene.children[0]); 
    }
    poiseuille3DScene = null;
  }
  poiseuille3DCamera = null;
  
  // 清理resize监听器
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  
  console.log('Poiseuille 3D scene cleaned up');
}

// 更新泊肃叶3D动画（根据参数动态调整）
function updatePoiseuille3D(dt = 0) {
  if (!poiseuille3DScene || !poiseuille3DRenderer || !poiseuille3DCamera) return;
  
  const pipeLength = 4;  // 3D显示的管道长度（横向，沿X轴）
  const pipeRadius = 0.47; // 3D管道内径
  
  // 获取当前参数值，用于管道的细微视觉变化
  const params = getParamValues();
  
  // 根据管道长度和半径参数，对管道进行细微的视觉缩放
  // 不是严格按比例，而是在原有基础上有变化感
  const baseLength = 2.0;  // 默认管道长度（m）
  const baseRadius = 0.02; // 默认管道半径（m）
  
  // 长度变化：基础缩放 ±20%（避免变化太大）
  const lengthRatio = params.length / baseLength;
  const lengthScale = 1 + (lengthRatio - 1) * 0.2;  // 只变化20%
  
  // 半径变化：基础缩放 ±15%（避免变化太大）
  const radiusRatio = params.radius / baseRadius;
  const radiusScale = 1 + (radiusRatio - 1) * 0.15;  // 只变化15%
  
  // 应用缩放到管道（只在管道存在时）
  if (poiseuille3DPipe) {
    poiseuille3DPipe.scale.set(lengthScale, radiusScale, radiusScale);
  }
  
  // 更新控制器（阻尼效果需要每帧更新）
  if (poiseuille3DControls) {
    poiseuille3DControls.update();
  }
  
  // 线图模拟中的泊肃叶视角固定。
  
  
  // 只在仿真运行时移动粒子
  if (AppState.simulationRunning && !AppState.simulationPaused) {
    // 获取当前参数值
    const params = getParamValues();
    
    // 根据泊肃叶定律计算物理速度
    const physicsCalc = PhysicsEngine.poiseuille(
      params.radius,     // 管道半径 (m)
      params.length,     // 管道长度 (m)
      params.pressure,   // 压强差 (Pa)
      params.viscosity,  // 动力黏度 (Pa·s)
      params.density     // 流体密度 (kg/m³)
    );
    
    // 将物理速度映射到3D动画速度
    // vmax (m/s) -> 3D速度（像素/帧）
    // 使用缩放因子让动画速度适中
    const speedScale = 5; // 动画速度缩放因子
    const maxSpeed3D = Math.min(physicsCalc.vmax * speedScale, 0.05); // 动画速度上限
    
    // 计算缩放后的实际管道尺寸
    const actualPipeLength = pipeLength * lengthScale;
    const actualPipeRadius = pipeRadius * radiusScale;
    
    // 更新每个粒子的速度（根据泊肃叶定律）
    poiseuille3DParticles.forEach(particle => {
      // 根据粒子所在层的半径计算速度因子：v(r) = vmax * (1 - (r/R)^2)
      // 注意：使用固定的pipeRadius而不是actualPipeRadius，因为粒子的radius是相对于原始管道的
      const rRatio = particle.userData.radius / pipeRadius;
      const velocityFactor = Math.max(0, 1 - rRatio * rRatio); // 确保不为负数
      const speed = maxSpeed3D * velocityFactor;
      
      // 粒子沿X轴从左到右流动（横向）
      particle.position.x += speed * dt * 60;
      
      // 当粒子流出管道右端时，重新生成在左端
      // 使用缩放后的实际长度
      if (particle.position.x > actualPipeLength / 2) {
        // 重置到管道左端
        particle.position.x = -actualPipeLength / 2;
        
        // 保持原有的径向位置和角度（层流效果：粒子保持在各自的层内）
        const r = particle.userData.radius;
        const angle = particle.userData.angle;
        particle.position.y = r * Math.cos(angle);
        particle.position.z = r * Math.sin(angle);
      }
      
      // 层流效果：禁用径向振荡，保持粒子在各自层内稳定流动
      // 径向位置保持稳定，避免粒子穿过管壁。
      
      
      
      // 安全检查：确保粒子在管道内部
      // 使用缩放后的实际半径
      const currentRadius = Math.sqrt(particle.position.y ** 2 + particle.position.z ** 2);
      if (currentRadius > actualPipeRadius - 0.02) {  // 留出0.02的余量
        // 将粒子拉回管道内部
        const scale = (actualPipeRadius - 0.03) / currentRadius;
        particle.position.y *= scale;
        particle.position.z *= scale;
      }
    });
  }
  
  // 渲染场景
  poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
}

function initSimulationCanvas() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  console.log('Initializing canvas...', canvas);
  
  // 如果是泊肃叶实验，初始化3D场景
  if (AppState.currentExperiment === 'poiseuille') {
    initPoiseuille3D(canvas);
    // 立即渲染一次，让开始前的画面与开始后一致
    deferCanvasTask(() => {
      if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
        updatePoiseuille3D();
        console.log('Poiseuille 3D scene initial render complete');
      }
    }, 150);
    
    // 泊肃叶实验也需要监听容器尺寸变化（菜单折叠/展开时重绘3D场景）
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    resizeHandler = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', resizeHandler);
    
    var canvasContainer = canvas.parentElement;
    if (canvasContainer && typeof ResizeObserver !== 'undefined') {
      if (window._canvasResizeObserver) window._canvasResizeObserver.disconnect();
      window._canvasResizeObserver = deferredResizeObserver(function() {
        resizeCanvas();
        if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
          updatePoiseuille3D();
        }
      });
      window._canvasResizeObserver.observe(canvasContainer);
    }
    
    return;
  }
  
  // 牛顿与斯托克斯线图模拟使用 2D Canvas。
  canvasCtx = canvas.getContext('2d');
  
  // 移除旧的resize监听器（如果存在）
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  
  // 创建新的resize处理器
  resizeHandler = () => {
    resizeCanvas();
  };
  window.addEventListener('resize', resizeHandler);
  
  // 使用ResizeObserver监听容器尺寸变化（收起/展开菜单栏时触发）
  var canvasContainer = canvas.parentElement;
  if (canvasContainer && typeof ResizeObserver !== 'undefined') {
    if (window._canvasResizeObserver) window._canvasResizeObserver.disconnect();
    window._canvasResizeObserver = deferredResizeObserver(function() {
      resizeCanvas();
      // 尺寸变化后立即重绘一帧（无论动画是否运行）
      if (canvasCtx) drawSimulationCanvas();
    });
    window._canvasResizeObserver.observe(canvasContainer);
  }
  
  // 延迟设置尺寸，确保DOM已渲染
  deferCanvasTask(() => {
    resizeCanvas();
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
  }, 100);
  
  // 初始化粒子
  initParticles();
  
  // 立即绘制一次
  deferCanvasTask(() => {
    drawSimulationCanvas();
    console.log('Canvas drawn');
  }, 150);
  
  // 注意：不在这里启动绘制循环，由runSimulation统一控制
}

function resizeCanvas() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas not found in resizeCanvas');
    return;
  }

  const container = canvas.parentElement;
  if (!container) {
    console.error('Canvas parent not found');
    return;
  }

  // 使用offsetWidth和offsetHeight，它们会返回实际渲染的尺寸
  const width = container.offsetWidth;
  const height = container.offsetHeight;

  // 确保尺寸有效
  if (width > 0 && height > 0) {
    // 泊肃叶实验使用Three.js WebGL（自带DPR处理），2D实验需要手动DPR缩放
    if (AppState.currentExperiment !== 'poiseuille') {
      var dpr = window.devicePixelRatio || 1;
      var targetW = Math.round(width * dpr);
      var targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas._cssW = width;
        canvas._cssH = height;
        canvasCtx = canvas.getContext('2d');
        canvasCtx.scale(dpr, dpr);
        console.log('Canvas resized to:', targetW, 'x', targetH, '(dpr=' + dpr + ', css=' + width + 'x' + height + ')');
      }
    } else {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas._cssW = width;
        canvas._cssH = height;
        console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
        if (poiseuille3DRenderer && poiseuille3DCamera) {
          poiseuille3DRenderer.setSize(width, height);
          poiseuille3DCamera.aspect = width / height;
          poiseuille3DCamera.updateProjectionMatrix();
          poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
        }
      }
    }
  } else {
    console.warn('Container has no size:', width, 'x', height);
    // 不重试，等待ResizeObserver触发
  }
}

function initParticles() {
  animParticles = [];
  const exp = AppState.currentExperiment;
  
  if (exp === 'newton') {
    const params = getParamValues();
    const area = params.area || 0.01;
    const count = Math.max(20, Math.min(80, Math.round(area / 0.001 * 0.8)));
    var c = document.getElementById('simCanvas');
    var cw = c ? (c._cssW || c.width) : 800;
    var ch = c ? (c._cssH || c.height) : 400;
    for (let i = 0; i < count; i++) {
      animParticles.push({
        x: Math.random() * cw,
        y: Math.random() * ch,
        speed: Math.random() * 2 + 1
      });
    }
  } else if (exp === 'poiseuille') {
    var pc = document.getElementById('simCanvas');
    var pcw = pc ? (pc._cssW || pc.width) : 600;
    for (let i = 0; i < 100; i++) {
      const rFrac = Math.random();
      const rSign = Math.random() > 0.5 ? 1 : -1;
      animParticles.push({
        x: Math.random() * pcw,
        rFrac: rFrac,
        rSign: rSign
      });
    }
  } else if (exp === 'stokes') {
    var sc = document.getElementById('simCanvas');
    var scw = sc ? (sc._cssW || sc.width) : 800;
    animParticles.push({
      x: scw / 2,
      y: 0,
      speed: 0
    });
  }
}

// drawCanvasLoop 已移除，统一由 runSimulation 控制绘制循环

function drawSimulationCanvas() {
  const exp = AppState.currentExperiment;
  
  if (!exp) {
    /* V6：首页未选实验属于正常状态，降级为 warn，避免把真报错淹没 */
    console.warn('No experiment selected（首页未选实验，跳过绘制）');
    return;
  }
  
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas element not found in drawSimulationCanvas');
    return;
  }
  
  // 使用CSS像素尺寸（与DPR无关），保证绘图坐标一致
  var w = canvas._cssW || canvas.width;
  var h = canvas._cssH || canvas.height;
  const isDark = document.body.classList.contains('dark-theme') || (window.c2WorkDark && window.c2WorkDark());
  
  // 泊肃叶实验：只使用3D WebGL渲染，不使用2D Canvas
  if (exp === 'poiseuille') {
    // 3D渲染在runSimulation中通过updatePoiseuille3D处理
    return;
  }
  
  // 其他实验使用2D Canvas
  if (!canvasCtx) {
    console.error('Canvas context is null');
    return;
  }

  canvasCtx.fillStyle = isDark ? '#0a0a0f' : '#ffffff';
  canvasCtx.fillRect(0, 0, w, h);
  
  if (exp === 'newton') {
    drawNewtonSimulation(w, h, isDark);
  } else if (exp === 'stokes') {
    drawStokesSimulation(w, h, isDark);
  }
}

function drawNewtonSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 牛顿画布配置；小屏按比例缩放。
  var scale = Math.min(1, w / 700, h / 500);
  const MARGIN_LEFT = Math.max(35, Math.round(80 * scale));
  const MARGIN_RIGHT = Math.max(45, Math.round(100 * scale));
  const MARGIN_TOP = Math.max(25, Math.round(60 * scale));
  const MARGIN_BOTTOM = Math.max(55, Math.round(120 * scale));
  const MAX_DISTANCE_MM = 50;  // mm（与滑块最大值对应）
  const GRID_LINES = 5;  // 竖直网格线数量，与x轴刻度对应（6条线：0~5）
  const NUM_LAYERS = 10; // 固定分层数，不受板面积影响
  
  // x轴显示范围：0~1米
  const MAX_X_DISTANCE = 1.0;  // x轴最大显示距离（米）
  
  const cw = w - MARGIN_LEFT - MARGIN_RIGHT;
  const ch = h - MARGIN_TOP - MARGIN_BOTTOM;
  const sx = MARGIN_LEFT;
  const sy = MARGIN_TOP;
  
  // 速度缩放因子（控制粒子移动速度，让x轴像素与物理距离对应）
  // x轴范围0~MAX_X_DISTANCE米，对应画布宽度cw像素
  // 粒子1秒移动的距离（像素）应该 = velocity（m/s）* (cw / MAX_X_DISTANCE)
  // 例如：velocity=0.5m/s, cw=600px, MAX_X_DISTANCE=1.0m → 移动300像素
  const VELOCITY_SCALE_FACTOR = cw / MAX_X_DISTANCE / 2;  // 除以2是因为t=simTime*2
  
  const velocity = params.velocity || 0.1;
  const viscosity = params.viscosity || 0.001;
  const area = params.area || 0.1;
  const distance = (params.distance || 10) / 1000;  // 将 mm 转换为 m
  // 根据板间距动态调整动画中的板距离（视觉效果）
  // distance范围：1-50mm，映射到动画中的高度：30%-90%的画布高度
  const minDistance = 1;  // mm
  const maxDistance = 50;  // mm
  const normalizedDistance = (params.distance - minDistance) / (maxDistance - minDistance);  // 0~1
  const minCanvasHeight = ch * 0.3;  // 最小高度：30%画布
  const maxCanvasHeight = ch * 0.9;  // 最大高度：90%画布
  const animatedHeight = minCanvasHeight + normalizedDistance * (maxCanvasHeight - minCanvasHeight);
  
  // 使用动态高度计算实际的sy和ch
  const dynamicCh = animatedHeight;
  const dynamicSy = sy + (ch - dynamicCh) / 2;  // 居中显示
  
  // 使用主物理引擎计算。
  const calc = PhysicsEngine.newtonViscosity(velocity, viscosity, params.distance || 10, area);
  const grad = calc.grad || 0;
  const tau = calc.tau || 0;
  const F = calc.F || 0;
  
  // 预计算颜色值，避免重复计算
  const gridColor = isDark ? 'rgba(42, 42, 58, 0.3)' : 'rgba(220, 225, 236, 0.7)';
  const axisColor = isDark ? '#2a2a3a' : '#666666';
  const tickColor = isDark ? '#93a1b5' : '#5a6472';
  const labelColor = isDark ? '#a0a0b0' : '#666666';
  const curveColor = isDark ? '#00D4FF' : '#1a3c7c';
  const arrowColor = isDark ? '#00FF88' : '#2ecc71';
  const tauColor = isDark ? '#FF4D4D' : '#e74c3c';
  const infoColor = '#00D4FF';
  
  // 粘度指示器（仅用于显示，不影响动画）
  const viscosityRatio = viscosity / 0.001;  // 相对于水的粘度比
  
  // 1. 绘制网格
  canvasCtx.strokeStyle = gridColor;
  canvasCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_LINES; i++) {
    const y = dynamicSy + (i / GRID_LINES) * dynamicCh;
    canvasCtx.beginPath();
    canvasCtx.moveTo(sx, y);
    canvasCtx.lineTo(sx + cw, y);
    canvasCtx.stroke();
    
    const x = sx + (i / GRID_LINES) * cw;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, dynamicSy);
    canvasCtx.lineTo(x, dynamicSy + dynamicCh);
    canvasCtx.stroke();
  }
  
  // 2. 坐标轴
  canvasCtx.strokeStyle = axisColor;
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(sx, dynamicSy);
  canvasCtx.lineTo(sx, dynamicSy + dynamicCh);
  canvasCtx.lineTo(sx + cw, dynamicSy + dynamicCh);
  canvasCtx.stroke();
  
  // 3. 刻度
  canvasCtx.fillStyle = tickColor;
  canvasCtx.font = '13px  "Times New Roman", Consolas, monospace';
  canvasCtx.textAlign = 'center';
  // X轴刻度：位移 0~1.0 m（粒子1秒内移动的距离）
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * MAX_X_DISTANCE;  // 0~1.0 m
    const x = sx + (i / 5) * cw;
    canvasCtx.fillText(val.toFixed(2), x, dynamicSy + dynamicCh + 32);
  }
  
  canvasCtx.textAlign = 'right';
  // Y轴刻度：板间距 0~50 mm
  for (let i = 0; i <= 5; i++) {
    const valMM = (i / 5) * MAX_DISTANCE_MM;  // mm单位
    const y = dynamicSy + dynamicCh - (i / 5) * dynamicCh;
    canvasCtx.fillText(valMM.toFixed(0), sx - 16, y + 5);
  }
  
  // 4. 轴标签
  canvasCtx.fillStyle = labelColor;
  canvasCtx.font = '15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('位移 x (m)', sx + cw / 2, dynamicSy + dynamicCh + 64);
  
  canvasCtx.save();
  canvasCtx.translate(sx - 58, dynamicSy + dynamicCh / 2);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.fillText('板间距 z (mm)', 0, 0);
  canvasCtx.restore();
  
  // 6. 上下平板（圆角矩形）
  const plateGrad1 = canvasCtx.createLinearGradient(sx, dynamicSy - 15, sx, dynamicSy - 5);
  if (isDark) {
    plateGrad1.addColorStop(0, '#808090');
    plateGrad1.addColorStop(1, '#505060');
  } else {
    plateGrad1.addColorStop(0, '#b0b0c0');
    plateGrad1.addColorStop(1, '#808090');
  }
  
  const plateGrad2 = canvasCtx.createLinearGradient(sx, dynamicSy + dynamicCh + 5, sx, dynamicSy + dynamicCh + 15);
  if (isDark) {
    plateGrad2.addColorStop(0, '#505060');
    plateGrad2.addColorStop(1, '#808090');
  } else {
    plateGrad2.addColorStop(0, '#808090');
    plateGrad2.addColorStop(1, '#b0b0c0');
  }
  
  canvasCtx.fillStyle = plateGrad1;
  canvasCtx.fillRect(sx - 15, dynamicSy - 15, cw + 30, 10);
  canvasCtx.fillStyle = plateGrad2;
  canvasCtx.fillRect(sx - 15, dynamicSy + dynamicCh + 5, cw + 30, 10);
  
  // 7. 上平板箭头
  canvasCtx.strokeStyle = arrowColor;
  canvasCtx.lineWidth = 2;
  const ax = sx + cw - 50;
  const ay = dynamicSy - 22;
  canvasCtx.beginPath();
  canvasCtx.moveTo(ax, ay);
  canvasCtx.lineTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay - 5);
  canvasCtx.moveTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay + 5);
  canvasCtx.stroke();
  
  // 11. 动态粒子和流线（添加粘度视觉效果）
  const t = AppState.simTime * 2;
  
  // 11.5. 上平板移动条纹（显示运动效果）- 需要在 t 定义之后
  // 条纹间距随板面积变化：板面积越大，间距越大
  const baseStripeSpacing = 15;  // 基础间距（增大以更明显）
  const areaScaleFactor = area / 0.1;  // 相对于默认值0.1m²的缩放因子
  const stripeSpacing = baseStripeSpacing * Math.sqrt(areaScaleFactor);  // 使用平方根避免变化过大
  const stripeWidth = stripeSpacing * 0.5;     // 条纹宽度为间距的一半
  const stripeSpeed = velocity * VELOCITY_SCALE_FACTOR;  // 条纹移动速度与上板速度成正比（放大5倍）
  const stripeOffset = (t * stripeSpeed) % stripeSpacing;  // 条纹偏移量
  
  canvasCtx.fillStyle = isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(26, 60, 124, 0.3)';
  for (let stripeX = sx - 15 + stripeOffset; stripeX < sx + cw + 15; stripeX += stripeSpacing) {
    canvasCtx.fillRect(stripeX, dynamicSy - 15, stripeWidth, 10);
  }
  
  // 计算粘度视觉因子（线性均匀分布）
  // 粘度范围：0.00005 ~ 2.0 Pa·s
  const minViscosity = 0.00005;
  const maxViscosity = 2.0;
  const normalizedViscosity = (viscosity - minViscosity) / (maxViscosity - minViscosity);  // 线性归一化到 0~1

  // 拖尾长度：从AppState读取（仅黏度滑块变化时更新）
  const trailLength = AppState.trailLength || 2;

  // 波浪幅度：线性均匀映射 4~0.5 像素
  const waveAmplitude = 4 - normalizedViscosity * 3.5;
  
  for (let i = 0; i < NUM_LAYERS; i++) {
    const layerYn = i / (NUM_LAYERS - 1);
    const layerV = layerYn * velocity;
    const yp = dynamicSy + dynamicCh - layerYn * dynamicCh;
    
    // 速度映射颜色：快=红色，慢=蓝色
    // 使用MAX_X_DISTANCE作为速度参考值（1.0m对应1.0m/s的速度）
    const ratio = Math.min(Math.abs(layerV) / MAX_X_DISTANCE, 1.0);
    // 红色通道：速度快时增强 (0 -> 255)
    const r = Math.floor(255 * ratio);
    // 绿色通道：中间速度时最高 (0 -> 50 -> 0)
    const g = Math.floor(50 * Math.sin(ratio * Math.PI));
    // 蓝色通道：速度慢时增强 (255 -> 0)
    const b = Math.floor(255 * (1 - ratio));
    const color = `rgb(${r}, ${g}, ${b})`;
    
    // 流线（波浪形虚线）- 添加粘度影响的波浪幅度
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2;
    canvasCtx.globalAlpha = 0.6;
    canvasCtx.beginPath();
    
    // 使用真实的层速度进行动画（符合牛顿黏性定律：速度线性分布）
    // 最上层速度 = velocity，乘以VELOCITY_SCALE_FACTOR使虚线夹角接近45°
    const animationSpeed = layerV * VELOCITY_SCALE_FACTOR;  // 放大5倍使虚线夹角接近45°
    for (let seg = 0; seg < cw; seg += 4) {
      // 波浪相位：减去时间项使波浪向右移动（与粒子速度完全一致）
      // 波浪移动速度 = 粒子移动速度 = t * animationSpeed
      const offset = (seg / 15 - t * animationSpeed / (cw / (2 * Math.PI))) % (2 * Math.PI);
      const wave = yp + Math.sin(offset) * waveAmplitude;  // 波浪幅度受粘度影响
      if (seg === 0) {
        canvasCtx.moveTo(sx + seg, wave);
      } else {
        canvasCtx.lineTo(sx + seg, wave);
      }
    }
    canvasCtx.stroke();
    canvasCtx.globalAlpha = 1.0;
    
    // 粒子（每层8个）- 添加拖尾效果，均匀分布
    canvasCtx.fillStyle = color;
    const particlesPerLayer = 8;  // 每层粒子数
    for (let pi = 0; pi < particlesPerLayer; pi++) {
      const px = sx + ((t * animationSpeed + pi * cw / particlesPerLayer) % cw);
      
      // 绘制拖尾（高粘度流体拖尾更长）
      const trailSegments = Math.floor(trailLength);
      for (let ti = 0; ti < trailSegments; ti++) {
        const trailOffset = ti * 3;  // 拖尾间隔
        const trailX = px - trailOffset;
        const trailAlpha = 1 - (ti / trailSegments);  // 渐隐效果
        const trailRadius = 4 * trailAlpha;  // 渐小效果
        
        canvasCtx.globalAlpha = trailAlpha * 0.6;
        canvasCtx.beginPath();
        canvasCtx.arc(trailX, yp, trailRadius, 0, Math.PI * 2);
        canvasCtx.fill();
      }
      
      // 绘制主粒子
      canvasCtx.globalAlpha = 1.0;
      canvasCtx.beginPath();
      canvasCtx.arc(px, yp, 4, 0, Math.PI * 2);
      canvasCtx.fill();
    }
    canvasCtx.globalAlpha = 1.0;
  }
  
  // 12. 速度梯度指示线（蓝色虚线，显示速度分布）
  // 上端：最上层（第0层）第一个小球（pi=0）
  const topLayerV = velocity * VELOCITY_SCALE_FACTOR;  // 最上层速度（像素/秒，放大5倍）
  const topParticleY = dynamicSy;  // 最上层y坐标
  
  // 下端：最下层（第NUM_LAYERS-1层）第一个小球（pi=0）
  const bottomLayerV = 0;  // 最下层速度 = 0
  const bottomParticleY = dynamicSy + dynamicCh;  // 最下层y坐标
  
  // 使用与粒子相同的时间变量 t = simTime * 2
  // 计算上端小球的x坐标（与粒子完全同步）
  let topParticleX;
  
  // 使用牛顿实验专用的计时器
  if (!AppState.newtonGradientLineStartTime) {
    AppState.newtonGradientLineStartTime = AppState.simTime;
  }
  
  // 计算虚线已经运动的时间（秒）
  const gradientLineTime = AppState.simTime - AppState.newtonGradientLineStartTime;
  
  // 判断是否已经运动了1秒
  const hasMovedForOneSecond = gradientLineTime >= 1.0;
  
  if (hasMovedForOneSecond) {
    // 运动1秒后，固定在1秒时的位置
    // 使用实际物理位移，不取模，避免回绕
    // 1秒时，粒子移动的物理距离 = velocity（m/s）* 1s = velocity 米
    // 对应的像素位置 = sx + (velocity / MAX_X_DISTANCE) * cw
    topParticleX = sx + (velocity / MAX_X_DISTANCE) * cw;
    // 限制在画布范围内
    topParticleX = Math.min(topParticleX, sx + cw);
  } else {
    // 运动1秒内，跟随小球移动（与粒子完全同步）
    // 使用实际物理位移，不取模
    // gradientLineTime秒时，移动距离 = velocity * gradientLineTime
    const physicalDistance = velocity * gradientLineTime;  // 物理距离（米）
    topParticleX = sx + (physicalDistance / MAX_X_DISTANCE) * cw;
    // 限制在画布范围内
    topParticleX = Math.min(topParticleX, sx + cw);
  }
  
  // 计算下端小球的x坐标（最下层速度为0，所以位置不变）
  const bottomParticleX = sx;  // 始终在sx位置
  
  // 绘制速度梯度线：运动时是虚线，停止后变成实线
  canvasCtx.strokeStyle = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.lineWidth = 2;
  
  // 根据是否停止来决定使用虚线还是实线
  if (hasMovedForOneSecond && AppState.simulationRunning && !AppState.simulationPaused) {
    // 停止后：使用实线
    canvasCtx.setLineDash([]);  // 实线
  } else {
    // 运动中：使用虚线
    canvasCtx.setLineDash([5, 5]);  // 虚线
  }
  
  canvasCtx.beginPath();
  canvasCtx.moveTo(topParticleX, topParticleY);
  canvasCtx.lineTo(bottomParticleX, bottomParticleY);
  canvasCtx.stroke();
  canvasCtx.setLineDash([]);  // 重置
  
  // 绘制两个端点的小圆
  canvasCtx.fillStyle = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.beginPath();
  canvasCtx.arc(topParticleX, topParticleY, 5, 0, Math.PI * 2);
  canvasCtx.fill();
  canvasCtx.beginPath();
  canvasCtx.arc(bottomParticleX, bottomParticleY, 5, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 如果已经停止，显示提示文字和速度梯度信息
  if (hasMovedForOneSecond && AppState.simulationRunning && !AppState.simulationPaused) {
    // 计算速度梯度
    const distanceM = (params.distance || 10) / 1000;  // 板间距（米）
    const velocityGradient = velocity / distanceM;  // 速度梯度 (s⁻¹)
    
    // 计算虚线与x轴的夹角
    const deltaX = topParticleX - bottomParticleX;  // x方向的差值
    const deltaY = bottomParticleY - topParticleY;  // y方向的差值（Canvas坐标系，向下为正）
    const angleRad = Math.atan2(Math.abs(deltaY), Math.abs(deltaX));  // 夹角（弧度）
    const angleDeg = angleRad * (180 / Math.PI);  // 夹角（度）
    
    // 绘制夹角弧线
    const arcRadius = 30;  // 弧线半径
    const startAngle = 0;  // x轴方向（0度）
    const endAngle = -angleRad;  // 虚线方向（Canvas坐标系，向上为负）
    
    canvasCtx.strokeStyle = isDark ? 'rgba(255, 165, 0, 0.8)' : 'rgba(243, 156, 18, 0.8)';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([3, 3]);
    canvasCtx.beginPath();
    canvasCtx.arc(bottomParticleX, bottomParticleY, arcRadius, endAngle, startAngle, false);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);
    
    // 显示夹角数值（在弧线中间位置）
    const labelAngle = endAngle / 2;  // 弧线的中间角度
    const labelX = bottomParticleX + (arcRadius + 15) * Math.cos(labelAngle);
    const labelY = bottomParticleY + (arcRadius + 15) * Math.sin(labelAngle);
    
    canvasCtx.fillStyle = isDark ? 'rgba(255, 165, 0, 0.9)' : 'rgba(243, 156, 18, 0.9)';
    canvasCtx.font = 'bold 15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`θ = ${angleDeg.toFixed(1)}°`, labelX, labelY);
    
    // 显示速度梯度信息（在虚线中间）
    canvasCtx.fillStyle = isDark ? 'rgba(0, 212, 255, 0.8)' : 'rgba(26, 60, 124, 0.8)';
    canvasCtx.font = 'bold 14px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`速度梯度: ${velocityGradient.toFixed(1)} s⁻¹`, (topParticleX + bottomParticleX) / 2, (topParticleY + bottomParticleY) / 2 - 15);
  }
}



function deferredResizeObserver(callback) {
  let frame=0,pending=null,active=true;
  const observer=new ResizeObserver(entries=>{
    pending=entries;
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(active)callback(pending,observer);});
  });
  const disconnect=observer.disconnect.bind(observer);
  observer.disconnect=()=>{active=false;if(frame)cancelAnimationFrame(frame);frame=0;disconnect();};
  return observer;
}
function newSphereMotion(r, rp, rf, mu, height, timeScale) {
  const p = PhysicsEngine.stokes(r, rp, rf, mu);
  const H = height || Math.max(5, Math.abs(p.vt) * p.tau * 7.5);
  const origin = p.vt < 0 ? H : 0;
  return {x: origin, origin, height: H, v: 0, time: 0, stopped: false,
    scale: timeScale || Math.max(1, Math.min(1e8, H / Math.max(Math.abs(p.vt),1e-12) / 15))};
}
function advanceBoundedSphere(m, dt, r, rp, rf, mu) {
  const outward = (m.x <= 0 && rp <= rf && m.v <= 0) || (m.x >= m.height && rp >= rf && m.v >= 0);
  if (outward) {m.v=0; m.stopped=true; return;}
  m.stopped=false;
  let step=PhysicsEngine.advanceSphere(m.v,dt,r,rp,rf,mu), next=m.x+step.dx;
  if (next < 0 || next > m.height) {
    const boundary=next<0?0:m.height;
    let lo=0,hi=dt;
    for(let i=0;i<32;i++) {
      const mid=(lo+hi)/2, q=PhysicsEngine.advanceSphere(m.v,mid,r,rp,rf,mu);
      if ((boundary===0 && m.x+q.dx<=0)||(boundary!==0&&m.x+q.dx>=boundary)) hi=mid;
      else lo=mid;
    }
    m.time+=hi; m.x=boundary; m.v=0; m.stopped=true;
  } else { m.x=next; m.v=step.v; m.time+=dt; }
}
function ensureStokesMotion(params) {
  const signature=JSON.stringify([params.ballRadius,params.ballDensity,params.fluidDensity,params.viscosity]);
  let m=AppState.stokesMotion;
  if(!m || (m.time===0 && m.initialSignature!==signature)) {
    m=newSphereMotion(params.ballRadius,params.ballDensity,params.fluidDensity,params.viscosity);
    m.initialSignature=signature; AppState.stokesMotion=m;
    AppState.stokesBallY=m.x/m.height;
  }
  return m;
}
function offlineLabPlotScript() {
  return '<script>('+installLabPlot.toString()+')(window);<\/script>\n';
}

function drawStokesSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 物理计算
  const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
  const vt = (isNaN(calc.vt) || !isFinite(calc.vt)) ? 0 : calc.vt;
  
  // 计算时间常数 τ = m / (6πμr)
  let tau;
  if (params.viscosity > 0 && params.ballRadius > 0) {
    tau = calc.mass / (6 * Math.PI * params.viscosity * params.ballRadius);
  } else {
    tau = 1.0;
  }
  
  const motion = ensureStokesMotion(params);
  const CONTAINER_REAL_HEIGHT = motion.height;
  const timeAcceleration = motion.scale;

  // 配置参数 - 2.5D视角
  var CONTAINER_WIDTH = Math.min(w * 0.8, 500);  // 容器宽度，自适应画布
  var heightRatio = (h < 400) ? 0.90 : 0.82;  // 小屏用更大比例
  const CONTAINER_HEIGHT = Math.min(h * heightRatio, 580);  // 画布上的容器高度（像素）
  const BALL_RADIUS_SCALE = 6000;  // 小球半径缩放
  const MIN_BALL_RADIUS = 12;  // 最小小球半径
  const FORCE_SCALE = 60;  // 力矢量缩放
  const MAX_FORCE_LENGTH = 100;  // 最大力矢量长度
  
  const cx = w / 2;
  const sx = cx - CONTAINER_WIDTH / 2;
  const sy = (h - CONTAINER_HEIGHT) / 2;  // 垂直居中
  
  const ballR = Math.max(MIN_BALL_RADIUS, params.ballRadius * BALL_RADIUS_SCALE);
  
  // 小球位置计算（物理更新已在updateSimParticles中完成，这里只读取状态）
  // 计算画布上的Y坐标（直接使用容器高度，与刻度尺对齐）
  const ballY = sy + AppState.stokesBallY * CONTAINER_HEIGHT;
  
  // 2.5D容器绘制 - 上下同宽
  const containerWidth = CONTAINER_WIDTH;
  const containerLeft = cx - containerWidth / 2;
  
  // 1. 容器后壁（深色背景）
  const backWallGrad = canvasCtx.createLinearGradient(containerLeft, sy, containerLeft + containerWidth, sy + CONTAINER_HEIGHT);
  if (isDark) {
    backWallGrad.addColorStop(0, 'rgba(20, 40, 80, 0.3)');
    backWallGrad.addColorStop(0.5, 'rgba(30, 60, 100, 0.4)');
    backWallGrad.addColorStop(1, 'rgba(20, 40, 80, 0.3)');
  } else {
    backWallGrad.addColorStop(0, 'rgba(26, 60, 124, 0.08)');
    backWallGrad.addColorStop(0.5, 'rgba(26, 60, 124, 0.12)');
    backWallGrad.addColorStop(1, 'rgba(26, 60, 124, 0.08)');
  }
  canvasCtx.fillStyle = backWallGrad;
  canvasCtx.fillRect(containerLeft, sy, containerWidth, CONTAINER_HEIGHT);
  
  // 2. 流体（半透明蓝色填充）
  const fluidTop = sy + 20;  // 液面位置
  const fluidGrad = canvasCtx.createLinearGradient(0, fluidTop, 0, sy + CONTAINER_HEIGHT);
  if (isDark) {
    fluidGrad.addColorStop(0, 'rgba(0, 150, 255, 0.15)');
    fluidGrad.addColorStop(1, 'rgba(0, 100, 200, 0.25)');
  } else {
    fluidGrad.addColorStop(0, 'rgba(26, 60, 124, 0.1)');
    fluidGrad.addColorStop(1, 'rgba(26, 60, 124, 0.2)');
  }
  canvasCtx.fillStyle = fluidGrad;
  canvasCtx.fillRect(containerLeft + 2, fluidTop, containerWidth - 4, CONTAINER_HEIGHT - 20);
  
  // 3. 液面（波浪效果）
  canvasCtx.strokeStyle = isDark ? 'rgba(0, 180, 255, 0.6)' : 'rgba(26, 60, 124, 0.4)';
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  for (let x = 0; x < containerWidth - 4; x += 2) {
    const wave = Math.sin(x * 0.1 + AppState.simTime * 2) * 2;
    if (x === 0) {
      canvasCtx.moveTo(containerLeft + 2 + x, fluidTop + wave);
    } else {
      canvasCtx.lineTo(containerLeft + 2 + x, fluidTop + wave);
    }
  }
  canvasCtx.stroke();
  
  // 4. 容器边框（矩形）
  canvasCtx.strokeStyle = isDark ? 'rgba(100, 150, 255, 0.6)' : 'rgba(26, 60, 124, 0.5)';
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeRect(containerLeft, sy, containerWidth, CONTAINER_HEIGHT);
  
  // 4.5 刻度尺（动态显示高度，顶部0米，底部为CONTAINER_REAL_HEIGHT米）
  canvasCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  canvasCtx.lineWidth = 1;
  canvasCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  canvasCtx.font = '14px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
  canvasCtx.textAlign = 'right';
  
  // 智能计算刻度间隔：确保刻度之间有至少40像素的间距
  const minPixelGap = 40;  // 刻度之间最小像素间距
  const maxTicks = Math.floor(CONTAINER_HEIGHT / minPixelGap);  // 最多能显示多少个刻度
  
  // 根据容器高度和最大刻度数计算合适的间隔
  let meterStep;
  if (CONTAINER_REAL_HEIGHT <= 5) {
    meterStep = 1;  // 5米以内，每1米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 15) {
    meterStep = 2;  // 15米以内，每2米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 50) {
    meterStep = 5;  // 50米以内，每5米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 100) {
    meterStep = 10;  // 100米以内，每10米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 500) {
    meterStep = 50;  // 500米以内，每50米一个刻度
  } else {
    meterStep = 100;  // 超过500米，每100米一个刻度
  }
  
  // 确保刻度数量不超过最大限制
  const expectedTicks = Math.ceil(CONTAINER_REAL_HEIGHT / meterStep) + 1;
  if (expectedTicks > maxTicks) {
    // 如果刻度太多，进一步增大间隔
    meterStep = Math.ceil(CONTAINER_REAL_HEIGHT / (maxTicks - 1));
    // 圆整到合理的值（1, 2, 5, 10, 20, 50, 100, 200, 500, 1000...）
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    for (const step of niceSteps) {
      if (step >= meterStep) {
        meterStep = step;
        break;
      }
    }
  }
  
  // 显示刻度（顶部0米，底部CONTAINER_REAL_HEIGHT米）
  for (let meter = 0; meter <= CONTAINER_REAL_HEIGHT; meter += meterStep) {
    const yPos = sy + (meter / CONTAINER_REAL_HEIGHT) * CONTAINER_HEIGHT;  // 从上到下
    
    // 刻度线
    canvasCtx.beginPath();
    canvasCtx.moveTo(containerLeft, yPos);
    canvasCtx.lineTo(containerLeft + 8, yPos);
    canvasCtx.stroke();
    
    // 刻度标签
    canvasCtx.fillText(`${meter}m`, containerLeft - 5, yPos + 3);
  }
  
  // 侧壁装饰线（增强立体感）
  canvasCtx.strokeStyle = isDark ? 'rgba(100, 150, 255, 0.15)' : 'rgba(26, 60, 124, 0.1)';
  canvasCtx.lineWidth = 1;
  // 左侧壁
  canvasCtx.beginPath();
  canvasCtx.moveTo(containerLeft + 20, sy);
  canvasCtx.lineTo(containerLeft + 20, sy + CONTAINER_HEIGHT);
  canvasCtx.stroke();
  // 右侧壁
  canvasCtx.beginPath();
  canvasCtx.moveTo(containerLeft + containerWidth - 20, sy);
  canvasCtx.lineTo(containerLeft + containerWidth - 20, sy + CONTAINER_HEIGHT);
  canvasCtx.stroke();
  
  // 5. 流线（绕过小球，增强流动感）
  canvasCtx.strokeStyle = isDark ? 'rgba(0, 180, 255, 0.25)' : 'rgba(26, 60, 124, 0.2)';
  canvasCtx.lineWidth = 1;
  
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    
    const streamY = ballY + i * ballR * 2;
    if (streamY < fluidTop || streamY > sy + CONTAINER_HEIGHT - 5) continue;
    
    canvasCtx.beginPath();
    for (let xOff = -CONTAINER_WIDTH / 2; xOff < CONTAINER_WIDTH / 2; xOff += 3) {
      const dx = xOff;
      const dy = streamY - ballY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deflect = dist > ballR ? (ballR * ballR * dx) / (dist * dist) : 0;
      const px = cx + xOff;
      const py = streamY - deflect * 0.3;
      
      if (xOff === -CONTAINER_WIDTH / 2) {
        canvasCtx.moveTo(px, py);
      } else {
        canvasCtx.lineTo(px, py);
      }
    }
    canvasCtx.stroke();
  }
  
  // 6. 小球阴影（在地面上）
  const shadowY = sy + CONTAINER_HEIGHT - 10;
  const shadowScale = 1 - (ballY - sy) / CONTAINER_HEIGHT * 0.3;  // 距离越远阴影越小
  canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  canvasCtx.beginPath();
  canvasCtx.ellipse(cx, shadowY, ballR * shadowScale, ballR * 0.3 * shadowScale, 0, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 7. 小球3D效果
  /* 防御：仿真数值偶尔会算出 NaN / Infinity（比如参数越界或刚切实验还没初始化），
     直接喂给 createRadialGradient 会抛 non-finite 异常，整帧就画不出来了。 */
  if (!isFinite(cx) || !isFinite(ballY) || !isFinite(ballR) || ballR <= 0) return;
  // 外层光晕
  const glowGrad = canvasCtx.createRadialGradient(cx, ballY, ballR * 0.8, cx, ballY, ballR * 1.5);
  glowGrad.addColorStop(0, 'rgba(255, 100, 100, 0.2)');
  glowGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
  canvasCtx.fillStyle = glowGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR * 1.5, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 主体渐变（3D球体）
  const ballGrad = canvasCtx.createRadialGradient(
    cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.1,
    cx, ballY, ballR
  );
  ballGrad.addColorStop(0, '#ffaaaa');
  ballGrad.addColorStop(0.3, '#ff6666');
  ballGrad.addColorStop(0.7, '#e03131');
  ballGrad.addColorStop(1, '#a91e2c');
  canvasCtx.fillStyle = ballGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 高光
  const highlightGrad = canvasCtx.createRadialGradient(
    cx - ballR * 0.3, ballY - ballR * 0.3, 0,
    cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.4
  );
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  canvasCtx.fillStyle = highlightGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.4, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 边框
  canvasCtx.strokeStyle = 'rgba(255, 135, 135, 0.6)';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR, 0, Math.PI * 2);
  canvasCtx.stroke();
  
  // 8. 力矢量箭头
  // 重力Fg（向下）
  if (calc.Fg > 0) {
    const gLen = Math.min(calc.Fg * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx + ballR + 20, ballY);
    canvasCtx.lineTo(cx + ballR + 20, ballY + gLen);
    canvasCtx.lineTo(cx + ballR + 20 - 6, ballY + gLen - 8);
    canvasCtx.moveTo(cx + ballR + 20, ballY + gLen);
    canvasCtx.lineTo(cx + ballR + 20 + 6, ballY + gLen - 8);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#e74c3c';
    canvasCtx.font = 'bold 15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText('重力 Fg', cx + ballR + 28, ballY + gLen / 2);
  }
  
  // 浮力Fb（向上）
  if (calc.Fb > 0) {
    const bLen = Math.min(calc.Fb * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#3498db';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx - ballR - 20, ballY);
    canvasCtx.lineTo(cx - ballR - 20, ballY - bLen);
    canvasCtx.lineTo(cx - ballR - 20 - 6, ballY - bLen + 8);
    canvasCtx.moveTo(cx - ballR - 20, ballY - bLen);
    canvasCtx.lineTo(cx - ballR - 20 + 6, ballY - bLen + 8);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#3498db';
    canvasCtx.font = 'bold 15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'right';
    canvasCtx.fillText('浮力 Fb', cx - ballR - 28, ballY - bLen / 2);
  }
  
  // Signed drag: positive downward velocity means an upward drag arrow.
  const Fd = PhysicsEngine.stokesDrag(params.viscosity, params.ballRadius, AppState.stokesBallV || 0, params.fluidDensity);
  if (Math.abs(Fd) > 1e-12) {
    const sign = Math.sign(Fd), dLen = Math.max(8, Math.min(Math.abs(Fd)*FORCE_SCALE*10, MAX_FORCE_LENGTH));
    const ay=ballY-sign*(ballR+15), by=ay-sign*dLen;
    canvasCtx.strokeStyle='#f39c12'; canvasCtx.lineWidth=3; canvasCtx.beginPath();
    canvasCtx.moveTo(cx,ay); canvasCtx.lineTo(cx,by);
    canvasCtx.lineTo(cx-6,by+sign*8); canvasCtx.moveTo(cx,by); canvasCtx.lineTo(cx+6,by+sign*8); canvasCtx.stroke();
    canvasCtx.fillStyle='#f39c12'; canvasCtx.textAlign='left'; canvasCtx.fillText('阻力 Fd',cx+10,(ay+by)/2);
  }

  // 11. 到达底部提示
  if (motion.stopped) {
    canvasCtx.fillStyle = isDark ? 'rgba(0, 255, 136, 0.15)' : 'rgba(46, 204, 113, 0.15)';
    canvasCtx.fillRect(containerLeft, sy + CONTAINER_HEIGHT - 40, containerWidth, 30);
    
    canvasCtx.fillStyle = isDark ? '#00FF88' : '#27ae60';
    canvasCtx.font = 'bold 16px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(motion.x <= 0 ? '已到达液面' : '已到达底部', cx, sy + CONTAINER_HEIGHT - 20);
  }
  
  // 12. 显示时间加速信息（如果加速因子>1）
  if (timeAcceleration > 1.5) {
    canvasCtx.fillStyle = isDark ? 'rgba(255, 149, 0, 0.8)' : 'rgba(243, 156, 18, 0.8)';
    canvasCtx.font = 'bold 15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`动画加速: ${timeAcceleration.toFixed(1)}x`, cx, sy - 10);
  }
}

// 格式化数值为科学计数法（带Unicode上标）
function formatScientific(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return '0';
  }
  
  // 使用科学计数法
  const expStr = value.toExponential(decimals);
  const [mantissa, exponent] = expStr.split('e');
  
  // 转换为数字去除末尾零
  const mantissaNum = parseFloat(mantissa);
  const mantissaStr = mantissaNum.toString();
  
  // 指数转换为上标
  const expNum = parseInt(exponent);
  const superscripts = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'};
  const expSuperscript = expNum.toString().split('').map(c => superscripts[c] || c).join('');
  
  return `${mantissaStr}×10${expSuperscript}`;
}

// 泊肃叶2D粒子动画（Canvas渲染）
function drawPoiseuilleSimulation(w, h, isDark) {
  const params = getParamValues();
  const R = params.radius || 0.002;
  const L = params.length || 1.0;
  const dP = params.pressure || 1000;
  const mu = params.viscosity || 0.001;
  const rho = params.density || 1000;

  const calc = PhysicsEngine.poiseuille(R, L, dP, mu, rho);
  const umax = calc.vmax || 0;

  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 30;
  const MARGIN_TOP = 40;
  const MARGIN_BOTTOM = 60;
  const PIPE_WALL = 18;

  const cw = w - MARGIN_LEFT - MARGIN_RIGHT;
  const ch = h - MARGIN_TOP - MARGIN_BOTTOM;
  const sx = MARGIN_LEFT;
  const sy = MARGIN_TOP;
  const pipeTop = sy + PIPE_WALL;
  const pipeBottom = sy + ch - PIPE_WALL;
  const pipeH = pipeBottom - pipeTop;

  // 填充背景
  canvasCtx.fillStyle = isDark ? '#0a0a0f' : '#ffffff';
  canvasCtx.fillRect(0, 0, w, h);

  // 流体区域背景
  const fluidGrad = canvasCtx.createLinearGradient(0, pipeBottom, 0, pipeTop);
  if (isDark) {
    fluidGrad.addColorStop(0, 'rgba(0,20,60,0.4)');
    fluidGrad.addColorStop(0.5, 'rgba(0,60,140,0.5)');
    fluidGrad.addColorStop(1, 'rgba(0,20,60,0.4)');
  } else {
    fluidGrad.addColorStop(0, 'rgba(200,220,250,0.4)');
    fluidGrad.addColorStop(0.5, 'rgba(180,210,255,0.5)');
    fluidGrad.addColorStop(1, 'rgba(200,220,250,0.4)');
  }
  canvasCtx.fillStyle = fluidGrad;
  canvasCtx.fillRect(sx, pipeTop, cw, pipeH);

  // 管壁（灰色带3D效果）
  for (let wall = 0; wall < 2; wall++) {
    const wy = wall === 0 ? sy : sy + ch - PIPE_WALL;
    const wGrad = canvasCtx.createLinearGradient(0, wy, 0, wy + PIPE_WALL);
    if (isDark) {
      wGrad.addColorStop(0, '#606878');
      wGrad.addColorStop(0.4, '#9098a8');
      wGrad.addColorStop(0.6, '#b0b8c8');
      wGrad.addColorStop(1, '#505868');
    } else {
      wGrad.addColorStop(0, '#9099a8');
      wGrad.addColorStop(0.4, '#b0b8c8');
      wGrad.addColorStop(0.6, '#d0d8e8');
      wGrad.addColorStop(1, '#808898');
    }
    canvasCtx.fillStyle = wGrad;
    canvasCtx.fillRect(sx, wy, cw, PIPE_WALL);
    canvasCtx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeRect(sx, wy, cw, PIPE_WALL);
  }

  // 管壁标签
  canvasCtx.fillStyle = isDark ? '#8899bb' : '#666666';
  canvasCtx.font = '14px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
  canvasCtx.fillText('管壁', sx + 4, sy + 14);
  canvasCtx.fillText('管壁', sx + 4, sy + ch - 4);

  // 中心线（虚线）
  canvasCtx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  canvasCtx.lineWidth = 1;
  canvasCtx.setLineDash([8, 6]);
  canvasCtx.beginPath();
  canvasCtx.moveTo(sx, sy + ch / 2);
  canvasCtx.lineTo(sx + cw, sy + ch / 2);
  canvasCtx.stroke();
  canvasCtx.setLineDash([]);

  // 流速剖面指示（右侧抛物线）
  const arrowX = sx + cw - 40;
  canvasCtx.strokeStyle = isDark ? '#00d4ff' : '#1a3c7c';
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(arrowX, pipeTop);
  canvasCtx.lineTo(arrowX, pipeBottom);
  canvasCtx.stroke();
  canvasCtx.strokeStyle = isDark ? '#00d4ff' : '#1a3c7c';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.setLineDash([3, 3]);
  canvasCtx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const ry = pipeTop + t * pipeH;
    const rFrac = Math.abs(t - 0.5) * 2;
    const vNorm = 1 - rFrac * rFrac;
    const rx = arrowX + vNorm * 30;
    if (i === 0) canvasCtx.moveTo(rx, ry);
    else canvasCtx.lineTo(rx, ry);
  }
  canvasCtx.stroke();
  canvasCtx.setLineDash([]);

  // 粒子（带发光效果）
  if (animParticles && animParticles.length > 0) {
    animParticles.forEach(function(p) {
      const actualY = pipeTop + pipeH * (0.5 + p.rSign * p.rFrac / 2);
      const speedNorm = 1 - p.rFrac * p.rFrac;
      const alpha = 0.3 + speedNorm * 0.55;
      const radius = 1.5 + speedNorm * 2.5;
      const g = Math.round(30 + speedNorm * 180);
      const b = Math.round(80 + speedNorm * 175);
      canvasCtx.shadowColor = 'rgba(0,' + g + ',' + b + ',0.5)';
      canvasCtx.shadowBlur = 2 + speedNorm * 4;
      canvasCtx.fillStyle = 'rgba(0,' + g + ',' + b + ',' + alpha + ')';
      canvasCtx.beginPath();
      canvasCtx.arc(sx + p.x, actualY, radius, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.shadowBlur = 0;
    });
  }

  // 参数标签
  canvasCtx.fillStyle = isDark ? '#00d4ff' : '#1a3c7c';
  canvasCtx.font = 'bold 15px  "Times New Roman", "SourceHanSerifEmbedded", "Noto Serif SC", SimSun, serif';
  canvasCtx.fillText('R=' + R.toFixed(3) + ' m  u_max=' + umax.toFixed(4) + ' m/s', sx + cw / 2 - 80, sy - 8);

  // 流速图例
  canvasCtx.fillStyle = isDark ? '#8899bb' : '#666666';
  canvasCtx.font = '13px  "Times New Roman", Consolas, monospace';
  canvasCtx.fillText('快 ← 抛物线速度分布 → 慢', sx + cw / 2 - 50, sy + ch + 40);
}

function getParamValues() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  if (!exp) return {};
  
  const values = {};
  
  exp.params.forEach(param => {
    const slider = document.getElementById(param.id);
    if (slider) {
      values[param.id] = parseFloat(slider.value);
    } else {
      // 如果滑块不存在，使用默认值
      values[param.id] = param.value;
    }
  });
  
  return values;
}


// 数据面板更新

function updateDataDisplay() {
  const exp = AppState.currentExperiment;
  const params = getParamValues();
  const container = document.getElementById('dataContainer');
  
  if (!container) return;
  
  let results = {};
  
  if (exp === 'newton') {
    results = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance, params.area);
  } else if (exp === 'poiseuille') {
    results = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
  } else if (exp === 'stokes') {
    results = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    // 添加实时阻力计算
    results.Fd = AppState.stokesBallFd || 0;
  }
  
  // 中文标签映射
  const chineseLabels = {
    'grad': '速度梯度',
    'tau': '切应力',
    'F': '黏性力',
    'Q': '体积流量',
    'vmax': '最大速度',
    'Rf': '流阻',
    'Re': '雷诺数',
    'v_avg': '平均速度',
    'Fg': '重力',
    'Fb': '浮力',
    'Fd': '阻力',
    'vt': '终端速度',
    't': '时间',
    'volume': '体积',
    'mass': '质量'
  };
  
  // 斯托克斯实验：移除不显示在数据卡中的字段
  var excludeKeys = exp === 'stokes' ? ['s', 'volume', 'mass', 'dragFormula', 'tau', 'blended'] : ['dragFormula'];

  container.innerHTML = Object.entries(results).filter(function(entry) {
    return excludeKeys.indexOf(entry[0]) === -1;
  }).map(function(entry) {
    var key = entry[0], value = entry[1];
    const label = chineseLabels[key] || key;
    const displayValue = typeof value === 'number' ? formatScientific(value) : value;
    return `
      <div class="data-card">
        <div class="data-label">${label}</div>
        <div class="data-value">
          ${displayValue}
          <span class="data-unit">${getUnit(key)}</span>
        </div>
      </div>
    `;
  }).join('');

  // 斯托克斯实验：显示阻力分区提示
  if (exp === 'stokes' && results.dragFormula) {
    var df = results.dragFormula;
    var hints = {
      'stokes': { bg: 'rgba(0,255,0,0.08)', border: 'rgba(0,255,0,0.3)', color: '#00e676',
        html: ' <b>斯托克斯区</b> (Re<0.1)<br>F<sub>d</sub> = 6πμrv　｜　Cd = 24/Re' },
      'oseen': { bg: 'rgba(0,200,255,0.08)', border: 'rgba(0,200,255,0.3)', color: '#00c8ff',
        html: ' <b>Oseen 修正区</b> (0.1≤Re<1)<br>F<sub>d</sub> = 6πμrv × (1 + 3Re/16)' },
      'schiller-naumann': { bg: 'rgba(255,152,0,0.08)', border: 'rgba(255,152,0,0.3)', color: '#ff9800',
        html: ' <b>Schiller-Naumann 过渡区</b> (1≤Re<800)<br>F<sub>d</sub> = 6πμrv × (1 + 0.15Re<sup>0.687</sup>)' },
      'newton': { bg: 'rgba(255,80,80,0.08)', border: 'rgba(255,80,80,0.3)', color: '#ff5050',
        html: ' <b>牛顿阻力区</b> (Re≥800)<br>F<sub>d</sub> = ½ρ<sub>f</sub>·0.44·πr²·v²　｜　Cd ≈ 0.44' }
    };
    var h = results.blended ? {bg:'rgba(255,152,0,0.08)',border:'rgba(255,152,0,0.3)',color:'#ff9800',html:'<b>模型平滑过渡区</b><br>当前阻力由相邻公式连续混合；不可当作单一公式的验证点。'} : (hints[df] || hints['stokes']);
    container.innerHTML += '<div style="margin-top:6px;padding:8px 10px;background:' + h.bg + ';border:1px solid ' + h.border + ';border-radius:6px;font-size:0.68rem;color:' + h.color + ';text-align:center;line-height:1.6;">' + h.html + '</div>';
  }

  // 泊肃叶实验：检查雷诺数并显示警告
  if (exp === 'poiseuille' && results.Re !== undefined) {
    const warningContainer = document.getElementById('reynoldsWarning');
    if (warningContainer) {
      if (results.Re > 2000) {
        warningContainer.innerHTML = `
          <div class="warning-message">
            <span class="warning-icon"></span>
            <span class="warning-text">雷诺数 Re = ${results.Re.toFixed(0)} > 2000，不满足层流条件，泊肃叶定律不适用！</span>
          </div>
        `;
        warningContainer.style.display = 'block';
      } else {
        warningContainer.style.display = 'none';
      }
    }
  }
}

function getUnit(key) {
  const units = {
    'grad': 's⁻¹',
    'tau': 'Pa',
    'F': 'N',
    'Q': 'm³/s',
    'vmax': 'm/s',
    'Rf': 'Pa·s/m³',
    'Re': '',
    'v_avg': 'm/s',
    'Fg': 'N',
    'Fb': 'N',
    'Fd': 'N',
    'vt': 'm/s',
    's': 's',
    'volume': 'm³',
    'mass': 'kg'
  };
  return units[key] || '';
}


// 实时图表功能

function initRealtimeChart() {
  const canvas=document.getElementById('realtimeChart');
  if(!canvas)return;
  if(AppState.chartInstance)AppState.chartInstance.destroy();
  const plot=LabPlot.create(canvas), exp=AppState.currentExperiment;
  plot.data={labels:[],datasets:[{label:getChartLabel(exp),data:[],borderColor:getChartColor(exp)}]};
  plot.update=function(){
    this.setOption({backgroundColor:AppState.isDarkTheme?'#172234':'#ffffff',
      xAxis:{name:'时间 (s)'},yAxis:{name:getChartYLabel(exp)},
      series:this.data.datasets.map(d=>({name:d.label,type:'line',symbol:'none',
        data:d.data.map((v,i)=>[AppState.timeHistory[i]??Number(this.data.labels[i]),v]),
        lineStyle:{color:d.borderColor,width:d.borderWidth||2,type:d.borderDash?'dashed':'solid'}}))});
  };
  AppState.chartInstance=plot;plot.update();
}

function getChartLabel(exp) {
  const labels = {
    'newton': '黏性力 F',
    'poiseuille': '体积流量 Q',
    'stokes': '速度 v'
  };
  return labels[exp] || '数据';
}

function getChartColor(exp) {
  const colors = {
    'newton': '#1a3c7c',
    'poiseuille': '#2ecc71',
    'stokes': '#f39c12'
  };
  return colors[exp] || '#3381ff';
}

function getChartYLabel(exp) {
  const labels = {
    'newton': 'F (N)',
    'poiseuille': 'Q (×10⁻⁶ m³/s)',
    'stokes': 'v (m/s)'
  };
  return labels[exp] || '值';
}

function updateRealtimeChart() {
  if (!AppState.chartInstance) {
    console.warn('Chart instance not initialized');
    return;
  }
  
  const exp = AppState.currentExperiment;
  const params = getParamValues();

  // 计算当前数据点
  let currentValue = 0;
  let refLine = null;

  if (exp === 'newton') {
    const calc = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance, params.area);
    currentValue = calc.F;  // 使用黏性力 F 而不是切应力 τ
  } else if (exp === 'poiseuille') {
    const calc = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
    currentValue = calc.Q * 1e6; // 转换为 ×10⁻⁶ m³/s
  } else if (exp === 'stokes') {
    const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    currentValue = AppState.stokesBallV || 0;
    refLine = calc.vt; // 终端速度参考线
  }

  // 添加数据到历史
  const sampleTime=AppState.simTime;
  if(AppState.timeHistory.at(-1)===sampleTime)AppState.dataHistory[AppState.dataHistory.length-1]=currentValue;
  else {AppState.dataHistory.push(currentValue);AppState.timeHistory.push(sampleTime)}

  // 限制历史数据长度（最多显示20秒）
  const maxTime = 20;
  while (AppState.timeHistory.length > 0 &&
         (AppState.timeHistory[AppState.timeHistory.length - 1] - AppState.timeHistory[0] > maxTime || AppState.timeHistory.length>2000)) {
    AppState.dataHistory.shift();
    AppState.timeHistory.shift();
  }

  /* 保留最近 20 秒的时间标签与采样数据；新增采样后刷新图表。 */
  const chart = AppState.chartInstance;
  chart.data.labels = AppState.timeHistory.map(t => t.toFixed(1));
  chart.data.datasets[0].data = AppState.dataHistory;

  // 更新参考线（仅斯托克斯实验）
  if (exp === 'stokes' && refLine !== null) {
    // 使用第二个数据集绘制终端速度参考线
    if (chart.data.datasets.length < 2) {
      chart.data.datasets.push({
        label: '终端速度',
        data: [],
        borderColor: '#e74c3c',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }
    chart.data.datasets[1].data = AppState.timeHistory.map(() => refLine);
  }

  chart.update('none'); // 刷新 LabPlot；当前实现不执行插值动画。
}

function updateChartData() {
  const exp = AppState.currentExperiment;
  const params = getParamValues();

  // 更新数据面板
  updateDataDisplay();

  // 如果图表实例存在，更新最新数据点
  if (AppState.chartInstance) {
    let currentValue = 0;
    if (exp === 'newton') {
      const calc = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance, params.area);
      currentValue = calc.F;
    } else if (exp === 'poiseuille') {
      const calc = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
      currentValue = calc.Q * 1e6;
    } else if (exp === 'stokes') {
      const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
      currentValue = AppState.stokesBallV || 0;
    }
    updateRealtimeChart();
  }

  // 重绘画布
  drawSimulationCanvas();

  // 泊肃叶实验：更新3D场景
  if (exp === 'poiseuille' && poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
    updatePoiseuille3D();
  }
}


// 仿真控制

function startSimulation() {
  if (AppState.simulationRunning && AppState.simulationPaused) {
    AppState.simulationPaused = false;
    LabRecorder.onSimStart();
    runSimulation();
    return;
  }
  
  // 如果是第一次启动（未运行过），需要先模拟一帧让粒子流动，然后保存这个状态作为初始状态
  if (!AppState.simulationRunning) {
    // 临时设置为运行状态，让粒子移动一帧
    AppState.simulationRunning = true;
    AppState.simulationPaused = false;
    
    // 执行一次粒子更新（移动一帧）
    if (AppState.currentExperiment === 'poiseuille') {
      updatePoiseuille3D();
      
      // 保存移动后的粒子位置作为新的初始状态
      poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        radius: p.userData.radius,
        angle: p.userData.angle
      }));
      
      // 重置粒子到初始位置（即刚才移动后的位置）
      resetPoiseuilleParticles();
    }
    
    // 重置状态，准备真正开始
    AppState.simulationRunning = false;
    AppState.simulationPaused = false;
    
    // 重新设置小球状态
    AppState.stokesBallDistance = 0;
    AppState.stokesBallY = 0;
    AppState.stokesBallV = 0;
    AppState.stokesBallStartTime = null;
  }
  
  AppState.simulationRunning = true;
  AppState.simulationPaused = false;
  AppState._lastFrameTs = performance.now();
  LabRecorder.onSimStart();
  runSimulation();
}

// 更新所有实验的粒子位置
function updateSimParticles(dt) {
  const exp = AppState.currentExperiment;
  dt = Number.isFinite(dt) ? Math.max(0,dt) : 0.016;
  
  if (exp === "newton") {
    const params = getParamValues();
    const velocity = params.velocity || 0.1;
    var simCanvas = document.getElementById('simCanvas');
    var cw = simCanvas ? (simCanvas._cssW || simCanvas.width) : 600;
    var ch = simCanvas ? (simCanvas._cssH || simCanvas.height) : 400;
    var scale = cw / 3;
    animParticles.forEach(function(p) {
      var yn = (p.y || ch/2) / ch;
      p.x += velocity * yn * scale * dt;
      if (p.x > cw + 10) p.x = -10;
    });
  } else if (exp === "poiseuille") {
    const params = getParamValues();
    const R = params.radius || 0.002;
    const L = params.length || 1;
    const dP = params.pressure || 1000;
    const mu = params.viscosity || 0.001;
    const rho = params.density || 1000;
    const calc = PhysicsEngine.poiseuille(R, L, dP, mu, rho);
    const umax = Math.max(calc.vmax, 0.0001);
    var simCanvas2 = document.getElementById('simCanvas');
    var cw = simCanvas2 ? (simCanvas2._cssW || simCanvas2.width) : 600;
    var scale = Math.min(cw / Math.max(umax, 0.0001) * 1.5, 500);
    animParticles.forEach(function(p) {
      const speed = umax * (1 - p.rFrac * p.rFrac);
      p.x += Math.max(0, speed) * scale * dt;
      if (p.x > cw + 10) p.x = -10;
    });
  } else if (exp === "stokes") {
    const params=getParamValues(), m=ensureStokesMotion(params);
    advanceBoundedSphere(m,dt*m.scale,params.ballRadius,params.ballDensity,params.fluidDensity,params.viscosity);
    AppState.stokesBallV=m.v;
    AppState.stokesBallTime=m.time;
    AppState.stokesBallDistance=m.x-m.origin;
    AppState.stokesBallY=m.x/m.height;
    AppState.stokesBallFd=PhysicsEngine.stokesDrag(params.viscosity,params.ballRadius,m.v,params.fluidDensity);
  }
}

function runSimulation(ts) {
  if (!AppState.simulationRunning || AppState.simulationPaused) return;
  
  // 使用真实帧间隔，兼容不同刷新率显示器
  // 首次直接调用时ts为undefined，用performance.now()代替
  var now = (typeof ts === 'number' && ts > 1000) ? ts : performance.now();
  var realDt = Math.min((now - AppState._lastFrameTs) / 1000, 0.05);
  AppState._lastFrameTs = now;
  if (realDt <= 0 || isNaN(realDt)) realDt = 0.016;
  AppState.simTime += realDt;

  updateSimParticles(realDt);
  // 采样当前帧一致的物理状态
  LabRecorder.onSimFrame();

  updateDataDisplay();
  
  // 更新实时图表
  updateRealtimeChart();
  
  // 绘制动画
  const exp = AppState.currentExperiment;
  if (exp === 'poiseuille') {
    // 泊肃叶实验：只使用3D WebGL渲染，不使用2D Canvas（会冲突）
    if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
      updatePoiseuille3D(realDt);
    }
  } else if (canvasCtx) {
    // 其他实验使用2D Canvas
    drawSimulationCanvas();
  }
  
  // 使用requestAnimationFrame进行下一次迭代
  AppState.animFrameId = requestAnimationFrame(runSimulation);
}

function pauseSimulation() {
  AppState.simulationPaused = true;
  LabRecorder.onSimPause();
}

function resetSimulation() {
  const exp = AppState.currentExperiment;
  
  // 停止仿真
  Navigation.stopSimulation();
  
  // 重置仿真状态
  AppState.simTime = 0;
  AppState.stokesBallDistance = 0;  // 初始下落距离0米
  AppState.stokesBallY = 0;  // 初始位置在顶部
  AppState.stokesBallV = 0;
  AppState.stokesBallFd = 0;
  AppState.stokesBallTime = 0;
  AppState.stokesMotion = null;
  AppState.stokesBallStartTime = null;  // 重置小球开始时间
  AppState.newtonGradientLineStartTime = null;  // 重置牛顿实验虚线开始时间
  AppState.trailLength = 2;  // 重置拖尾长度
  AppState.dataHistory = [];
  AppState.timeHistory = [];
  // 重置粒子
  if (exp === 'poiseuille') {
    // 泊肃叶实验：只重置粒子位置，不清理整个场景
    resetPoiseuilleParticles();
  } else {
    // 其他实验：重置2D粒子
    initParticles();
  }
  
  // 重绘画布
  if (canvasCtx) {
    drawSimulationCanvas();
  }
  
  // 重置参数为默认值
  const experiment = EXPERIMENTS[exp];
  experiment.params.forEach(param => {
    const slider = document.getElementById(param.id);
    const valueDisplay = document.getElementById(`${param.id}Value`);
    if (slider) {
      slider.value = param.value;
      valueDisplay.textContent = formatScientific(param.value);
    }
  });
  
  // 泊肃叶实验：重置为蓖麻油预设（立即应用，不延迟）
  if (exp === 'poiseuille') {
    applyFluidPreset('蓖麻油 (20°C)');
  }
    
  AppState.stokesMotion = null;
  if (canvasCtx) drawSimulationCanvas();
  // 更新数据
  updateDataDisplay();
  
  // 重置图表
  if (AppState.chartInstance) {
    AppState.chartInstance.data.labels = [];
    AppState.chartInstance.data.datasets[0].data = [];
    if (AppState.chartInstance.data.datasets.length > 1) {
      AppState.chartInstance.data.datasets[1].data = [];
    }
    AppState.chartInstance.update('none');
  }
  
  // 更新按钮状态为"开始"
  const playPauseBtn = document.getElementById('playPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.innerHTML = '开始';
    playPauseBtn.className = 'ctrl-btn play-pause';
  }

  // 重置即清空本次实验的操作记录
  LabRecorder.onSimReset();
}



// 对比实验报告（完整版）
// 版式对齐「线图模拟」的实验报告：A4 打印样式 / 三线表 / 图表可单独保存 / Blob 新窗口


var _CMP_META = {
  newton: {
    title: '牛顿黏性定律',
    law: 'τ = η·(du/dz)，F = τ·A',
    params: [
      { key: 'viscosity', label: '动力黏度 η', unit: 'Pa·s' },
      { key: 'velocity',  label: '上板速度 u', unit: 'm/s' },
      { key: 'spacing',   label: '板间距 z',   unit: 'm' },
      { key: 'area',      label: '板面积 A',   unit: 'm²' }
    ],
    indicators: [
      { key: 'gradient', label: '速度梯度 du/dz', unit: 's⁻¹', power: { velocity: 1, spacing: -1 } },
      { key: 'shear',    label: '剪切应力 τ',      unit: 'Pa',  power: { viscosity: 1, velocity: 1, spacing: -1 } },
      { key: 'F',        label: '黏性力 F',        unit: 'N',   power: { viscosity: 1, velocity: 1, spacing: -1, area: 1 } }
    ]
  },
  poiseuille: {
    title: '泊肃叶定律',
    law: 'Q = πR⁴ΔP/(8μL)',
    params: [
      { key: 'radius',    label: '管半径 R',   unit: 'm' },
      { key: 'length',    label: '管长 L',     unit: 'm' },
      { key: 'dp',        label: '压强差 ΔP',  unit: 'Pa' },
      { key: 'viscosity', label: '黏度 μ',     unit: 'Pa·s' },
      { key: '_rho', label: '流体密度 ρ', unit: 'kg/m³' }
    ],
    indicators: [
      { key: 'umax', label: '最大流速 <i>u</i><sub>max</sub>', unit: 'm/s',  power: { radius: 2, dp: 1, viscosity: -1, length: -1 } },
      { key: 'Q',    label: '体积流量 Q',      unit: 'm³/s', power: { radius: 4, dp: 1, viscosity: -1, length: -1 } },
      { key: 'Re',   label: '雷诺数 Re',       unit: '',     power: { radius: 3, dp: 1, viscosity: -2, length: -1, _rho: 1 }, law: 'Re = ρΔPR³/(4μ²L)' }
    ]
  },
  stokes: {
    title: '斯托克斯定律',
    law: '球体阻力与净重力平衡；Re < 0.1 时近似 v_t = 2r²(ρp−ρf)g/(9μ)',
    params: [
      { key: 'radius',    label: '球半径 r',    unit: 'm' },
      { key: 'viscosity', label: '黏度 μ',      unit: 'Pa·s' },
      { key: 'rhop',      label: '球密度 ρp',   unit: 'kg/m³' },
      { key: 'rhof',      label: '流体密度 ρf', unit: 'kg/m³' }
    ],
    indicators: [
      { key: 'vt', label: '终端速度 <i>v</i><sub>t</sub>',   unit: 'm/s' },
      { key: 'Fd', label: '黏滞阻力 <i>F</i><sub>d</sub>',   unit: 'N' },
      { key: 'Re', label: '雷诺数 Re',      unit: '' }
    ]
  }
};

function _cmpFmt(v, dec) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  var a = Math.abs(v);
  if (a !== 0 && (a < 0.0001 || a >= 10000)) return Number(v).toExponential(3);
  return Number(v).toFixed(dec === undefined ? 4 : dec);
}

// 收集当前对比模式下的三组参数与计算结果
function _cmpCollect() {
  var exp = AppState.currentExperiment;
  var meta = _CMP_META[exp];
  if (!meta) return null;
  var calc = exp === 'newton' ? compNewtonPhysics
           : (exp === 'poiseuille' ? compPoiseuillePhysics : compStokesPhysics);
  var groups = ['A', 'B', 'C'];
  var params = groups.map(function (k) { return compParams[k] || {}; });
  var results = params.map(function (p) { return calc(p); });
  return { exp: exp, meta: meta, groups: groups, params: params, results: results };
}

// A/B/C 之间存在差异的参数
function _cmpDiffParams(d) {
  var out = [];
  d.meta.params.forEach(function (p) {
    var v0 = d.params[0][p.key];
    if (v0 === null || v0 === undefined || !isFinite(v0)) return;
    var tol = Math.max(Math.abs(v0) * 1e-9, 1e-15);
    var same = d.params.every(function (pp) {
      var v = pp[p.key];
      return v !== null && v !== undefined && Math.abs(v - v0) <= tol;
    });
    if (!same) out.push(p);
  });
  return out;
}

// 自动生成差异分析文字：数值对比 + 按幂次关系核对理论倍数
function _cmpAnalysis(d) {
  var parts = [];
  var diffs = _cmpDiffParams(d);

  if (!diffs.length) {
    parts.push('<p>本次对比中 A / B / C 三组的参数完全相同，各项指标数值一致，可作为重复性对照实验。</p>');
  } else {
    parts.push('<p>本次对比中三组<b>仅以下参数不同</b>，其余条件保持一致：' +
      diffs.map(function (p) {
        return '<b>' + p.label + '</b>（' + d.groups.map(function (k, i) {
          return k + ' = ' + _cmpFmt(d.params[i][p.key], 6) + ' ' + p.unit;
        }).join('，') + '）';
      }).join('；') + '。</p>');
  }

  d.meta.indicators.forEach(function (ind) {
    var vals = d.results.map(function (r) { return r[ind.key]; });
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
    var kx = vals.indexOf(mx), kn = vals.indexOf(mn);

    var txt = '<p><b>' + ind.label + '：</b>三组依次为 ' +
      vals.map(function (v, i) {
        return d.groups[i] + ' = ' + _cmpFmt(v, 6) + (ind.unit ? ' ' + ind.unit : '');
      }).join('，') + '。';

    if (mx !== mn) {
      txt += d.groups[kx] + ' 组最大、' + d.groups[kn] + ' 组最小，最大值是最小值的 ' +
        _cmpFmt(mx / Math.max(Math.abs(mn), 1e-30), 3) + ' 倍。';
    } else {
      txt += '三组数值相同。';
    }

    // 与幂次关系核对：以 A 组为基准，按公式推算 B、C 应为 A 的多少倍
    if (ind.power && diffs.length) {
      var expRatios = [], actRatios = [], anyExp = false, okAll = true;
      for (var i = 1; i < 3; i++) {
        var er = 1, usable = true;
        diffs.forEach(function (p) {
          var pw = ind.power[p.key];
          if (pw === undefined || pw === null) return;
          var a = d.params[0][p.key], b = d.params[i][p.key];
          if (!a || !b || a <= 0 || b <= 0) { usable = false; return; }
          er *= Math.pow(b / a, pw);
        });
        if (!usable || !isFinite(er)) continue;
        anyExp = true;
        var ar = vals[i] / Math.max(Math.abs(vals[0]), 1e-30);
        expRatios.push(er); actRatios.push(ar);
        if (Math.abs(ar - er) > Math.abs(er) * 0.01) okAll = false;
      }
      if (anyExp) {
        txt += '以 A 组为基准，按 ' + (ind.law || d.meta.law) + ' 推算 ' +
          expRatios.map(function (r, i) { return d.groups[i + 1] + ' 组应为 ' + _cmpFmt(r, 3) + ' 倍'; }).join('、') +
          '；模型输出比值为 ' +
          actRatios.map(function (r, i) { return d.groups[i + 1] + ' 组 ' + _cmpFmt(r, 3) + ' 倍'; }).join('、') +
          '，' + (okAll
            ? '<b>与理论预期一致</b>。'
            : '<b>与理论预期不符</b>，请检查是否只改变了上表所列参数。');
      }
    }
    parts.push(txt + '</p>');
  });

  return parts.join('');
}

function generateCompareReport() {
  var d = _cmpCollect();
  if (!d) { alert('请先进入一个实验，再生成对比报告。'); return; }
  var meta = d.meta;

  var n = 0, parts = [];
  function S(title, body) {
    n++;
    parts.push('<div class="section">\n  <h2>' + n + '. ' + title + '</h2>\n' + body + '</div>\n');
  }

  // ---- 1. 对比方案 ----
  var pRows = meta.params.map(function (p) {
    return [p.label + ' (' + p.unit + ')'].concat(d.params.map(function (pp) {
      return _cmpFmt(pp[p.key], 6);
    }));
  });
  S('对比方案',
    _threeLineTable(['参数', 'A 组', 'B 组', 'C 组'], pRows, ['40%', '20%', '20%', '20%']) +
    '<p class="note">三组除上表所列参数外，其余实验条件完全相同。表中为本次对比实际采用的取值。</p>');

  // ---- 2. 计算结果对比 ----
  var iRows = meta.indicators.map(function (ind) {
    var vals = d.results.map(function (r) { return r[ind.key]; });
    var rel = ['基准', '基准'];
    for (var i = 1; i < 3; i++) {
      var r = vals[i] / Math.max(Math.abs(vals[0]), 1e-30);
      var pct = (r - 1) * 100;
      rel[i - 1] = '<span style="color:' + (pct >= 0 ? '#2166AC' : '#D6604D') + ';">' +
        (pct >= 0 ? '+' : '') + _cmpFmt(pct, 2) + '%</span>';
    }
    return [ind.label].concat(vals.map(function (v) {
      return _cmpFmt(v, 6) + (ind.unit ? ' ' + ind.unit : '');
    })).concat(rel);
  });
  S('计算结果对比',
    _threeLineTable(['指标', 'A 组', 'B 组', 'C 组', 'B 相对 A', 'C 相对 A'],
      iRows, ['24%', '19%', '19%', '19%', '9.5%', '9.5%']) +
    '<p class="note">表中为把各组参数代入 ' + meta.law + ' 计算所得的理论值。</p>');

  // ---- 3. 对比图像 ----
  var barCharts = meta.indicators.map(function (ind, idx) {
    return {
      id: 'cmpbar-' + idx,
      title: ind.label + (ind.unit ? ' (' + ind.unit + ')' : ''),
      data: d.groups.map(function (k, i) { return { name: k, value: d.results[i][ind.key] }; })
    };
  });

  var figHtml = '';
  var canvas = document.getElementById('compare-canvas');
  if (canvas) {
    var shot = '';
    try { shot = canvas.toDataURL('image/png'); } catch (e) { shot = ''; }
    if (shot) {
      figHtml += '<div class="cmp-shot-wrap"><img class="cmp-shot" src="' + shot + '" alt="三组对比可视化"></div>\n';
    }
  }
  figHtml += '<div class="small-charts-row">\n' +
    barCharts.map(function (c) {
      return '<div class="small-chart"><div class="fig-inner" id="' + c.id + '"></div></div>';
    }).join('\n') + '\n</div>\n';

  // 若存在叠加曲线（斯托克斯等），一并附上
  var overlayShot = '';
  try {
    if (typeof compOverlayChart !== 'undefined' && compOverlayChart && compOverlayChart.getDataURL) {
      overlayShot = compOverlayChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    }
  } catch (e) { overlayShot = ''; }
  if (overlayShot) {
    figHtml += '<div class="cmp-shot-wrap"><img class="cmp-shot" src="' + overlayShot + '" alt="叠加曲线对比"></div>\n';
  }

  S('对比图像', figHtml +
    '<p class="note">上方为三组对比的实时可视化与各指标柱状对比；柱状图可单独保存。</p>');

  // ---- 4. 差异分析 ----
  S('差异分析', '<div class="analysis-content">' + _cmpAnalysis(d) + '</div>');

  // ---- 5. 结论 ----
  var best = 0, bestV = -Infinity;
  d.results.forEach(function (r, i) {
    var v = meta.indicators[0] ? r[meta.indicators[0].key] : 0;
    if (v > bestV) { bestV = v; best = i; }
  });
  S('结论',
    '<div class="analysis-content"><p>以首要指标「' + (meta.indicators[0] ? meta.indicators[0].label : '—') +
    '」衡量，<b>' + d.groups[best] + ' 组</b>的数值最大。三组的差异完全由本次改变的参数引起，' +
    '应先核对控制变量与模型适用条件，再解释各组差异。参考关系为 <b>' + meta.law + '</b>；' +
    '本报告来自教学模型，不能作为自然定律的独立实验验证。</p>' +
    '<p class="note">说明：本报告为对比实验报告，与「实验报告」中的仿真记录报告相互独立，不含学生操作记录。</p></div>');

  // ---- 组装并打开 ----
  var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
    '<title>' + meta.title + ' 对比实验报告</title>\n' +
    offlineLabPlotScript() +
    '<style>\n' +
    '@page { margin: 20mm; size: A4; }\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; padding: 30px 50px; line-height: 1.6; }\n' +
    '.report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }\n' +
    '.report-header h1 { font-size: 22px; font-weight: bold; margin-bottom: 6px; }\n' +
    '.report-header p { font-size: 14px; color: #333; }\n' +
    '.section { margin-bottom: 28px; }\n' +
    '.section h2 { font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #ccc; }\n' +
    '.small-charts-row { display: flex; gap: 12px; margin: 16px 0 8px; flex-wrap: wrap; }\n' +
    '.small-chart { flex: 1; min-width: 200px; height: 260px; }\n' +
    '.cmp-shot-wrap { margin: 12px 0; text-align: center; }\n' +
    '.cmp-shot { max-width: 100%; border: 1px solid #ddd; }\n' +
    '.tip-box { background: #f5f7fb; border-left: 3px solid #5b6abf; padding: 8px 12px; font-size: 12px; color: #444; margin: 8px 0; }\n' +
    '.note { font-size: 12px; color: #666; margin-top: 8px; }\n' +
    '.analysis-content { font-size: 14px; line-height: 1.9; text-align: justify; }\n' +
    '.analysis-content p { margin-bottom: 10px; text-indent: 2em; }\n' +
    '.analysis-content b { color: #2166AC; }\n' +
    '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }\n' +
    '.toolbar-wrap { display: flex; justify-content: space-between; align-items: flex-start; margin: 10px 0 20px; }\n' +
    '.toolbar-wrap button { padding: 6px 16px; border: 1px solid #999; border-radius: 3px; background: #f5f5f5; color: #333; cursor: pointer; font-size: 13px; }\n' +
    '.toolbar-right button { margin-left: 8px; }\n' +
    '.toolbar-wrap button:hover { background: #e0e0e0; }\n' +
    '.fig-inner { display: block; width: 100%; height: 100%; }\n' +
    '@media print {\n' +
    '  body { padding: 15px 25px; }\n' +
    '  .toolbar-wrap { display: none; }\n' +
    '  .report-header { break-after: avoid; page-break-after: avoid; }\n' +
    '  .section h2 { break-after: avoid; page-break-after: avoid; }\n' +
    '  .small-chart, .cmp-shot-wrap, table { break-inside: avoid; page-break-inside: avoid; }\n' +
    '  .small-chart { height: 230px; }\n' +
    '}\n' +
    '</style>\n</head>\n<body>\n' +
    '<div class="report-header">\n' +
    '  <h1>' + meta.title + ' — A / B / C 对比实验报告</h1>\n' +
    '  <p>控制变量对比 · 公式 ' + meta.law + '</p>\n' +
    '  <p class="note">生成时间: ' + new Date().toLocaleString('zh-CN') + '</p>\n' +
    '</div>\n' +
    '<div class="toolbar-wrap">\n' +
    '  <div class="toolbar-left"><button onclick="window.close()">✕ 关闭</button></div>\n' +
    '  <div class="toolbar-right">\n' +
    '    <button id="cmp-save-all"> 保存全部图像</button>\n' +
    '    <button id="cmp-pdf" title="调起浏览器打印，在目标处选择「另存为 PDF」"> 打印 / 导出 PDF</button>\n' +
    '  </div>\n' +
    '</div>\n' +
    parts.join('') +
    '<div class="footer">黏性现象仿真实验教学软件 · 对比实验报告</div>\n' +
    '<script>\n' +
    'var cmpBars = ' + JSON.stringify(barCharts) + ';\n' +
    'var cmpCharts = {};\n' +
    'cmpBars.forEach(function (c) {\n' +
    '  var dom = document.getElementById(c.id);\n' +
    '  if (!dom) return;\n' +
    '  var chart = LabPlot.create(dom);\n' +
    '  var vals = c.data.map(function (d) { return d.value; });\n' +
    '  var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);\n' +
    '  chart.setOption({\n' +
    '    backgroundColor: "#ffffff",\n' +
    '    title: { text: c.title, left: "center", top: 4,\n' +
    '      textStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 12, fontWeight: "bold", color: "#000" } },\n' +
    '    tooltip: { trigger: "axis", textStyle: { fontSize: 10 } },\n' +
    '    grid: { left: 62, right: 16, top: 44, bottom: 32 },\n' +
    '    xAxis: { type: "category", data: c.data.map(function (d) { return d.name + " 组"; }),\n' +
    '      axisLine: { lineStyle: { color: "#000", width: 1.2 } },\n' +
    '      axisLabel: { fontSize: 10, color: "#000" } },\n' +
    '    yAxis: { type: "value", scale: true, min: mn > 0 ? undefined : undefined,\n' +
    '      axisLine: { lineStyle: { color: "#000", width: 1.2 } },\n' +
    '      axisLabel: { fontSize: 9, color: "#000" }, splitLine: { show: false } },\n' +
    '    series: [{ type: "bar", data: c.data.map(function (d) { return d.value; }),\n' +
    '      barMaxWidth: 56, itemStyle: { color: "#2166AC" },\n' +
    '      label: { show: true, position: "top", fontSize: 9,\n' +
    '        formatter: function (p) { return (Math.abs(p.value) < 0.001 && p.value !== 0) ? p.value.toExponential(2) : Number(p.value).toPrecision(4); } } }],\n' +
    '    animation: false\n' +
    '  });\n' +
    '  cmpCharts[c.id] = chart;\n' +
    '});\n' +
    'window.addEventListener("resize", function () {\n' +
    '  Object.keys(cmpCharts).forEach(function (k) { try { cmpCharts[k].resize(); } catch (e) {} });\n' +
    '});\n' +
    'document.getElementById("cmp-pdf").addEventListener("click", function () { window.print(); });\n' +
    'document.getElementById("cmp-save-all").addEventListener("click", function () {\n' +
    '  var i = 0;\n' +
    '  Object.keys(cmpCharts).forEach(function (k) {\n' +
    '    i++;\n' +
    '    try {\n' +
    '      var url = cmpCharts[k].getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });\n' +
    '      var a = document.createElement("a");\n' +
    '      a.href = url; a.download = "对比图-" + i + ".png"; a.click();\n' +
    '    } catch (e) {}\n' +
    '  });\n' +
    '  Array.prototype.forEach.call(document.querySelectorAll(".cmp-shot"), function (img, k) {\n' +
    '    try {\n' +
    '      var a2 = document.createElement("a");\n' +
    '      a2.href = img.src; a2.download = "对比可视化-" + (k + 1) + ".png"; a2.click();\n' +
    '    } catch (e) {}\n' +
    '  });\n' +
    '});\n' +
    '<\/script>\n</body>\n</html>';

  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, '_blank');
  if (!win) {
    // 弹窗被拦截：改为下载文件
    var a = document.createElement('a');
    a.href = url;
    a.download = meta.title + '-对比实验报告.html';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  } else {
    var t = setInterval(function () {
      if (win.closed) { clearInterval(t); URL.revokeObjectURL(url); }
    }, 1000);
    setTimeout(function () {
      clearInterval(t);
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 300000);
  }
}
// 对比模式 — 核心函数


// 确定性扰动：基于参数比例，非随机
function detPerturb(v, ratio, pct) { return v * (1 + (ratio - 1) * pct / 100); }

// 对比模式物理函数（适配 compParams 参数结构）
function compNewtonPhysics(p) {
  var area = p.area || 0.01;
  var g = p.velocity / Math.max(p.spacing, 0.0001);
  var shear = p.viscosity * g;
  var F = shear * area;
  var etaRatio = p.viscosity / 0.001;
  var areaRatio = area / 0.01;
  return {shear:shear, shearSim:detPerturb(shear,etaRatio,2), gradient:g, gradientSim:detPerturb(g,etaRatio,1), umax:p.velocity, umaxSim:p.velocity, F:F, FSim:detPerturb(F, areaRatio, 1.5)};
}
function compPoiseuillePhysics(p) {
  var um = p.dp * p.radius * p.radius / (4 * p.viscosity * p.length);
  var Q = Math.PI * Math.pow(p.radius,4) * p.dp / (8 * p.viscosity * p.length);
  var ua = um / 2;
  var rho = p._rho || 1000;
  var Re = rho * ua * (2*p.radius) / Math.max(p.viscosity, 1e-9);
  var RRatio = p.radius / 0.002;
  return {umax:um, umaxSim:detPerturb(um,RRatio,0.5), Q:Q, QSim:detPerturb(Q,RRatio,0.8), uavg:ua, uavgSim:detPerturb(ua,RRatio,0.5), Re:Re, ReSim:Re};
}
function compStokesPhysics(p) {
  const q=PhysicsEngine.stokes(p.radius,p.rhop,p.rhof,p.viscosity,p.g==null?9.8:p.g);
  const fd=PhysicsEngine.stokesDrag(p.viscosity,p.radius,q.vt,p.rhof);
  return {vt:q.vt,vtSim:q.vt,Fd:fd,FdSim:fd,Re:q.Re,ReSim:q.Re,tau:q.tau,blended:q.blended,
    Fg:q.Fg-q.Fb,dragC:6*Math.PI*p.viscosity*p.radius,m:q.mass,V:q.volume,r:p.radius};
}

function getCM(c) {
  c = c || compCanvas;
  if (!c) return {w:0, h:0, topY:0, bottomY:0};
  var w = parseFloat(c.style.width) || c.clientWidth || 400;
  var h = parseFloat(c.style.height) || c.clientHeight || 150;
  return { w:w, h:h, topY:30, bottomY:h-30 };
}

// 安全设置值
function safeSetVal(id, v) {
  var el = document.getElementById(id);
  if (el) el.value = v;
}

// 警告闪烁
function showCompWarn(el) {
  el.classList.add('warn-flash');
  setTimeout(function(){ el.classList.remove('warn-flash'); }, 1500);
}

// 数据行写入（对比模式）
function compWriteDataVal(prefix, idx, val, unit, fmtFunc) {
  fmtFunc = fmtFunc || function(v){return v.toFixed(3);};
  var elId = prefix + idx + '-val';
  var el = document.getElementById(elId);
  if (el) el.textContent = fmtFunc(val) + ' ' + unit;
}

// 更新对比模式数据显示
function updateCompDataDisplay() {
  if(window.updateAllCompPresetDisplays) window.updateAllCompPresetDisplays();
  var exp = AppState.currentExperiment;
  if (!document.getElementById('comp_a_shear-val') && !document.getElementById('comp_a_umax-val') && !document.getElementById('comp_a_vt-val')) {
    return;
  }
  ['A','B','C'].forEach(function(k) {
    var pf = 'comp_' + k.toLowerCase() + '_';
    if (exp === 'newton') {
      var phy = compNewtonPhysics(compParams[k] || {});
      compWriteDataVal(pf, 'shear', phy.shear, 'Pa');
      compWriteDataVal(pf, 'grad', phy.gradient, 's⁻¹');
      compWriteDataVal(pf, 'F', phy.F||0, 'N');
    } else if (exp === 'poiseuille') {
      var phy = compPoiseuillePhysics(compParams[k] || {});
      compWriteDataVal(pf, 'umax', phy.umax, 'm/s', function(v){return v.toFixed(4);});
      compWriteDataVal(pf, 'flow', phy.Q, 'm³/s', function(v){return v.toExponential(4);});
      compWriteDataVal(pf, 'uavg', phy.uavg, 'm/s', function(v){return v.toFixed(4);});
    } else if (exp === 'stokes') {
      var phy = compStokesPhysics(compParams[k] || {});
      compWriteDataVal(pf, 'vt', phy.vt, 'm/s', function(v){return v.toFixed(5);});
      compWriteDataVal(pf, 'fd', phy.Fd, 'N', function(v){return v.toExponential(3);});
      compWriteDataVal(pf, 're', phy.Re, '', function(v){return v.toFixed(3);});
    }
  });
  checkCompReynoldsWarning();
}

function checkCompReynoldsWarning() {
  var exp = AppState.currentExperiment;
  var warnDiv = document.getElementById('comp-reynolds-warning');
  if (!warnDiv) return;
  var warnings = [];
  if (exp === 'poiseuille') {
    ['A','B','C'].forEach(function(k) {
      var phy = compPoiseuillePhysics(compParams[k] || {});
      if (phy.Re > 2000) {
        warnings.push('模拟 ' + k + ': 雷诺数 Re = ' + phy.Re.toFixed(0) + ' > 2000，不满足层流条件，泊肃叶定律不适用');
      }
    });
  } else if (exp === 'stokes') {
    ['A','B','C'].forEach(function(k) {
      var phy = compStokesPhysics(compParams[k] || {});
      if (phy.Re >= .1 || phy.blended) {
        warnings.push('模拟 ' + k + ': 雷诺数 Re = ' + phy.Re.toFixed(3) + '：采用惯性修正或模型平滑过渡，不可按纯 Stokes 公式解释');
      }
    });
  }
  if (warnings.length > 0) {
    warnDiv.innerHTML = '<div class="warning-message" style="background:var(--cmp-surface);border:1px solid #ffc107;border-radius:8px;padding:8px 14px;margin-bottom:4px;">' +
      '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1rem;"></span><span style="color:var(--cmp-text);font-weight:700;font-size:0.85rem;">请核对模型适用范围</span></div>' +
      warnings.map(function(w) { return '<div style="color:var(--cmp-text2);font-size:11px;margin-left:28px;margin-top:4px;">' + w + '</div>'; }).join('') +
      '</div>';
    warnDiv.style.display = 'block';
  } else {
    warnDiv.style.display = 'none';
  }
}

// 初始化对比参数
function initCompParamsForExp(exp) {
  if (exp === 'stokes') {
    var presets = _stokesCompPresets[stokesCompType] || _stokesCompPresets.radius;
    ['A','B','C'].forEach(function(k) {
      compParams[k] = {};
      var src = presets[k];
      for (var key in src) { if (src.hasOwnProperty(key)) compParams[k][key] = src[key]; }
    });
    return;
  }
  var defs = _compDefaults[exp] || _compDefaults.newton;
  ['A','B','C'].forEach(function(k, i) {
    compParams[k] = {};
    var src = defs[i] || defs[0];
    for (var key in src) { if (src.hasOwnProperty(key)) compParams[k][key] = src[key]; }
  });
}


// buildCompareUI — 构建对比模式DOM（不含3个独立图表）


// 对比模式 - 流体预设

window._compSelectedPresets = window._compSelectedPresets || { A: '水 (20°C)', B: '水 (20°C)', C: '水 (20°C)' };
window._compPresetExpanded = window._compPresetExpanded || { A: false, B: false, C: false };

window.toggleCompGroupPreset = function(group) {
  window._compPresetExpanded[group] = !window._compPresetExpanded[group];
  var panel = document.getElementById('comp-preset-panel-' + group);
  var arrow = document.getElementById('comp-preset-arrow-' + group);
  if (panel) {
    panel.style.display = window._compPresetExpanded[group] ? 'block' : 'none';
  }
  if (arrow) {
    arrow.style.transform = window._compPresetExpanded[group] ? 'rotate(180deg)' : 'rotate(0deg)';
  }
};

window.applyCompPresetToGroup = function(group, presetName) {
  var exp = AppState.currentExperiment;
  var fluid = window.FLUID_PRESETS ? window.FLUID_PRESETS[presetName] : FLUID_PRESETS[presetName];
  if (!fluid) return;
  if (exp === 'newton') {
    compParams[group].viscosity = fluid.mu;
  } else if (exp === 'poiseuille') {
    compParams[group].viscosity = fluid.mu;
    compParams[group]._rho = fluid.rho;
  } else if (exp === 'stokes') {
    compParams[group].viscosity = fluid.mu;
    compParams[group].rhof = fluid.rho;
  }
  window._compSelectedPresets[group] = presetName;
  syncCompSlidersToParams();
  updateCompDataDisplay();
  initCompParticlesForRegion(group);
  renderCompCanvas();
  updateAllCompPresetDisplays();
  // 关闭面板
  window._compPresetExpanded[group] = false;
  var panel = document.getElementById('comp-preset-panel-' + group);
  var arrow = document.getElementById('comp-preset-arrow-' + group);
  if (panel) panel.style.display = 'none';
  if (arrow) arrow.style.transform = 'rotate(0deg)';
};

window.updateAllCompPresetDisplays = function() {
  ['A','B','C'].forEach(function(g) {
    const p=compParams[g]||{}, exp=AppState.currentExperiment;
    const rho=exp==='poiseuille'?p._rho:exp==='stokes'?p.rhof:null;
    const name=Object.keys(FLUID_PRESETS).find(function(n){const f=FLUID_PRESETS[n]; return Math.abs(f.mu-p.viscosity)<1e-12&&(rho==null||Math.abs(f.rho-rho)<1e-9);})||'自定义流体';
    window._compSelectedPresets[g]=name;
    const display=document.getElementById('comp-preset-display-'+g);
    if(display) display.textContent=name;
  });
};

function syncCompSlidersToParams() {
  var exp = AppState.currentExperiment;
  var paramMap = {
    newton: [
      {id:'visc', key:'viscosity'},
      {id:'vel', key:'velocity'},
      {id:'spac', key:'spacing', scale:1000},
      {id:'area', key:'area'}
    ],
    poiseuille: [
      {id:'radius', key:'radius'},
      {id:'length', key:'length'},
      {id:'dp', key:'dp'},
      {id:'visc', key:'viscosity'}
    ],
    stokes: [
      {id:'radius', key:'radius'},
      {id:'visc', key:'viscosity'}
    ]
  };
  var defs = paramMap[exp] || paramMap.newton;
  ['A','B','C'].forEach(function(k) {
    var vals = compParams[k] || {}, kk = k.toLowerCase();
    defs.forEach(function(d) {
      var rawVal = vals[d.key] || 0;
      var sliderVal = d.scale ? rawVal * d.scale : rawVal;
      var slider = document.getElementById('c' + kk + '-' + d.id);
      var display = document.getElementById('c' + kk + '-' + d.id + '-val');
      if (slider) slider.value = sliderVal;
      if (display) display.textContent = formatCompParam(sliderVal);
    });
  });
}

/* 对比滑块的范围、步长和单位由 EXPERIMENTS 派生，避免预设值被不同范围截断。slot 为滑块 ID 后缀；null 表示无对应滑块，参数直接存于 compParams。 */
var COMP_SLOT = {
  newton: [
    { slot: 'visc', key: 'viscosity', pid: 'viscosity' },
    { slot: 'vel',  key: 'velocity',  pid: 'velocity' },
    { slot: 'spac', key: 'spacing',   pid: 'distance', scale: 1000 },
    { slot: 'area', key: 'area',      pid: 'area' }
  ],
  poiseuille: [
    { slot: 'radius', key: 'radius',    pid: 'radius' },
    { slot: 'length', key: 'length',    pid: 'length' },
    { slot: 'dp',     key: 'dp',        pid: 'pressure' },
    { slot: 'visc',   key: 'viscosity', pid: 'viscosity' },
    { slot: null,     key: '_rho',      pid: 'density' }
  ],
  stokes: [
    { slot: 'radius', key: 'radius',    pid: 'ballRadius' },
    { slot: 'visc',   key: 'viscosity', pid: 'viscosity' },
    { slot: null,     key: 'rhof',      pid: 'fluidDensity' },
    { slot: null,     key: 'rhop',      pid: 'ballDensity' }
  ]
};

function compSlots(exp) {
  var m = (typeof COMP_SLOT !== 'undefined') ? COMP_SLOT : (window.COMP_SLOT || null);
  if (!m) return [];
  try { return m[exp || AppState.currentExperiment] || m.newton || []; }
  catch (e) { return m.newton || []; }
}

/* 由实验定义派生对比滑块规格：min / max / step / 单位全跟着 EXPERIMENTS 走 */
// 对比参数只格式化显示，计算仍使用原始数值。
function formatCompParam(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  var rounded = Number(n.toPrecision(4));
  if (Math.abs(rounded) < 0.001 || Math.abs(rounded) >= 100000) {
    return formatScientific(rounded, 3);
  }
  return String(rounded);
}

function compSliderDefs(exp) {
  var E = (typeof EXPERIMENTS !== 'undefined') ? EXPERIMENTS : (window.EXPERIMENTS || {});
  var ps = ((E[exp] || E.newton || {}).params) || [];
  return compSlots(exp).filter(function (s) { return !!s.slot; }).map(function (s) {
    var p = null;
    ps.forEach(function (x) { if (x.id === s.pid) p = x; });
    p = p || { min: 0, max: 1, step: 0.01, unit: '', symbol: s.slot, name: s.pid };
    return {
      id: s.slot, key: s.key, label: p.symbol || s.slot,
      min: String(p.min), max: String(p.max), step: String(p.step),
      unit: p.unit || '', name: p.name || s.pid, scale: s.scale || 1
    };
  });
}

function buildCompareUI() {
  if (compBuilt) return;
  var container = document.getElementById('compare-container');
  if (!container) return;
  container.innerHTML = '';
  var exp = AppState.currentExperiment;
  var colors = {A:'a', B:'b', C:'c'};

  // 滑块规格由 EXPERIMENTS 派生（见 compSliderDefs），不再硬编码
  var dataDefs = {
    newton: [{id:'shear', label:'τ'}, {id:'grad', label:'du/dy'}, {id:'F', label:'F'}],
    poiseuille: [{id:'umax', label:'u_max'}, {id:'flow', label:'Q'}, {id:'uavg', label:'u_avg'}],
    stokes: [{id:'vt', label:'v_t'}, {id:'fd', label:'F_d'}, {id:'re', label:'Re'}]
  };
  var labels = {newton:'牛顿黏性定律', poiseuille:'泊肃叶定律', stokes:'斯托克斯定律'};

  var html = '';

  // 顶部工具栏：标题 + 退出按钮
  html += '<div class="card compare-toolbar-card" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:8px 14px;border-radius:8px;">' +
    '<span style="font-size:1.05rem;font-weight:700;color:var(--cmp-accent, #00d4ff);">' + labels[exp] + ' — 三组参数对比</span>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button id="compPlayPauseBtn" onclick="toggleCompAnim()" style="padding:5px 14px;border:1px solid #00e676;border-radius:6px;background:#00e676;color:#fff;cursor:pointer;font-size:0.82rem;font-family:inherit;">开始</button>' +
      '<button onclick="resetCompAnimFull()" style="padding:5px 14px;border:1px solid #ff4d4d;border-radius:6px;background:#ff4d4d;color:#fff;cursor:pointer;font-size:0.82rem;font-family:inherit;">重置</button>' +
      '<button onclick="generateCompareReport()" style="padding:5px 14px;border:1px solid #00a8cc;border-radius:6px;background:#00a8cc;color:#fff;cursor:pointer;font-size:0.82rem;font-family:inherit;"> 生成对比报告</button>' +
      '<button onclick="toggleCompareMode()" style="padding:5px 14px;border:1px solid rgba(0,212,255,0.4);border-radius:6px;background:rgba(0,212,255,0.1);color:#00d4ff;cursor:pointer;font-size:0.82rem;font-family:inherit;" onmouseover="this.style.background=\'rgba(0,212,255,0.25)\';" onmouseout="this.style.background=\'rgba(0,212,255,0.1)\';">← 返回</button>' +
    '</div>' +
    '</div>';

  // 雷诺数警告区域
  html += '<div id="comp-reynolds-warning" style="display:none;margin-bottom:4px;"></div>';

  // Canvas 动画区域
  var canvasH = (exp === 'stokes') ? 280 : 300;
  if (window.innerWidth < 768) canvasH = Math.max(160, window.innerWidth * 0.45);
  var canvasLabel = (exp === 'stokes') ? '沉降对比 — 竖直标尺 + 三球同时释放 (左:A 中:B 右:C)' : '流动粒子对比（左:A 中:B 右:C）';
  html += '<div class="card compare-stage-card"><div style="margin-bottom:6px;font-size:0.82rem;color:var(--cmp-text2, #6c757d);">' + canvasLabel + '</div><canvas id="compare-canvas" style="width:100%;height:' + canvasH + 'px;border-radius:8px;display:block;"></canvas></div>';

  // 流体预设面板（放在动画和参数之间）
  var presetNames = Object.keys(FLUID_PRESETS);
  window.FLUID_PRESETS = FLUID_PRESETS;
  html += '<div class="card compare-presets-card" style="margin-bottom:8px;margin-top:4px;">' +
    '<div style="font-size:0.85rem;color:var(--cmp-accent, #00d4ff);margin-bottom:8px;font-weight:600;">流体预设</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
  ['A','B','C'].forEach(function(g) {
    var selectedName = window._compSelectedPresets[g] || '水 (20°C)';
    html += '<div style="background:var(--cmp-surface);border:1px solid var(--cmp-border);border-radius:8px;padding:8px;">' +
      '<div style="font-size:0.78rem;color:var(--cmp-accent, #00d4ff);font-weight:600;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="window.toggleCompGroupPreset(\'' + g + '\')">' +
        '<span>' + g + '组预设</span>' +
        '<span id="comp-preset-display-' + g + '" style="font-size:0.7rem;color:var(--cmp-text2);">' + selectedName + '</span>' +
        '<span id="comp-preset-arrow-' + g + '" style="font-size:0.65rem;transition:transform 0.3s;">▼</span>' +
      '</div>' +
      '<div id="comp-preset-panel-' + g + '" style="display:none;max-height:160px;overflow-y:auto;">';
    presetNames.forEach(function(name) {
      html += '<button class="preset-btn" style="width:100%;margin:1px 0;padding:3px 6px;font-size:0.68rem;text-align:left;" onclick="window.applyCompPresetToGroup(\'' + g + '\',\'' + name.replace(/'/g, "\\'") + '\')">' + name + '</button>';
    });
    html += '</div></div>';
  });
  html += '</div></div>';

  // 参数区
  var defs = compSliderDefs(exp);
  html += '<div class="compare-row">';
  ['A','B','C'].forEach(function(k) {
    var vals = compParams[k] || {}, kk = k.toLowerCase();
    html += '<div class="compare-col"><div class="card compare-params"><div class="compare-section-title ' + colors[k] + '">模拟 ' + k + ' 参数</div>';
    defs.forEach(function(d) {
      var rawVal = vals[d.key] || 0;
      var sliderVal = rawVal * (d.scale || 1);
      var displayVal = formatCompParam(sliderVal);
      html += '<div class="param-row"><label>' + d.label + '</label><input type="range" id="c' + kk + '-' + d.id + '" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + sliderVal + '"><span class="param-value" id="c' + kk + '-' + d.id + '-val">' + displayVal + '</span><span class="unit">' + d.unit + '</span></div>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  // Stokes: v-t 图在参数栏下方
  if (exp === 'stokes') {
    var vtH = window.innerWidth < 768 ? Math.max(180, window.innerWidth * 0.5) : 260;
    html += '<div class="card compare-vt-card" style="margin-bottom:4px;margin-top:4px;"><div style="font-size:0.82rem;color:var(--cmp-accent, #00d4ff);margin-bottom:4px;">实时 v-t 曲线叠加对比</div><div id="comp-overlay-vt" style="width:100%;height:' + vtH + 'px;border-radius:8px;"></div></div>';
  }

  // 实时数据对比表格
  var metricDefs = {
    newton: [
      {id:'shear', label:'剪切应力 τ', unit:'Pa', fmt:function(v){return v.toFixed(3);}},
      {id:'grad', label:'速度梯度 du/dy', unit:'s⁻¹', fmt:function(v){return v.toFixed(3);}},
      {id:'F', label:'内摩擦力 F', unit:'N', fmt:function(v){return v.toFixed(3);}}
    ],
    poiseuille: [
      {id:'umax', label:'最大流速 <i>u</i><sub>max</sub>', unit:'m/s', fmt:function(v){return v.toFixed(4);}},
      {id:'flow', label:'体积流量 Q', unit:'m³/s', fmt:function(v){return v.toExponential(4);}},
      {id:'uavg', label:'平均流速 <i>u</i><sub>avg</sub>', unit:'m/s', fmt:function(v){return v.toFixed(4);}}
    ],
    stokes: [
      {id:'vt', label:'终端速度 <i>v</i><sub>t</sub>', unit:'m/s', fmt:function(v){return v.toFixed(5);}},
      {id:'fd', label:'粘滞阻力 <i>F</i><sub>d</sub>', unit:'N', fmt:function(v){return v.toExponential(3);}},
      {id:'re', label:'雷诺数 Re', unit:'', fmt:function(v){return v.toFixed(3);}}
    ]
  };
  var metrics = metricDefs[exp] || metricDefs.newton;
  html += '<div class="card compare-data-card" style="margin-top:8px;">' +
    '<div style="font-size:0.85rem;color:var(--cmp-accent, #00d4ff);margin-bottom:10px;font-weight:600;">实时数据对比</div>' +
    '<table class="compare-data-table" style="width:100%;border-collapse:collapse;font-size:0.78rem;">' +
    '<thead><tr>' +
    '<th style="text-align:left;padding:6px 8px;color:#8899bb;border-bottom:2px solid rgba(0,212,255,0.3);">物理量</th>';
  ['A','B','C'].forEach(function(k) {
    html += '<th style="text-align:center;padding:6px 8px;color:' + ({A:'#00d4ff',B:'#ff9800',C:'#7b61ff'}[k]) + ';border-bottom:2px solid rgba(0,212,255,0.3);">' + k + '组</th>';
  });
  html += '</tr></thead><tbody>';
  metrics.forEach(function(m) {
    html += '<tr>';
    html += '<td class="metric" style="padding:5px 8px;border-bottom:1px solid var(--cmp-border);">' + m.label + '</td>';
    ['A','B','C'].forEach(function(k) {
      var kk = k.toLowerCase();
      html += '<td id="comp_' + kk + '_' + m.id + '-val" style="text-align:center;padding:5px 8px;font-family:Consolas,Monaco,monospace;border-bottom:1px solid var(--cmp-border);">--</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  container.innerHTML = html;
  bindCompareParamHandlers();
  compBuilt = true;
  compBuiltExp = AppState.currentExperiment;
}

function destroyCompareUI() {
  if (compOverlayChart) { try { compOverlayChart.dispose(); } catch(e) {} compOverlayChart = null; }
  compParticles = null;
  stokesCompBalls = null;
  _compBound = {};
  var container = document.getElementById('compare-container');
  if (container) container.innerHTML = '';
  compBuilt = false;
  compBuiltExp = null;
}

/* 切换实验后重建对比界面和参数，避免沿用上个实验的字段。 */
function compNeedsRebuild() {
  try {
    if (!AppState.compareMode) return false;
    if (compBuiltExp !== AppState.currentExperiment) return true;
    /* 页面重渲染可能先更新界面，因此还需核对 compParams 的必需字段。 */
    var slots = (typeof COMP_SLOT !== 'undefined' ? COMP_SLOT : {})[AppState.currentExperiment] || [];
    var p = (typeof compParams !== 'undefined' && compParams) ? compParams.A : null;
    if (!p) return true;
    for (var i = 0; i < slots.length; i++) {
      var v = p[slots[i].key];
      if (v === undefined || v === null || (typeof v === 'number' && !isFinite(v))) return true;
    }
    return false;
  } catch (e) { return false; }
}

function compRebuildForExp() {
  try {
    if (AppState.currentSubPage !== 'lineSim' && typeof Navigation !== 'undefined' &&
        typeof Navigation.switchSubPage === 'function') {
      Navigation.switchSubPage('lineSim');
    }
    initCompParamsForExp(AppState.currentExperiment);
    destroyCompareUI();
    buildCompareUI();
    setTimeout(function () {
      try {
        resizeCompCanvas();
        initCompParticles();
        renderCompCanvas();
        updateCompDataDisplay();
        if (AppState.currentExperiment === 'stokes') { initCompOverlayChart(); updateCompOverlayChart(); }
      } catch (e2) {}
    }, 250);
  } catch (e) {
    console.warn('[Compare] 重建对比界面失败', e);
  }
}

// 绑定对比模式参数事件
function bindCompareParamHandlers() {
  var exp = AppState.currentExperiment;
  var mapping = {
    newton: [['visc','viscosity'],['vel','velocity'],['spac','spacing'],['area','area']],
    poiseuille: [['radius','radius'],['length','length'],['dp','dp'],['visc','viscosity']],
    stokes: [['radius','radius'],['visc','viscosity']]
  };
  var pairs = mapping[exp] || mapping.newton;
  ['A','B','C'].forEach(function(k) {
    var kk = k.toLowerCase();
    pairs.forEach(function(p) {
      bindCompSN('c' + kk + '-' + p[0], 'c' + kk + '-' + p[0] + '-val', k, p[1]);
    });
  });
}

function bindCompSN(sId, valId, simKey, key) {
  var uid = sId;
  if (_compBound[uid]) return;
  _compBound[uid] = true;

  var slider = document.getElementById(sId);
  var valSpan = document.getElementById(valId);
  if (!slider) return;

  slider.addEventListener('input', function() {
    var v = parseFloat(slider.value);
    // spacing: slider存mm, compParams存m
    var storeVal = (key === 'spacing') ? v / 1000 : v;
    if (valSpan) valSpan.textContent = formatCompParam(v);
    // A/B/C各自独立：只更新当前模拟区域的参数
    compParams[simKey][key] = storeVal;
    updateCompDataDisplay();
    // 所有参数变化都重绘canvas；area变化时只重置当前区域粒子
    if (key === 'area') { initCompParticlesForRegion(simKey); }
    renderCompCanvas();
  });
}

// Stokes 对比类型切换
function switchStokesCompType(type) {
  if (AppState.currentExperiment !== 'stokes') return;
  stokesCompType = type;
  var presets = _stokesCompPresets[type];
  if (presets) {
    ['A','B','C'].forEach(function(k) {
      var p = presets[k];
      for (var key in p) { if (p.hasOwnProperty(key)) compParams[k][key] = p[key]; }
    });
  }
  syncCompStokesDOM();
  destroyCompareUI();
  buildCompareUI();
  setTimeout(function() {
    resizeCompCanvas();
    initCompParticles();
    renderCompCanvas();
    updateCompDataDisplay();
    if (AppState.currentExperiment === 'stokes') { initCompOverlayChart(); updateCompOverlayChart(); }
  }, 120);
}

function syncCompStokesDOM() {
  ['A','B','C'].forEach(function(k) {
    var kk = k.toLowerCase();
    var p = compParams[k];
    ['radius','viscosity'].forEach(function(key) {
      var idMap = {radius:'c' + kk + '-radius', viscosity:'c' + kk + '-visc'};
      var sId = idMap[key], valId = sId + '-val';
      safeSetVal(sId, p[key]);
      var span = document.getElementById(valId);
      if (span) span.textContent = p[key];
    });
  });
}


// 对比模式 Canvas

function resizeCompCanvas() {
  compCanvas = document.getElementById('compare-canvas');
  if (!compCanvas) return;
  compCtx = compCanvas.getContext('2d');
  var card = compCanvas.parentElement;
  if (!card) return;
  var w = Math.max(card.clientWidth - 40, 100);
  var h = parseFloat(compCanvas.style.height) || compCanvas.offsetHeight || 200;
  var dpr = window.devicePixelRatio || 1;
  compCanvas.width = w * dpr;
  compCanvas.height = h * dpr;
  compCanvas.style.width = w + 'px';
  compCanvas.style.height = h + 'px';
  compCtx.setTransform(1, 0, 0, 1, 0, 0);
  compCtx.scale(dpr, dpr);
  // Layout changes preserve every group’s physical state and recorded history.
}

function initCompParticles() {
  if (!compCanvas) return;
  var cm = getCM(compCanvas);
  if (!cm || cm.w <= 0) return;
  if (AppState.currentExperiment === 'stokes') {
    stokesCompBalls = {};
    var topY = cm.topY + 20;
    ['A','B','C'].forEach(function(k) {
      stokesCompBalls[k] = { y: topY, v: 0, trail: [], vtHist: [], startY: topY, time: 0, displacement: 0 };
    });
    compParticles = { A:[], B:[], C:[] };
    // 重置黏度调节标记
    _compViscAdjusted = { A: false, B: false, C: false };
    return;
  }
  compParticles = { A:[], B:[], C:[] };
  // 重置黏度调节标记
  _compViscAdjusted = { A: false, B: false, C: false };
  var zW = Math.max(cm.w / 3, 50);
  ['A','B','C'].forEach(function(k) {
    var count = 80;
    if (AppState.currentExperiment === 'newton') {
      var a = (compParams[k] && compParams[k].area) || 0.01;
      count = Math.max(30, Math.min(150, Math.round(a / 0.001 * 1.5)));
    } else if (AppState.currentExperiment === 'poiseuille') {
      count = 100;
    }
    for (var i = 0; i < count; i++) compParticles[k].push({ x: Math.random() * zW, trail: [] });
  });
}

// 只重置指定区域的粒子（不影响其他区域）
function initCompParticlesForRegion(simKey) {
  if (!compCanvas) return;
  var cm = getCM(compCanvas);
  if (!cm || cm.w <= 0) return;
  if (AppState.currentExperiment === 'stokes') {
    var topY = cm.topY + 20;
    stokesCompBalls[simKey] = { y: topY, v: 0, trail: [], vtHist: [], startY: topY, time: 0, displacement: 0 };
    return;
  }
  var zW = Math.max(cm.w / 3, 50);
  compParticles[simKey] = [];
  var count = 80;
  if (AppState.currentExperiment === 'newton') {
    var a = (compParams[simKey] && compParams[simKey].area) || 0.01;
    count = Math.max(30, Math.min(150, Math.round(a / 0.001 * 1.5)));
  } else if (AppState.currentExperiment === 'poiseuille') {
    count = 100;
  }
  for (var i = 0; i < count; i++) compParticles[simKey].push({ x: Math.random() * zW, trail: [] });
}

function updateCompParticles(dt) {
  if (!compParticles || !compCanvas) return;
  var cm = getCM(compCanvas);
  if (!cm || cm.w <= 0) return;
  var zW = Math.max(cm.w / 3, 50);
  var exp = AppState.currentExperiment;
  ['A','B','C'].forEach(function(k) {
    if (!compParticles[k]) return;
    var p = compParams[k]; if (!p) return;
    if (exp === 'newton') {
      var U = p.velocity || 0, spacing = p.spacing || 0.05, visc = p.viscosity || 0.001;
      var spacingFactor = Math.max(spacing, 0.01) / 0.05;
      var speedScale = zW * 0.8 / spacingFactor;
      // 拖尾：粘度越大拖尾越长，反映内摩擦力大小
      // 拖尾长度与粘度成正比（粘度0.001→5点，粘度2→25点）
      var maxTrailLen = Math.floor(5 + visc * 10);
      _compPrevParams[k] = { velocity: U, visc: visc };
      compParticles[k].forEach(function(pt, i) {
        var yn = (i + 0.5) / Math.max(compParticles[k].length, 1);
        var speed = U * yn * speedScale;
        pt.x += speed * dt;
        if (pt.x > zW + 10) { pt.x = -10; pt.trail = []; }
        pt.trail.push({ x: pt.x });
        if (pt.trail.length > maxTrailLen) pt.trail.shift();
      });
    } else if (exp === 'poiseuille') {
      var R = p.radius || 0.002, L = p.length || 1, dp = p.dp || 1000, mu = p.viscosity || 0.001;
      var umax = dp * R * R / (4 * Math.max(mu, 0.00001) * L);
      var scl = Math.min(zW * 2.5, 500);
      // 拖尾优化：只有μ改变后才显示拖尾，其他参数变化不记录拖尾
      var prevP = _compPrevParams[k] || {};
      var muChanged = (prevP.viscosity !== undefined && prevP.viscosity !== mu);
      var otherChanged = (!muChanged && (
        (prevP.radius !== undefined && prevP.radius !== R) ||
        (prevP.length !== undefined && prevP.length !== L) ||
        (prevP.dp !== undefined && prevP.dp !== dp)
      ));
      // 如果黏度被调节过，标记该组已调节
      if (muChanged) {
        _compViscAdjusted[k] = true;
      }
      _compPrevParams[k] = { radius: R, length: L, dp: dp, viscosity: mu };
      // 动态拖尾长度：粘度越大拖尾越长 (20~60)
      var maxTrailLen = Math.floor(20 + (mu / 2.0) * 40);
      // 只有黏度被调节过后才显示拖尾
      var enableTrail = _compViscAdjusted[k] === true;
      if (otherChanged) {
        enableTrail = false;
        compParticles[k].forEach(function(pt) { pt.trail = []; });
      }
      compParticles[k].forEach(function(pt, i) {
        var yn = (i + 0.5) / Math.max(compParticles[k].length, 1);
        var rf = Math.abs(yn - 0.5) * 2;
        var visualUmax = Math.pow(Math.max(1e-8, umax), 0.3);
        var speed = visualUmax * (1 - rf * rf);
        pt.x += Math.max(0, speed) * scl * dt;
        if (pt.x > zW + 10) { pt.x = -10; if (enableTrail) pt.trail = []; }
        if (enableTrail) {
          pt.trail.push({ x: pt.x });
          if (pt.trail.length > maxTrailLen) pt.trail.shift();
        }
      });
    } else if (exp === 'stokes') {
      if (!stokesCompBalls || !stokesCompBalls[k]) return;
      var ball = stokesCompBalls[k];
      var phy = compStokesPhysics(p);
      if(!ball.motion) ball.motion=newSphereMotion(p.radius,p.rhop,p.rhof,p.viscosity,.5,1);
      advanceBoundedSphere(ball.motion,dt*.5,p.radius,p.rhop,p.rhof,p.viscosity);
      ball.v=ball.motion.v; ball.time=ball.motion.time;
      ball.y=cm.topY+28+(cm.bottomY-cm.topY-46)*ball.motion.x/.5;
      ball.displacement=ball.motion.x-ball.motion.origin;
      ball.trail.push({ y: ball.y, fraction: ball.motion.x / .5 });
      if (ball.trail.length > 60) ball.trail.shift();
      ball.vtHist.push({ t: ball.time, v: ball.v });
      if (ball.vtHist.length > 300) ball.vtHist.shift();
    }
  });
}

function renderCompCanvas() {
  if (!compCanvas || !compCtx) return;
  var cm = getCM(compCanvas);
  if (!cm || cm.w <= 0) return;
  var w = cm.w, topY = cm.topY + 8, bottomY = cm.bottomY - 8;
  var zW = Math.max(w / 3, 50), flowH = Math.max(bottomY - topY, 20);
  var colors = { A: '#00d4ff', B: '#ff9800', C: '#7b61ff' };
  compCtx.clearRect(0, 0, w, cm.h);

  if (AppState.currentExperiment === 'stokes') {
    // Stokes 对比：竖直标尺 + 三球下落
    var barW = 28;
    var scaleTop = topY + 20, scaleBottom = bottomY - 10;
    var pxScaleM = (scaleBottom - scaleTop) / 0.5;

    // 水平标尺线
    compCtx.strokeStyle = 'rgba(128,128,128,0.15)'; compCtx.lineWidth = 0.5;
    for (var gy = scaleTop; gy <= scaleBottom; gy += 25) {
      compCtx.beginPath(); compCtx.moveTo(barW + 4, gy); compCtx.lineTo(w - 4, gy); compCtx.stroke();
    }
    for (var gy2 = scaleTop; gy2 <= scaleBottom; gy2 += 50) {
      compCtx.strokeStyle = 'rgba(128,128,128,0.25)'; compCtx.lineWidth = 1;
      compCtx.beginPath(); compCtx.moveTo(barW + 4, gy2); compCtx.lineTo(w - 4, gy2); compCtx.stroke();
      var distM = (gy2 - scaleTop) / pxScaleM;
      compCtx.fillStyle = 'rgba(128,128,128,0.5)'; compCtx.font = '12px "Times New Roman","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
      compCtx.fillText(distM.toFixed(2) + 'm', barW + 8, gy2 - 3);
    }

    ['A','B','C'].forEach(function(k, zi) {
      var ox = barW + zi * Math.max((w - barW) / 3, 60);
      var colW = Math.max((w - barW) / 3, 60);
      if (zi > 0) {
        compCtx.strokeStyle = 'rgba(128,128,128,0.15)'; compCtx.lineWidth = 1;
        compCtx.beginPath(); compCtx.moveTo(ox, topY); compCtx.lineTo(ox, bottomY); compCtx.stroke();
      }
      // 列标签
      compCtx.fillStyle = colors[k]; compCtx.font = 'bold 15px "Times New Roman","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
      compCtx.fillText(k, ox + colW / 2 - 6, topY - 2);
      // 参数标签
      var cp = compParams[k] || {};
      var paramLabel = stokesCompType === 'radius' ? 'r=' + (cp.radius||0).toFixed(3) + 'm' : 'μ=' + (cp.viscosity||0).toFixed(3);
      compCtx.fillStyle = colors[k]; compCtx.font = '13px "Times New Roman","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
      compCtx.fillText(paramLabel, ox + colW / 2 - 20, topY + 12);

      if (!stokesCompBalls || !stokesCompBalls[k]) return;
      var ball = stokesCompBalls[k];
      if(!ball.motion) ball.motion=newSphereMotion(cp.radius,cp.rhop,cp.rhof,cp.viscosity,.5,1);
      ball.y=scaleTop+(scaleBottom-scaleTop)*ball.motion.x/.5;
      var bx = ox + colW / 2, by = ball.y;
      var sr = Math.min(6 + (cp.radius||0.001) * 1500, 28);

      // 尾迹
      if (ball.trail) {
        for (var ti = 0; ti < ball.trail.length; ti++) {
          var t = ball.trail[ti];
          var alpha = ti / Math.max(ball.trail.length, 1) * 0.5;
          var trailR = 1.5 + ti / Math.max(ball.trail.length, 1) * 3;
          compCtx.fillStyle = colors[k].replace(')', ', ' + alpha + ')').replace('rgb', 'rgba');
          if (colors[k].startsWith('#')) {
            var hex = colors[k].replace('#', '');
            var ri = parseInt(hex.substring(0,2), 16), gi = parseInt(hex.substring(2,4), 16), bi = parseInt(hex.substring(4,6), 16);
            compCtx.fillStyle = 'rgba(' + ri + ',' + gi + ',' + bi + ',' + alpha + ')';
          }
          compCtx.beginPath(); compCtx.arc(bx, Number.isFinite(t.fraction)?scaleTop+(scaleBottom-scaleTop)*t.fraction:t.y, trailR, 0, Math.PI * 2); compCtx.fill();
        }
      }

      // 球体阴影
      compCtx.fillStyle = 'rgba(0,0,0,0.25)'; compCtx.beginPath(); compCtx.arc(bx + 1, by + 1, sr, 0, Math.PI * 2); compCtx.fill();
      // 球体3D渐变（坐标/半径非有限值时 createRadialGradient 会抛错，先挡掉）
      if (isFinite(bx) && isFinite(by) && isFinite(sr) && sr > 0) {
        var sGrad = compCtx.createRadialGradient(bx - sr*0.25, by - sr*0.3, sr*0.05, bx, by, sr);
        sGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        sGrad.addColorStop(0.25, colors[k]);
        sGrad.addColorStop(0.7, 'rgba(0,40,120,0.85)');
        sGrad.addColorStop(1, 'rgba(0,15,60,0.9)');
        compCtx.fillStyle = sGrad; compCtx.beginPath(); compCtx.arc(bx, by, sr, 0, Math.PI * 2); compCtx.fill();
        compCtx.strokeStyle = colors[k]; compCtx.lineWidth = 2; compCtx.stroke();
      }

      // 终端速度标签（主要显示）
      var phy = compStokesPhysics(cp);
      compCtx.fillStyle = '#fff'; compCtx.font = 'bold 13px "Times New Roman","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
      compCtx.fillText('v_t=' + phy.vt.toFixed(4), ox + 4, bottomY - 4);
      // 瞬时速度（次要显示）
      compCtx.fillStyle = '#8899bb'; compCtx.font = '13px "Times New Roman","SourceHanSerifEmbedded","Noto Serif SC",SimSun,serif';
      compCtx.fillText('v=' + ball.v.toFixed(3), ox + 4, bottomY + 14);

      // 位移条
      var dispPx = (ball.displacement || 0) * pxScaleM;
      var barX = 2 + zi * 10;
      var barMaxH = scaleBottom - scaleTop;
      var barH = Math.min(dispPx, barMaxH);
      compCtx.fillStyle = 'rgba(255,255,255,0.05)';
      compCtx.fillRect(barX, scaleTop, 8, barMaxH);
      var barGrad = compCtx.createLinearGradient(0, scaleTop, 0, scaleBottom);
      barGrad.addColorStop(0, colors[k]); barGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      compCtx.fillStyle = barGrad;
      compCtx.fillRect(barX, scaleBottom - barH, 8, barH);
      compCtx.strokeStyle = 'rgba(255,255,255,0.2)'; compCtx.lineWidth = 0.5;
      compCtx.strokeRect(barX, scaleTop, 8, barMaxH);
      var dispLabel = (ball.displacement || 0).toFixed(3);
      compCtx.fillStyle = colors[k]; compCtx.font = 'bold 8px "Consolas","Monaco",monospace';
      compCtx.fillText(dispLabel, barX - 2, Math.max(scaleBottom - barH + 12, scaleTop + 12));
    });

    // 时间显示
    if (stokesCompBalls && stokesCompBalls.A) {
      var tA = stokesCompBalls.A.time || 0;
      compCtx.fillStyle = 'rgba(255,255,255,0.7)'; compCtx.font = 'bold 11px "Consolas","Monaco",monospace';
      compCtx.fillText('t=' + tA.toFixed(2) + 's', w - 80, topY - 4);
    }
    return;
  }

  // Newton / Poiseuille：水平粒子漂移（带拖尾 + 标签）
  if (!compParticles) return;
  var isPoiseuille = (AppState.currentExperiment === 'poiseuille');
  var isNewton = (AppState.currentExperiment === 'newton');
  ['A','B','C'].forEach(function(k, zi) {
    if (!compParticles[k]) return;
    var ox = zi * zW;
    var cp = compParams[k] || {};

    // === 泊肃叶：绘制管道壁 ===
    if (isPoiseuille) {
      var pipeWallH = Math.max(4, flowH * 0.08);
      var pipeInnerTop = topY + pipeWallH;
      var pipeInnerBottom = bottomY - pipeWallH;
      var pipeInnerH = pipeInnerBottom - pipeInnerTop;

      // 管壁高度随R动态变化
      var Rvis = cp.radius || 0.002;
      var pipeRatio = Math.max(0.04, Math.min(0.2, Rvis / 0.005 * 0.08));
      var dynamicWallH = Math.max(4, flowH * pipeRatio);
      var innerTop = topY + dynamicWallH;
      var innerBot = bottomY - dynamicWallH;
      drawTopY = innerTop;
      drawBotY = innerBot;
      drawFlowH = innerBot - innerTop;
      [topY, bottomY - dynamicWallH].forEach(function(wy) {
        var wGrad = compCtx.createLinearGradient(0, wy, 0, wy + pipeWallH);
        wGrad.addColorStop(0, '#606878');
        wGrad.addColorStop(0.4, '#9098a8');
        wGrad.addColorStop(0.6, '#b0b8c8');
        wGrad.addColorStop(1, '#505868');
        compCtx.fillStyle = wGrad;
        compCtx.fillRect(ox, wy, zW, dynamicWallH);
        compCtx.strokeStyle = 'rgba(255,255,255,0.2)'; compCtx.lineWidth = 0.5;
        compCtx.strokeRect(ox, wy, zW, dynamicWallH);
      });

      // 流体区域（使用动态壁高）
      var fluidGrad = compCtx.createLinearGradient(0, innerBot, 0, innerTop);
      fluidGrad.addColorStop(0, 'rgba(0,15,45,0.5)');
      fluidGrad.addColorStop(0.5, 'rgba(0,40,100,0.5)');
      fluidGrad.addColorStop(1, 'rgba(0,15,45,0.5)');
      compCtx.fillStyle = fluidGrad;
      compCtx.fillRect(ox, innerTop, zW, drawFlowH);

      // 中心虚线
      var midY = innerTop + drawFlowH / 2;
      compCtx.strokeStyle = 'rgba(255,255,255,0.1)'; compCtx.lineWidth = 0.5;
      compCtx.setLineDash([6, 5]);
      compCtx.beginPath(); compCtx.moveTo(ox, midY); compCtx.lineTo(ox + zW, midY); compCtx.stroke();
      compCtx.setLineDash([]);

      // 映射半径 → 管道内高度
      var Rphys = cp.radius || 0.002;
    } else {
      // === 牛顿：间距可变的平行平板 ===
      var cpN = compParams[k] || {};
      var spacingMM = (cpN.spacing || 0.01) * 1000;
      // 1mm显示为25mm视觉效果: 偏移+24mm, 映射到50%-100%流道高度
      var effectiveMM = spacingMM + 24;
      var gapFrac = 0.5 + (Math.min(Math.max(effectiveMM, 25), 74) - 25) / 49 * 0.5;
      var gapH = flowH * gapFrac;
      var midY = topY + flowH / 2;
      var drawTopY = midY - gapH / 2;
      var drawBotY = midY + gapH / 2;
      var drawFlowH = gapH;
      var grad = compCtx.createLinearGradient(0, drawBotY, 0, drawTopY);
      grad.addColorStop(0, 'rgba(0,20,60,0.35)'); grad.addColorStop(0.5, 'rgba(0,40,100,0.35)'); grad.addColorStop(1, 'rgba(0,80,160,0.35)');
      compCtx.fillStyle = grad; compCtx.fillRect(ox, drawTopY, zW, drawFlowH);
    }

    // 分隔线
    if (zi > 0) { compCtx.strokeStyle = 'rgba(255,255,255,0.1)'; compCtx.lineWidth = 1; compCtx.beginPath(); compCtx.moveTo(ox, drawTopY); compCtx.lineTo(ox, drawBotY); compCtx.stroke(); }

    // 边界线
    compCtx.strokeStyle = isPoiseuille ? 'rgba(255,255,255,0.15)' : '#fff';
    compCtx.lineWidth = isPoiseuille ? 1 : 1.5;
    compCtx.beginPath(); compCtx.moveTo(ox + 4, drawBotY); compCtx.lineTo(ox + zW - 4, drawBotY); compCtx.stroke();
    compCtx.strokeStyle = colors[k]; compCtx.lineWidth = 1.5; compCtx.shadowColor = colors[k]; compCtx.shadowBlur = 5;
    compCtx.beginPath(); compCtx.moveTo(ox + 4, drawTopY); compCtx.lineTo(ox + zW - 4, drawTopY); compCtx.stroke(); compCtx.shadowBlur = 0;

    // 列标签
    compCtx.fillStyle = colors[k]; compCtx.font = 'bold 10px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif'; compCtx.fillText(k, ox + zW/2 - 5, drawTopY - 6);

    // 粒子（发光 + 拖尾）
    compParticles[k].forEach(function(p, i) {
      var yn = (i + 0.5) / Math.max(compParticles[k].length, 1);
      var py = drawBotY - yn * drawFlowH;
      var viscEff = isNewton ? Math.max(0.3, Math.min(2.0, 0.001 / Math.max((cp.viscosity || 0.001), 0.00001))) : 1.0;
      var g = Math.round(30 + yn * 225), b = Math.round(80 + yn * 175);
      var alpha = 0.35 + yn * 0.6 * viscEff, radius = 1.5 + yn * 3.0 * viscEff;

      // 拖尾（粒子后方渐隐小点）
      if (p.trail && p.trail.length > 1) {
        for (var ti = 0; ti < p.trail.length - 1; ti++) {
          var trailAlpha = ti / p.trail.length * 0.35;
          var trailR = radius * (0.3 + ti / p.trail.length * 0.7);
          compCtx.fillStyle = 'rgba(0,' + g + ',' + b + ',' + trailAlpha + ')';
          compCtx.beginPath();
          compCtx.arc(ox + p.trail[ti].x, py, trailR, 0, Math.PI * 2);
          compCtx.fill();
        }
      }

      // 主粒子发光
      compCtx.shadowColor = 'rgba(0,' + (g+40) + ',' + (b+30) + ',0.7)';
      compCtx.shadowBlur = 3 + yn * 6;
      compCtx.fillStyle = 'rgba(0,' + g + ',' + b + ',' + alpha + ')';
      compCtx.beginPath(); compCtx.arc(ox + p.x, py, radius, 0, Math.PI * 2); compCtx.fill();
      compCtx.shadowBlur = 0;
    });

    // 参数标签
    compCtx.fillStyle = colors[k]; compCtx.font = 'bold 7px Consolas,Monaco,monospace';
    var labelText = '';
    if (AppState.currentExperiment === 'newton') {
      labelText = 'u=' + (cp.velocity||0).toFixed(1) + ' η=' + (cp.viscosity||0).toFixed(3) + ' A=' + (cp.area||0).toFixed(3);
    } else if (AppState.currentExperiment === 'poiseuille') {
      labelText = 'R=' + (cp.radius||0).toFixed(4) + ' ΔP=' + (cp.dp||0).toFixed(0) + ' μ=' + (cp.viscosity||0).toFixed(3);
    }
    if (labelText) compCtx.fillText(labelText, ox + 4, drawBotY + 12);
  });
}


// Stokes 叠加 v-t 图（LabPlot）

function initCompOverlayChart() {
  if (AppState.currentExperiment !== 'stokes') return;
  var dom = document.getElementById('comp-overlay-vt');
  if (!dom || typeof LabPlot === 'undefined') return;
  if (compOverlayChart) { compOverlayChart.dispose(); compOverlayChart = null; }
  compOverlayChart = LabPlot.create(dom);
  compOverlayFrame = 0;
  compOverlayChart.setOption({
    backgroundColor: 'transparent', animation: false,
    title: { text: '三球速度：无边界模型参考与实时记录', left: 'center', top: 4, textStyle: { color: '#8899bb', fontSize: 10, fontWeight: 'normal' } },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#dde4f0', fontSize: 10 } },
    legend: { data: ['A 模型','A 实时','B 模型','B 实时','C 模型','C 实时'], bottom: 4, textStyle: { color: '#8899bb', fontSize: 8 } },
    grid: { left: 56, right: 20, top: 30, bottom: 34 },
    xAxis: { name: 't (s)', nameLocation: 'center', nameGap: 22, nameTextStyle: { color: '#8899bb', fontSize: 10 }, min: 0,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisLabel: { color: '#8899bb', fontSize: 9 } },
    yAxis: { name: 'v (m/s)', nameLocation: 'center', nameGap: 38, nameTextStyle: { color: '#8899bb', fontSize: 10 }, min: 0,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisLabel: { color: '#8899bb', fontSize: 9 } },
    series: []
  });
  updateCompOverlayChart();
}

function updateCompOverlayChart() {
  if (!compOverlayChart || !stokesCompBalls) return;
  compOverlayFrame++;
  if (compOverlayFrame % 5 !== 0) return;

  var colors = ['#00d4ff','#ff9800','#7b61ff'];
  var allData = {};
  var maxT = 0.5, maxV = 0.01;

  ['A','B','C'].forEach(function(k) {
    var ball = stokesCompBalls[k];
    if (!ball || !ball.vtHist) { allData[k] = []; return; }
    var pts = [];
    for (var i = 0; i < ball.vtHist.length; i++) {
      pts.push([ball.vtHist[i].t, ball.vtHist[i].v]);
      if (ball.vtHist[i].t > maxT) maxT = ball.vtHist[i].t;
      if (Math.abs(ball.vtHist[i].v) > maxV) maxV = Math.abs(ball.vtHist[i].v);
    }
    allData[k] = pts;
  });

  var allPhy = {};
  ['A','B','C'].forEach(function(k) {
    var phy = compStokesPhysics(compParams[k]);
    allPhy[k] = phy;
    if (phy.tau > 0.001 && 5 * phy.tau > maxT) maxT = 5 * phy.tau;
    if (Math.abs(phy.vt) * 1.2 > maxV) maxV = Math.abs(phy.vt) * 1.2;
  });

  maxT = Math.ceil(maxT * 10) / 10 + 0.1;
  maxV = Math.ceil(maxV * 1000) / 1000 * 1.15;

  var series = [];
  ['A','B','C'].forEach(function(k, idx) {
    var phy = allPhy[k];
    // 理论曲线（虚线）
    var tMax = Math.max(phy.tau > 0.001 ? 5 * phy.tau : 0.5, maxT);
    const p=compParams[k], b=stokesCompBalls[k], key=JSON.stringify([p,tMax]);
    if(!b.reference || b.reference.key!==key) b.reference={key,points:sphereReferenceCurve(p.radius,p.rhop,p.rhof,p.viscosity,tMax,100)};
    var theoPts=b.reference.points;
    series.push({
      name: k + ' 模型', type: 'line', data: theoPts, smooth: true, symbol: 'none',
      lineStyle: { color: colors[idx], width: 1.5, type: 'dashed', opacity: 0.5 }
    });
    // 实时数据
    series.push({
      name: k + ' 实时', type: 'line', data: allData[k], smooth: true, symbol: 'none',
      lineStyle: { color: colors[idx], width: 2.5 }
    });
    // 当前位置标记
    var ball = stokesCompBalls[k];
    if (ball && ball.time > 0) {
      series.push({
        name: k + ' 当前', type: 'scatter', data: [[ball.time, ball.v]], symbol: 'circle', symbolSize: 10,
        itemStyle: { color: colors[idx], borderColor: '#fff', borderWidth: 2 }
      });
    }
  });

  compOverlayChart.setOption({
    xAxis: { min: 0, max: maxT },
    yAxis: { min: -maxV, max: maxV },
    series: series
  }, { notMerge: false, replaceMerge: 'series' });
}


// 对比模式动画循环

function compAnimLoop(ts) {
  if (!_compAnimRunning) return;
  var dt = Math.min((ts - _compLastTime) / 1000, 0.1);
  _compLastTime = ts;
  updateCompParticles(dt);
  renderCompCanvas();
  if (AppState.currentExperiment === 'stokes') updateCompOverlayChart();
  _compAnimId = requestAnimationFrame(compAnimLoop);
}

function startCompAnim() {
  if (_compAnimRunning) return;
  _compAnimRunning = true;
  _compLastTime = performance.now();
  _compAnimId = requestAnimationFrame(compAnimLoop);
}

function pauseCompAnim() {
  _compAnimRunning = false;
  if (_compAnimId) { cancelAnimationFrame(_compAnimId); _compAnimId = null; }
}

function resetCompAnim() {
  var was = _compAnimRunning;
  pauseCompAnim();
  initCompParticles();
  renderCompCanvas();
  if (AppState.currentExperiment === 'stokes') { initCompOverlayChart(); }
  updateCompDataDisplay();
  if (was) startCompAnim();
}

function toggleCompAnim() {
  var btn = document.getElementById('compPlayPauseBtn');
  if (_compAnimRunning) {
    pauseCompAnim();
    if (btn) { btn.innerHTML = '开始'; btn.style.background = '#00e676'; btn.style.borderColor = '#00e676'; }
  } else {
    startCompAnim();
    if (btn) { btn.innerHTML = '暂停'; btn.style.background = '#f39c12'; btn.style.borderColor = '#f39c12'; }
  }
}

function resetCompAnimFull() {
  pauseCompAnim();
  initCompParamsForExp(AppState.currentExperiment);
  // 同时重置流体预设选择状态为"水"
  window._compSelectedPresets = {};
  syncCompSlidersToParams();
  updateAllCompPresetDisplays();
  initCompParticles();
  updateCompDataDisplay();
  renderCompCanvas();
  if (AppState.currentExperiment === 'stokes') { initCompOverlayChart(); updateCompOverlayChart(); }
  var btn = document.getElementById('compPlayPauseBtn');
  if (btn) { btn.innerHTML = '开始'; btn.style.background = '#00e676'; btn.style.borderColor = '#00e676'; }
}

// 对比模式 resize 处理器
function compResizeHandler() {
  if (AppState.compareMode) {
    if (compOverlayChart) compOverlayChart.resize();
    resizeCompCanvas();
    renderCompCanvas();
  }
}


// 进入/退出对比模式

function enterCompareMode() {
  AppState.compareMode = true;

  /* 对比容器位于 lineSimPage 内；先切到线图模拟子页，避免父容器隐藏。 */
  if (AppState.currentSubPage !== 'lineSim') {
    try {
      if (typeof Navigation !== 'undefined' && typeof Navigation.switchSubPage === 'function') {
        Navigation.switchSubPage('lineSim');
      }
    } catch (e) { console.warn('[Compare] 切换线图模拟子页失败', e); }
  }

  // 停止正常仿真（对比模式有独立动画循环）
  Navigation.stopSimulation();
  var playPauseBtn = document.getElementById("playPauseBtn");
  if (playPauseBtn) { playPauseBtn.innerHTML = "开始"; playPauseBtn.className = "ctrl-btn play-pause"; }

  initCompParamsForExp(AppState.currentExperiment);

  // 隐藏侧边栏
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = 'none';

  // 隐藏正常布局，显示对比容器
  var normalLayout = document.getElementById('normalLayout');
  var compareContainer = document.getElementById('compare-container');
  if (normalLayout) normalLayout.style.display = 'none';
  if (compareContainer) { compareContainer.style.display = 'flex'; compareContainer.classList.add('active'); }

  destroyCompareUI();
  buildCompareUI();

  setTimeout(function() {
    resizeCompCanvas();
    initCompParticles();
    renderCompCanvas();
    updateCompDataDisplay();
    if (AppState.currentExperiment === 'stokes') { initCompOverlayChart(); updateCompOverlayChart(); }
    // 不自动开始 — 用户需点击"开始"按钮
    var compBtn = document.getElementById('compPlayPauseBtn');
    if (compBtn) { compBtn.innerHTML = '开始'; compBtn.style.background = '#00e676'; compBtn.style.borderColor = '#00e676'; }
  }, 250);

  // 更新按钮状态
  var toggleBtn = document.getElementById('compareToggleBtn');
  if (toggleBtn) { toggleBtn.textContent = ' 关闭对比模式'; toggleBtn.classList.add('active'); }

  // 隐藏实验报告按钮（对比模式下不可用）
  var reportBtn = document.getElementById('btn-report');
  if (reportBtn) reportBtn.style.display = 'none';

  // 添加 resize 监听
  window.addEventListener('resize', compResizeHandler);

  console.log('[Compare] Entered compare mode for', AppState.currentExperiment);
}

function exitCompareMode() {
  AppState.compareMode = false;
  pauseCompAnim();
  destroyCompareUI();

  // 恢复侧边栏
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = '';

  // 隐藏对比容器，恢复正常布局
  var normalLayout = document.getElementById('normalLayout');
  var compareContainer = document.getElementById('compare-container');
  if (normalLayout) normalLayout.style.display = '';
  if (compareContainer) { compareContainer.style.display = 'none'; compareContainer.classList.remove('active'); }

  // 恢复按钮状态
  var toggleBtn = document.getElementById('compareToggleBtn');
  if (toggleBtn) { toggleBtn.textContent = '开启对比模式'; toggleBtn.classList.remove('active'); }

  // 恢复实验报告按钮
  var reportBtn = document.getElementById('btn-report');
  if (reportBtn) reportBtn.style.display = '';

  // 移除 resize 监听
  window.removeEventListener('resize', compResizeHandler);

  // 重新初始化正常模式画布
  deferCanvasTask(function() {
    initSimulationCanvas();
    updateDataDisplay();
  }, 50);

  console.log('[Compare] Exited compare mode');
}

function toggleCompareMode() {
  if (AppState.compareMode) {
    exitCompareMode();
  } else {
    enterCompareMode();
  }
}

// 切换操作指南展开/折叠
function toggleGuide() {
  var guide = document.getElementById('operationGuide');
  if (guide) guide.classList.toggle('collapsed');
}

// 同步 compParams 到 DOM 滑块（R键重置用）
function syncCompSlidersToParams() {
  var exp = AppState.currentExperiment;
  var mapping = {
    newton: [['visc','viscosity'],['vel','velocity'],['spac','spacing'],['area','area']],
    poiseuille: [['radius','radius'],['length','length'],['dp','dp'],['visc','viscosity']],
    stokes: [['radius','radius'],['visc','viscosity']]
  };
  var pairs = mapping[exp] || mapping.newton;
  ['A','B','C'].forEach(function(k) {
    var kk = k.toLowerCase();
    var p = compParams[k];
    if (!p) return;
    pairs.forEach(function(pair) {
      var id = pair[0], key = pair[1];
      var slider = document.getElementById('c' + kk + '-' + id);
      var valSpan = document.getElementById('c' + kk + '-' + id + '-val');
      var displayVal = (key === 'spacing') ? (p[key] || 0) * 1000 : (p[key] || 0);
      if (slider) slider.value = displayVal;
      if (valSpan) valSpan.textContent = formatCompParam(displayVal);
    });
  });
}


// 事件监听初始化

function setupEventListeners() {
  // 实验卡片点击
  const cards = document.querySelectorAll('.experiment-card');
  console.log('Found experiment cards:', cards.length);
  cards.forEach(card => {
    const handler = () => {
      const expType = card.dataset.experiment;
      console.log('Card clicked:', expType);
      Navigation.goToExperiment(expType);
    };
    card.addEventListener('click', handler);
    // 存储事件监听器引用
    AppState.eventListeners.experimentCards.push({ element: card, handler });
  });
  
  // 返回首页按钮
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      Navigation.goToHome();
    });
  }
  
  // 菜单项点击
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      Navigation.switchSubPage(page);
    });
  });
  
  // 折叠菜单按钮
  const toggleBtn = document.getElementById('toggleSidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      Navigation.toggleSidebar();
    });
  }
  
  /* input、textarea、select 或 contenteditable 获得焦点时不响应实验快捷键，避免输入内容触发实验切换。 */
  function isTypingTarget(el) {
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName).toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    try {
      if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
      if (el.closest && el.closest('[contenteditable="true"]')) return true;
    } catch (err) {}
    return false;
  }

  // 键盘快捷键
  document.addEventListener('keydown', function(e) {
    // 焦点在输入框 / 文本域 / 可编辑区域时，不响应快捷键
    if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;

    var key = e.key.toLowerCase();

    // 开始页面：1/2/3 直接选择实验并进入
    if (AppState.currentPage === 'home') {
      if (key === '1') { Navigation.goToExperiment('newton'); return; }
      if (key === '2') { Navigation.goToExperiment('poiseuille'); return; }
      if (key === '3') { Navigation.goToExperiment('stokes'); return; }
      if (key === 't') {
        var themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.click();
        return;
      }
      return;
    }

    // 实验页面
    if (AppState.currentPage === 'experiment') {
      // 1/2/3 切换实验（任何子页面都有效）
      if (key === '1') { Navigation.goToExperiment('newton'); return; }
      if (key === '2') { Navigation.goToExperiment('poiseuille'); return; }
      if (key === '3') { Navigation.goToExperiment('stokes'); return; }
      
      // T键切换主题（任何子页面都有效）
      if (key === 't') {
        var themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.click();
        return;
      }

      // 以下快捷键只在"线图模拟"子页面有效
      if (AppState.currentSubPage !== 'lineSim') return;

      switch(key) {
        case ' ':
          e.preventDefault();
          if (AppState.compareMode) {
            if (_compAnimRunning) pauseCompAnim(); else startCompAnim();
            var compBtn = document.getElementById('compPlayPauseBtn');
            if (compBtn) {
              if (_compAnimRunning) { compBtn.innerHTML = '暂停'; compBtn.style.background = '#f39c12'; compBtn.style.borderColor = '#f39c12'; }
              else { compBtn.innerHTML = '开始'; compBtn.style.background = '#00e676'; compBtn.style.borderColor = '#00e676'; }
            }
          } else {
            var playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn) playPauseBtn.click();
          }
          break;
        case 'r':
          if (AppState.compareMode) resetCompAnimFull();
          else { var resetBtn=document.getElementById('resetBtn'); if(resetBtn) resetBtn.click(); }
          break;
        case 'c':
          toggleCompareMode();
          break;
      }
    }
  });

  // 主题切换
  ThemeManager.init();
}


// 学生操作记录器（LabRecorder）
// 记录真实操作过程与仿真记录，实验报告据此绘制不同的函数图像



// 实验任务清单
// 勾选状态只存在内存里（每次打开网页重置），切换实验时重绘

var TASK_DONE = {};   /* 任务清单的勾选：只存内存，打开网页就重置 */
var _TASK_STEPS = {
  newton: ['设定一个自变量（速度、间距或面积）', '保持其余参数不变，记录至少 5 个数据点', '导出报告并检查 F 与速度梯度的关系'],
  poiseuille: ['选择压强差、半径或黏度作为自变量', '保持其余参数不变，记录至少 5 个数据点', '确认 Re < 2000 后导出报告'],
  stokes: ['确认当前处于 Re < 0.1 的斯托克斯区', '改变球半径或黏度，记录至少 5 个数据点', '导出报告并说明适用性结论']
};

function renderTaskGuide() {
  var host = document.getElementById('taskGuideHost'), exp = AppState.currentExperiment;
  if (!host || !_TASK_STEPS[exp]) return;

  var done = TASK_DONE[exp] || (TASK_DONE[exp] = {});

  host.innerHTML = '<label class="line-measurement-option">' +
    '<input type="checkbox" id="measurementModeToggle" ' + (AppState.measurementMode ? 'checked' : '') + '> ' +
    '<span>测量模式：加入 ±1.5% 仪器读数误差</span></label>';

  var measure = document.getElementById('measurementModeToggle');
  if (measure) {
    measure.addEventListener('change', function () { AppState.measurementMode = this.checked; });
  }
}

// 固定伪随机扰动：同一操作得到同一读数，便于课堂复现；仅模拟仪器分辨率与读数误差。
function _measureReading(value, seed) {
  if (!AppState.measurementMode) return value;
  var x = Math.sin(seed * 12.9898) * 43758.5453;
  var deviation = (x - Math.floor(x) - 0.5) * 0.03; // ±1.5%
  return value * (1 + deviation);
}
// 各实验的主响应量（因变量）
var _LAB_RESP = {
  newton:     { key: 'F',  sym: 'F',   name: '黏性力',   unit: 'N' },
  poiseuille: { key: 'Q',  sym: 'Q',   name: '体积流量', unit: 'm\u00B3/s' },
  stokes:     { key: 'vt', sym: 'v_t', name: '终端速度', unit: 'm/s' }
};

function _labClock(ts) {
  var d = new Date(ts);
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

var LabRecorder = {
  exp: null,
  startTs: 0,
  events: [],    // 非参数类操作日志（开始/暂停/重置/切换流体）
  sweeps: {},    // paramId -> {id,name,symbol,unit,key,points:[{x,y,t}]}
  runs: [],      // 运行段 -> {seq,t0,samples:[[t,v]]}
  curRun: null,
  presets: [],   // 流体切换记录
  _lastSweepTs: {},
  _lastSampleTs: 0,
  _runSeq: 0,

  reset: function (expType) {
    this.exp = expType || AppState.currentExperiment || null;
    this.startTs = Date.now();
    this.events = [];
    this.sweeps = {};
    this.runs = [];
    this.curRun = null;
    this.presets = [];
    this._lastSweepTs = {};
    this._lastSampleTs = 0;
    this._runSeq = 0;
    _updateReportBadge();
  },

  ensure: function () {
    if (this.exp !== AppState.currentExperiment) this.reset();
    if (!this.startTs) this.startTs = Date.now();
  },

  paramDef: function (id) {
    var e = EXPERIMENTS[this.exp || AppState.currentExperiment];
    if (!e) return null;
    for (var i = 0; i < e.params.length; i++) if (e.params[i].id === id) return e.params[i];
    return null;
  },

  // 某参数对应的响应量（泊肃叶的密度只影响 Re，不影响 Q）
  respKey: function (paramId) {
    var exp = this.exp || AppState.currentExperiment;
    if (exp === 'poiseuille' && paramId === 'density') return 'Re';
    return (_LAB_RESP[exp] || { key: 'y' }).key;
  },

  respMeta: function (key) {
    var exp = this.exp || AppState.currentExperiment;
    if (key === 'Re') return { sym: 'Re', name: '雷诺数', unit: '' };
    return _LAB_RESP[exp] || { sym: 'y', name: '响应量', unit: '' };
  },

  // 由参数集合计算稳态响应量
  responseOf: function (p, key) {
    var exp = this.exp || AppState.currentExperiment;
    if (exp === 'newton') return PhysicsEngine.newtonViscosity(p.velocity, p.viscosity, p.distance, p.area).F;
    if (exp === 'poiseuille') {
      var c = PhysicsEngine.poiseuille(p.radius, p.length, p.pressure, p.viscosity, p.density);
      return key === 'Re' ? c.Re : c.Q;
    }
    if (exp === 'stokes') return PhysicsEngine.stokes(p.ballRadius, p.ballDensity, p.fluidDensity, p.viscosity).vt;
    return 0;
  },

  // 仿真过程中的瞬时量
  instantOf: function () {
    var exp = this.exp || AppState.currentExperiment;
    var p = getParamValues();
    if (exp === 'newton') return PhysicsEngine.newtonViscosity(p.velocity, p.viscosity, p.distance, p.area).F;
    if (exp === 'poiseuille') return PhysicsEngine.poiseuille(p.radius, p.length, p.pressure, p.viscosity, p.density).Q;
    if (exp === 'stokes') return AppState.stokesBallV || 0;
    return 0;
  },

  logEvent: function (type, label, detail) {
    this.ensure();
    if (this.events.length < 200) {
      this.events.push({ t: Date.now(), type: type, label: label || '', detail: detail || '' });
    }
  },

  // 滑块调节：记录一组（参数值 → 响应量）实测点
  onParamChange: function (paramId, value, force) {
    this.ensure();
    if (typeof value !== 'number' || isNaN(value)) return;
    var now = Date.now();
    if (!force && now - (this._lastSweepTs[paramId] || 0) < 60) return;
    this._lastSweepTs[paramId] = now;

    var key = this.respKey(paramId);
    var p = getParamValues();
    p[paramId] = value;
    var y = _measureReading(this.responseOf(p, key), value + now / 1000);

    var s = this.sweeps[paramId];
    if (!s) {
      var def = this.paramDef(paramId);
      s = this.sweeps[paramId] = {
        id: paramId,
        name: def ? def.name : paramId,
        symbol: def ? def.symbol : paramId,
        unit: def ? def.unit : '',
        key: key,
        points: []
      };
    }
    var pts = s.points;
    if (pts.length >= 400) return;
    if (pts.length && Math.abs(pts[pts.length - 1].x - value) < 1e-12) return;
    // snap：记录该点时全部参数的取值，用于按「当时的实验条件」计算理论值
    pts.push({ x: value, y: y, t: now, snap: _labClone(p) });
    _updateReportBadge();
  },

  onPreset: function (name) {
    this.ensure();
    var key = this.respKey('viscosity');
    this.presets.push({ name: name, t: Date.now(), y: this.responseOf(getParamValues(), key), key: key });
    if (this.presets.length > 40) this.presets.shift();
    this.logEvent('切换流体', name, '');
    _updateReportBadge();
  },

  onSimStart: function () {
    this.ensure();
    this._runSeq = (this._runSeq || 0) + 1;
    var run = { seq: this._runSeq, t0: AppState.simTime, start: Date.now(), samples: [] };
    this.runs.push(run);
    if (this.runs.length > 12) this.runs.shift();
    this.curRun = run;
    this.logEvent('开始仿真', '运行段 #' + run.seq, '');
    _updateReportBadge();
  },

  onSimPause: function () {
    if (this.curRun) { this.curRun.end = Date.now(); this.curRun = null; }
    this.logEvent('暂停仿真', '', '');
  },

  onSimReset: function () {
    var exp = this.exp || AppState.currentExperiment;
    this.reset(exp);
    this.logEvent('重置实验', '', '参数与记录已清空');
  },

  // 仿真采样（节流 80ms）
  onSimFrame: function () {
    if (!this.curRun) return;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - this._lastSampleTs < 80) return;
    this._lastSampleTs = now;
    var run = this.curRun;
    var exp = this.exp || AppState.currentExperiment;
    // 斯托克斯用物理下落时间，其余用仿真时间
    var t = (exp === 'stokes' && typeof AppState.stokesBallTime === 'number')
      ? AppState.stokesBallTime
      : (AppState.simTime - run.t0);
    run.samples.push([t, this.instantOf()]);
    if (run.samples.length > 900) run.samples.shift();
  },

  totalPoints: function () {
    var self = this;
    var n = 0;
    Object.keys(this.sweeps).forEach(function (k) { n += self.sweeps[k].points.length; });
    this.runs.forEach(function (r) { n += r.samples.length; });
    return n;
  }
};

// 报告按钮上的数据点计数徽标
function _updateReportBadge() {
  try {
    var n = LabRecorder.totalPoints();
    var btns = document.querySelectorAll('#btn-report');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = n > 0 ? ('\u5BFC\u51FA\u5B9E\u9A8C\u62A5\u544A\uFF08\u5DF2\u8BB0\u5F55 ' + n + ' \u70B9\uFF09') : '\u5BFC\u51FA\u5B9E\u9A8C\u62A5\u544A';
    }
  } catch (e) { /* 忽略 */ }
}

// 百分比专用格式化（避免出现 0.00e+0% 这种写法）
function _fmtPct(v) {
  if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) return '0.00';
  var a = Math.abs(v);
  if (a >= 1000) return v.toExponential(2);
  return v.toFixed(2);
}

// 最小二乘：线性拟合 y = a·x + b
function _fitLinear(pts) {
  var n = pts.length;
  if (n < 2) return null;
  var sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0, i, x, y;
  for (i = 0; i < n; i++) { x = pts[i][0]; y = pts[i][1]; sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
  var den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-30) return null;
  var a = (n * sxy - sx * sy) / den;
  var b = (sy - a * sx) / n;
  var ssTot = syy - sy * sy / n, ssRes = 0;
  for (i = 0; i < n; i++) { var r = pts[i][1] - (a * pts[i][0] + b); ssRes += r * r; }
  var r2 = ssTot > 1e-30 ? 1 - ssRes / ssTot : 1;
  var txt = _fmtNum(a, 6) + '·x';
  if (Math.abs(b) > 1e-12) txt += (b < 0 ? ' - ' : ' + ') + _fmtNum(Math.abs(b), 6);
  return { type: 'linear', a: a, b: b, r2: r2, f: function (xx) { return a * xx + b; }, text: txt };
}

// 最小二乘：幂律拟合 y = A·x^B
function _fitPower(pts) {
  var i;
  for (i = 0; i < pts.length; i++) { if (pts[i][0] <= 0 || pts[i][1] <= 0) return null; }
  var lp = pts.map(function (p) { return [Math.log(p[0]), Math.log(p[1])]; });
  var f = _fitLinear(lp);
  if (!f) return null;
  var B = f.a, A = Math.exp(f.b);
  var sy = 0;
  for (i = 0; i < pts.length; i++) sy += pts[i][1];
  var mean = sy / pts.length, ssTot = 0, ssRes = 0;
  for (i = 0; i < pts.length; i++) {
    ssTot += Math.pow(pts[i][1] - mean, 2);
    ssRes += Math.pow(pts[i][1] - A * Math.pow(pts[i][0], B), 2);
  }
  var r2 = ssTot > 1e-30 ? 1 - ssRes / ssTot : 1;
  return { type: 'power', a: A, b: B, r2: r2, f: function (xx) { return A * Math.pow(xx, B); }, text: _fmtNum(A, 6) + '·x^' + _fmtNum(B, 4) };
}

function _labClone(p) {
  var o = {};
  for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
  return o;
}


// 依据学生真实操作构建「仿真记录」报告章节

function groupRecordedSweeps(sweeps) {
  const groups=[];
  Object.keys(sweeps).forEach(function(k) {
    const s=sweeps[k], buckets=new Map();
    (s.points||[]).forEach(function(p,i) {
      // Legacy samples without a snapshot are deliberately not mixed into fits.
      const fixed=p.snap?Object.keys(p.snap).filter(x=>x!==s.id).sort().map(x=>[x,p.snap[x]]):[['unknown',i]];
      const signature=JSON.stringify(fixed);
      if(!buckets.has(signature)) buckets.set(signature,{...s,points:[],fixed,group:groups.length+1});
      buckets.get(signature).points.push(p);
    });
    buckets.forEach(function(g,i){g.group=groups.length+1;groups.push(g);});
  });
  return groups;
}
function sphereReferenceCurve(r,rp,rf,mu,tMax,n) {
  const pts=[[0,0]]; let v=0;
  for(let i=1;i<=n;i++){v=PhysicsEngine.advanceSphere(v,tMax/n,r,rp,rf,mu).v;pts.push([tMax*i/n,v]);}
  return pts;
}
function _buildMeasuredSections() {
  var rec = LabRecorder;
  var exp = rec.exp || AppState.currentExperiment;
  var out = { hasData: false, statRows: [], charts: [], table: null, analysis: '' };
  if (!exp) return out;

  var self = rec;
  var sweepList = groupRecordedSweeps(rec.sweeps)
    .filter(function (s) { return s.points && s.points.length > 0; })
    .sort(function (a, b) { return b.points.length - a.points.length; });
  var runs = rec.runs.filter(function (r) { return r.samples && r.samples.length > 1; });
  var p0 = getParamValues();

  // ---- 1. 参数扫描曲线（取操作最多的两个参数）----
  var chartable = sweepList.filter(function (s) { return s.points.length >= 2; });
  var stats = [];

  sweepList.forEach(function (s) {
    var meta = rec.respMeta(s.key);
    var pts = s.points.slice().sort(function (a, b) { return a.x - b.x; });
    var xy = pts.map(function (p) { return [p.x, p.y]; });
    var first = pts[0], last = pts[pts.length - 1];

    // 与理论值的偏差（理论值按该采样点当时的完整实验条件计算）
    var maxErr = 0, sumErr = 0;
    pts.forEach(function (p) {
      var tv = rec.responseOf(p.snap || _labClone(p0), s.key);
      var e = Math.abs(p.y - tv) / Math.max(Math.abs(tv), 1e-30) * 100;
      if (e > maxErr) maxErr = e;
      sumErr += e;
    });
    var avgErr = sumErr / pts.length;

    var fl = _fitLinear(xy), fp = _fitPower(xy), best = null;
    if (fl && fp) best = (fp.r2 > fl.r2 + 0.005) ? fp : fl;
    else best = fl || fp;

    stats.push({
      sweep: s, meta: meta, pts: pts, xy: xy, first: first, last: last,
      fit: best, maxErr: maxErr, avgErr: avgErr
    });
  });

  // 统计表
  stats.forEach(function (st) {
    var s = st.sweep, m = st.meta;
    out.statRows.push([
      s.symbol + ' (' + s.unit + ') · 条件组 ' + s.group,
      String(st.pts.length),
      _fmtNum(st.first.x) + ' → ' + _fmtNum(st.last.x),
      _fmtNum(st.first.y) + ' → ' + _fmtNum(st.last.y),
      st.fit ? st.fit.text : '—',
      st.fit ? _fmtNum(st.fit.r2, 4) : '—',
      '<span style="color:#2166AC;">' + _fmtPct(st.avgErr) + '%</span>'
    ]);
  });

  // 曲线图
  var ci = 0;
  chartable.forEach(function (s) {
    var st = null;
    for (var i = 0; i < stats.length; i++) if (stats[i].sweep === s) st = stats[i];
    if (!st) return;
    var meta = st.meta;
    var xs = st.xy.map(function (p) { return p[0]; });
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var span = (xmax - xmin) || Math.max(Math.abs(xmax), 1e-12) * 0.1;
    var def=rec.paramDef(s.id);
    var lo = Math.max(def ? def.min : xmin, xmin - span * 0.05);
    var hi = Math.min(def ? def.max : xmax, xmax + span * 0.05);

    var theo = [];
    var N = 140;
    for (var j = 0; j <= N; j++) {
      var x = lo + (hi - lo) * j / N;
      // 取 x 最近采样点的实验条件，保证理论曲线与对应实测点处于同一条件下
      var near = null, nd = Infinity;
      for (var q = 0; q < st.pts.length; q++) {
        var dq = Math.abs(st.pts[q].x - x);
        if (dq < nd) { nd = dq; near = st.pts[q]; }
      }
      var pp = _labClone((near && near.snap) || p0);
      pp[s.id] = x;
      theo.push([x, rec.responseOf(pp, s.key)]);
    }

    var series = [
      {
        name: '理论曲线', type: 'line', data: theo, symbol: 'none', smooth: true,
        lineStyle: { color: '#2166AC', width: 2 }, animation: false
      },
      {
        name: '仿真记录点', type: 'scatter', data: st.xy, symbolSize: 7,
        itemStyle: { color: '#D6604D', borderColor: '#8c2f22', borderWidth: 0.6 }, animation: false
      }
    ];
    if (st.fit) {
      var fd = [];
      for (var k = 0; k <= N; k++) {
        var xf = lo + (hi - lo) * k / N;
        fd.push([xf, st.fit.f(xf)]);
      }
      series.push({
        name: '拟合 ' + st.fit.text + '  (R²=' + _fmtNum(st.fit.r2, 4) + ')',
        type: 'line', data: fd, symbol: 'none', smooth: true,
        lineStyle: { color: '#1B9E77', width: 1.8, type: 'dashed' }, animation: false
      });
    }

    var opt = {
      backgroundColor: '#ffffff',
      title: {
        text: meta.sym + ' – ' + s.symbol + ' 仿真记录 · 条件组 ' + s.group,
        subtext: '采样 ' + st.pts.length + ' 点 | 固定条件：' + s.fixed.map(function(x){return x[0]+'='+_fmtNum(x[1]);}).join(', '),
        left: 'center', top: 6,
        textStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 13, fontWeight: 'bold', color: '#000000' },
        subtextStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 9, color: '#555555' }
      },
      tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
      legend: { bottom: 2, itemWidth: 18, itemHeight: 8, textStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 9, color: '#000000' } },
      grid: { left: 78, right: 26, top: 66, bottom: 52 },
      xAxis: {
        type: 'value', scale: true, name: s.symbol + (s.unit ? ' (' + s.unit + ')' : ''),
        nameLocation: 'middle', nameGap: 26,
        nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
        axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
        axisLabel: { fontSize: 9, color: '#000000' }, splitLine: { show: false }
      },
      yAxis: {
        type: 'value', scale: true, name: meta.sym + (meta.unit ? ' (' + meta.unit + ')' : ''),
        nameLocation: 'middle', nameGap: 48,
        nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
        axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
        axisLabel: { fontSize: 9, color: '#000000' }, splitLine: { show: false }
      },
      series: series,
      animation: false
    };
    out.charts.push({ id: 'dyn-' + (ci++), opt: opt });
  });

  // ---- 2. 仿真过程记录时序 ----
  if (runs.length) {
    var expNow = exp;
    var tSeries = [];
    var allT = [];
    runs.forEach(function (r, i) {
      tSeries.push({
        name: '运行段 #' + r.seq, type: 'line', data: r.samples, symbol: 'none', smooth: false,
        lineStyle: { color: _T7[i % 7], width: 2, type: _dash7[i % 7] }, animation: false
      });
      r.samples.forEach(function (s) { allT.push(s[0]); });
    });
    var tMax = Math.max.apply(null, allT.concat([0]));
    var tMin = Math.min.apply(null, allT.concat([0]));

    var yName = expNow === 'newton' ? 'F (N)' : (expNow === 'poiseuille' ? 'Q (m\u00B3/s)' : 'v (m/s)');
    var xName = expNow === 'stokes' ? 't (s)' : 't (s)';
    var sub = '共 ' + runs.length + ' 段运行，累计 ' + runs.reduce(function (a, r) { return a + r.samples.length; }, 0) + ' 个采样点';

    sub += '；仅展示已记录轨迹，参数变化的影响保留在各时间段中';

    out.charts.push({
      id: 'dyn-' + (ci++),
      opt: {
        backgroundColor: '#ffffff',
        title: {
          text: '仿真过程记录时序曲线', subtext: sub, left: 'center', top: 6,
          textStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 13, fontWeight: 'bold', color: '#000000' },
          subtextStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 9, color: '#555555' }
        },
        tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
        legend: { bottom: 2, itemWidth: 18, itemHeight: 8, textStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 9, color: '#000000' } },
        grid: { left: 78, right: 26, top: 66, bottom: 52 },
        xAxis: {
          type: 'value', scale: true, name: xName, nameLocation: 'middle', nameGap: 26,
          nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
          axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
          axisLabel: { fontSize: 9, color: '#000000' }, splitLine: { show: false }
        },
        yAxis: {
          type: 'value', scale: true, name: yName, nameLocation: 'middle', nameGap: 48,
          nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
          axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
          axisLabel: { fontSize: 9, color: '#000000' }, splitLine: { show: false }
        },
        series: tSeries,
        animation: false
      }
    });
  }

  // ---- 3. 流体预设对比 ----
  var presetNames = [], presetVals = [];
  rec.presets.forEach(function (p) {
    if (presetNames.indexOf(p.name) === -1) { presetNames.push(p.name); presetVals.push(p.y); }
    else { presetVals[presetNames.indexOf(p.name)] = p.y; }
  });
  if (presetNames.length >= 2) {
    var pmeta = rec.respMeta(rec.presets[0].key);
    out.charts.push({
      id: 'dyn-' + (ci++),
      opt: {
        backgroundColor: '#ffffff',
        title: {
          text: '不同流体下的 ' + pmeta.sym + ' 对比',
          subtext: '共切换 ' + presetNames.length + ' 种流体（按切换顺序）',
          left: 'center', top: 6,
          textStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 13, fontWeight: 'bold', color: '#000000' },
          subtextStyle: { fontFamily: 'Arial,Helvetica,sans-serif', fontSize: 9, color: '#555555' }
        },
        tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
        grid: { left: 78, right: 26, top: 66, bottom: 80 },
        xAxis: {
          type: 'category', data: presetNames,
          nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
          axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
          axisLabel: { fontSize: 8, color: '#000000', rotate: 30, interval: 0 }, splitLine: { show: false }
        },
        yAxis: {
          type: 'value', scale: true, name: pmeta.sym + (pmeta.unit ? ' (' + pmeta.unit + ')' : ''),
          nameLocation: 'middle', nameGap: 48,
          nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#000000' },
          axisLine: { lineStyle: { color: '#000000', width: 1.2 } },
          axisLabel: { fontSize: 9, color: '#000000' }, splitLine: { show: false }
        },
        series: [{
          name: pmeta.name, type: 'bar', data: presetVals, barMaxWidth: 40,
          itemStyle: { color: '#2166AC' }, animation: false
        }],
        animation: false
      }
    });
  }

  // ---- 4. 仿真记录明细表（取采样最多的扫描，仅列前 5 条）----
  if (stats.length) {
    var top = stats[0];
    var rows = [];
    var show = top.pts.slice(0, 5);
    show.forEach(function (p, i) {
      var tv = rec.responseOf(p.snap || _labClone(p0), top.sweep.key);
      rows.push([
        String(i + 1),
        _fmtNum(p.x),
        _fmtNum(p.y),
        _fmtNum(tv),
        '<span style="color:#2166AC;">' + _fmtPct(Math.abs(p.y - tv) / Math.max(Math.abs(tv), 1e-30) * 100) + '%</span>'
      ]);
    });
    out.table = {
      headers: ['序号', top.sweep.symbol + ' (' + top.sweep.unit + ')', '实测 ' + top.meta.sym, '理论 ' + top.meta.sym, '相对误差'],
      rows: rows,
      note: '共 ' + top.pts.length + ' 个采样点' + (top.pts.length > 5 ? '，此处列出前 5 个' : '')
    };
  }

  out.hasData = out.charts.length > 0 || out.statRows.length > 0;

  // ---- 5. 基于仿真记录的分析文本 ----
  if (out.hasData) {
    var totalPts = rec.totalPoints();
    var html = '<p><b>仿真记录\u6982\u51B5\uff1A</b>本次实验共记录 <b>' + totalPts + '</b> 个数据点，' +
      '调节了 <b>' + stats.length + '</b> 个参数' +
      (runs.length ? '，运行仿真 <b>' + runs.length + '</b> 段' : '') +
      (presetNames.length ? '，切换流体 <b>' + presetNames.length + '</b> 种' : '') + '。' +
      '以下图像均由本次真实操作数据绘制，不同学生的操作会产生不同的曲线。</p>';

    stats.forEach(function (st) {
      var s = st.sweep, m = st.meta;
      var rel = '采样点不足（' + st.pts.length + ' 个），未给出拟合关系';
      if (st.fit) {
        rel = st.fit.type === 'power'
          ? ('幂律关系 ' + m.sym + ' = ' + st.fit.text.replace('x', s.symbol))
          : ('线性关系 ' + m.sym + ' = ' + st.fit.text.replace('x', s.symbol));
      }
      var trend = st.last.y > st.first.y ? '增大' : (st.last.y < st.first.y ? '减小' : '基本不变');
      html += '<p><b>' + s.name + '：</b>由 ' + _fmtNum(st.first.x) + ' 调节至 ' + _fmtNum(st.last.x) +
        ' ' + s.unit + '，共 ' + st.pts.length + ' 个采样点，' + m.name + '由 ' + _fmtNum(st.first.y) + ' ' + m.unit +
        ' ' + trend + '至 ' + _fmtNum(st.last.y) + ' ' + m.unit + '。拟合结果呈' + rel +
        (st.fit ? '，决定系数 R² = ' + _fmtNum(st.fit.r2, 4) : '') +
        '；与理论值的平均相对误差为 ' + _fmtPct(st.avgErr) + '%，最大相对误差 ' + _fmtPct(st.maxErr) + '%。</p>';
    });

    if (runs.length) {
      var lastRun = runs[runs.length - 1];
      var lastV = lastRun.samples[lastRun.samples.length - 1][1];
      html += '<p><b>仿真时序：</b>共采集 ' + runs.reduce(function (a, r) { return a + r.samples.length; }, 0) +
        ' 个时刻的瞬时值' + (exp === 'stokes' ? '，曲线保留加速、改参和到达边界时的状态' : '，曲线反映了运行过程中参数调节对响应量的实时影响') +
        '，末段结束时刻的仿真读数为 ' + _fmtNum(lastV) + '。</p>';
    }
    if (presetNames.length >= 2) {
      var mx = 0, mn = 0;
      for (var z = 1; z < presetVals.length; z++) {
        if (presetVals[z] > presetVals[mx]) mx = z;
        if (presetVals[z] < presetVals[mn]) mn = z;
      }
      html += '<p><b>流体对比：</b>在切换过的 ' + presetNames.length + ' 种流体中，' + presetNames[mx] + ' 对应的响应量最大（' +
        _fmtNum(presetVals[mx]) + '），' + presetNames[mn] + ' 最小（' + _fmtNum(presetVals[mn]) + '），' +
        '这是本次操作记录的差异；判断原因前需核对其他控制条件。</p>';
    }
    out.analysis = html;
  }

  return out;
}


// 实验报告生成


// 报告曲线调色板
var _T7 = ['#2166AC','#D6604D','#1B9E77','#7570B3','#E7298A','#66A61E','#E6AB02'];

// 7种线型
var _dash7 = ['solid',[8,4],[3,3],[12,4,3,4],[16,6],[8,4,2,4,2,4],[2,2]];

// 7种标记
var _markers7 = ['circle','rect','diamond','triangle','pentagon','hexagon','arrow'];

// 7种线型名称（用于图例）
var _dashNames7 = ['实线','虚线','点线','点划线','长虚线','双点划线','密点线'];

/* 报告图表配置工厂：配置由 LabPlot 消费。 */
function pubChartOpt7(title, subtitle, xLabel, yLabel) {
  return {
    backgroundColor: '#ffffff',
    title: {
      text: title,
      subtext: subtitle || '',
      left: 'center',
      top: 10,
      textStyle: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000'
      },
      subtextStyle: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
        color: '#333333'
      }
    },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11,
        color: '#000000'
      },
      itemWidth: 25,
      itemHeight: 10,
      borderWidth: 0,
      shadowBlur: 0
    },
    grid: {
      left: 80,
      right: 180,
      top: 80,
      bottom: 60,
      containLabel: false
    },
    xAxis: {
      type: 'value',
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000000'
      },
      axisLine: { lineStyle: { color: '#000000', width: 1.5 } },
      axisTick: { inside: false, lineStyle: { color: '#000000' } },
      axisLabel: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
        color: '#000000'
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 55,
      nameTextStyle: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000000'
      },
      axisLine: { lineStyle: { color: '#000000', width: 1.5 } },
      axisTick: { inside: false, lineStyle: { color: '#000000' } },
      axisLabel: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
        color: '#000000'
      },
      splitLine: { show: false }
    },
    animation: false
  };
}

/**
 * 格式化数值（报告用，纯文本）
 */
function _fmtNum(v, dec) {
  if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) return '0';
  dec = dec || 4;
  if (v !== 0 && (Math.abs(v) < Math.pow(10, -dec) || Math.abs(v) >= 10000)) {
    return v.toExponential(dec);
  }
  return v.toFixed(dec);
}

/**
 * 生成三线表HTML
 */
function _threeLineTable(headers, rows, colWidths) {
  var w = colWidths || headers.map(function() { return ''; });
  var h = '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;">';
  // 顶线
  h += '<tr style="border-top:2px solid #000;"><td colspan="' + headers.length + '" style="padding:0;border:none;"></td></tr>';
  // 表头
  h += '<tr>';
  headers.forEach(function(hdr, i) {
    h += '<th style="padding:8px 12px;text-align:center;border:none;border-bottom:1px solid #000;font-weight:bold;color:#000;' + (w[i] ? 'width:' + w[i] + ';' : '') + '">' + hdr + '</th>';
  });
  h += '</tr>';
  // 数据行
  rows.forEach(function(row) {
    h += '<tr>';
    row.forEach(function(cell, i) {
      h += '<td style="padding:6px 12px;text-align:center;border:none;color:#000;' + (w[i] ? 'width:' + w[i] + ';' : '') + '">' + cell + '</td>';
    });
    h += '</tr>';
  });
  // 底线
  h += '<tr style="border-bottom:2px solid #000;"><td colspan="' + headers.length + '" style="padding:0;border:none;"></td></tr>';
  h += '</table>';
  return h;
}

/* 主函数：生成实验报告 */
function generateReport() {
  try {
  var exp = AppState.currentExperiment;
  if (!exp) { console.warn('[Report] No experiment selected'); return; }
  var params = getParamValues();
  console.log('[Report] Generating report for', exp, 'params:', params);

  // ---- 采集学生真实操作数据（不同操作 → 不同数据 → 不同图像）----
  var measured = _buildMeasuredSections();
  console.log('[Report] Measured sections:', measured.hasData, 'charts:', measured.charts.length);

  // 报告中全部图表的 id 清单（由 figWrap 填充），供「保存全部图像」使用
  var reportChartInfos = [];

  // ---- 计算数据 ----
  var reportData = {};

  if (exp === 'newton') {
    var U = params.velocity || 0.1;
    var d_mm = params.distance || 50;
    var d = d_mm / 1000; // 转为m
    var A = params.area || 0.1;
    var eta0 = params.viscosity || 0.001;

    var etaVals = [0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0].map(function(f) { return eta0 * f; });
    var xMax = U / d;
    var yMax = etaVals[6] * xMax * 1.1;

    var series = [];
    var tableRows = [];
    var N = 50;

    for (var i = 0; i < 7; i++) {
      var eta = etaVals[i];
      var data = [];
      for (var j = 0; j <= N; j++) {
        var x = xMax * j / N;
        data.push([x, eta * x]);
      }
      series.push({
        name: '\u03B7=' + _fmtNum(eta) + ' Pa\u00B7s',
        type: 'line',
        data: data,
        smooth: false,
        lineStyle: { color: _T7[i], width: i === 6 ? 3 : 1.8, type: _dash7[i] },
        symbol: 'none',
        showSymbol: false
      });

      // 对比数据：取 du/dy = xMax/2 处
      var xMid = xMax / 2;
      var tauTheory = eta * xMid;
      var tauSim = PhysicsEngine.newtonViscosity(U/2, eta, d_mm, A);
      tableRows.push([
        _fmtNum(eta),
        _fmtNum(xMid) + ' s\u207B\u00B9',
        _fmtNum(tauTheory) + ' Pa',
        _fmtNum(tauSim.tau) + ' Pa',
        '<span style="color:#2166AC;">' + _fmtNum(Math.abs(tauTheory - tauSim.tau) / Math.max(Math.abs(tauTheory), 1e-20) * 100, 2) + '%</span>'
      ]);
    }

    var physics = PhysicsEngine.newtonViscosity(U, eta0, d_mm, A);

    reportData = {
      title: '\u725B\u987F\u7C98\u6027\u5B9A\u5F8B\u5B9E\u9A8C\u62A5\u544A',
      subtitle: '\u9ECF\u6EDE\u963B\u529BF\u4E0Ez\uFF0CU\uFF0CA\uFF0C\u03B7\u7684\u5173\u7CFB',
      chartTitle: '\u03C4 vs du/dy \u2014 \u4E0D\u540C\u7C98\u5EA6\u4E0B\u7684\u526A\u5207\u5E94\u529B\u54CD\u5E94',
      chartSubtitle: '\u56FA\u5B9A\u53C2\u6570: U=' + _fmtNum(U) + ' m/s, d=' + _fmtNum(d, 3) + ' m, A=' + _fmtNum(A) + ' m\u00B2',
      xLabel: 'du/dy (s\u207B\u00B9)',
      yLabel: '\u03C4 (Pa)',
      paramHeaders: ['\u53C2\u6570', '\u7B26\u53F7', '\u503C', '\u5355\u4F4D'],
      paramRows: [
        ['\u4E0A\u677F\u901F\u5EA6', 'U', _fmtNum(U), 'm/s'],
        ['\u677F\u95F4\u8DDD', 'd', _fmtNum(d, 3), 'm'],
        ['\u677F\u9762\u79EF', 'A', _fmtNum(A), 'm\u00B2'],
        ['\u57FA\u51C6\u7C98\u5EA6', '\u03B7\u2080', _fmtNum(eta0), 'Pa\u00B7s']
      ],
      calcHeaders: ['数据名称', '符号', '值', '单位'],
      calcRows: [
        ['速度梯度', 'du/dy', _fmtNum(physics.grad), 's⁻¹'],
        ['切应力', 'τ', _fmtNum(physics.tau), 'Pa'],
        ['黏性力', 'F', _fmtNum(physics.F), 'N']
      ],
      theoryHeaders: ['\u7C98\u5EA6 \u03B7 (Pa\u00B7s)', 'du/dy (s\u207B\u00B9)', '\u7406\u8BBA \u03C4', '\u4EFF\u771F \u03C4', '\u76F8\u5BF9\u8BEF\u5DEE'],
      theoryRows: tableRows,
      series: series,
      seriesF: (function() {
        var sf = [];
        for (var k = 0; k < 7; k++) {
          var eta = etaVals[k];
          var dataF = [];
          for (var m = 0; m <= N; m++) {
            var x = xMax * m / N;
            dataF.push([x, eta * A * x]);
          }
          sf.push({
            name: 'η=' + _fmtNum(eta) + ' Pa·s',
            type: 'line',
            data: dataF,
            smooth: false,
            lineStyle: { color: _T7[k], width: k === 6 ? 3 : 1.8, type: _dash7[k] },
            symbol: 'none',
            showSymbol: false
          });
        }
        return sf;
      })(),
      chartTitleF: 'F vs du/dz — 不同粘度下的黏性力响应',
      chartSubtitleF: '固定参数: U=' + _fmtNum(U) + ' m/s, d=' + _fmtNum(d, 3) + ' m, A=' + _fmtNum(A) + ' m²',
      xLabelF: 'du/dz (s⁻¹)',
      yLabelF: 'F (N)',
      smallCharts: [
        {
          id: 'sc-dudz-z',
          title: '\u901F\u5EA6\u68AF\u5EA6 vs \u677F\u95F4\u8DDD',
          xLabel: 'z (mm)',
          yLabel: 'du/dz (s\u207B\u00B9)',
          subtitle: 'U=' + _fmtNum(U) + ' m/s, A=' + _fmtNum(A) + ' m\u00B2, \u03B7=' + _fmtNum(eta0) + ' Pa\u00B7s',
          data: (function() {
            var pts = [];
            for (var j = 0; j <= 50; j++) {
              var z_mm = 1 + j * 49 / 50;
              var z_m = z_mm / 1000;
              var dudz = U / z_m;
              pts.push([z_mm, dudz]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-dudz-u',
          title: '\u901F\u5EA6\u68AF\u5EA6 vs \u4E0A\u677F\u901F\u5EA6',
          xLabel: 'U (m/s)',
          yLabel: 'du/dz (s\u207B\u00B9)',
          subtitle: 'z=' + _fmtNum(d_mm) + ' mm, A=' + _fmtNum(A) + ' m\u00B2, \u03B7=' + _fmtNum(eta0) + ' Pa\u00B7s',
          data: (function() {
            var pts = [];
            for (var j = 0; j <= 50; j++) {
              var Uv = 0.01 + j * 0.99 / 50;
              var dudz = Uv / d;
              pts.push([Uv, dudz]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-f-a',
          title: '\u7C98\u6027\u529B vs \u677F\u9762\u79EF',
          xLabel: 'A (m\u00B2)',
          yLabel: 'F (N)',
          subtitle: 'U=' + _fmtNum(U) + ' m/s, z=' + _fmtNum(d_mm) + ' mm, \u03B7=' + _fmtNum(eta0) + ' Pa\u00B7s',
          data: (function() {
            var pts = [];
            var grad = U / d;
            for (var j = 0; j <= 50; j++) {
              var Av = 0.01 + j * 0.99 / 50;
              var Fv = eta0 * grad * Av;
              pts.push([Av, Fv]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-f-eta',
          title: '\u7C98\u6027\u529B vs \u7C98\u5EA6\u7CFB\u6570',
          xLabel: '\u03B7 (Pa\u00B7s)',
          yLabel: 'F (N)',
          subtitle: 'U=' + _fmtNum(U) + ' m/s, z=' + _fmtNum(d_mm) + ' mm, A=' + _fmtNum(A) + ' m\u00B2',
          data: (function() {
            var pts = [];
            var grad = U / d;
            for (var j = 0; j <= 50; j++) {
              var etav = 0.00005 + j * 1.99995 / 50;
              var Fv = etav * grad * A;
              pts.push([etav, Fv]);
            }
            return pts;
          })()
        }
      ],
      analysisText: '<p>本报告记录教学仿真，不是对自然规律的独立实测验证。关系拟合仅适用于同一控制条件组；应依据记录、模型适用范围与不确定度自行形成结论。</p>' + (exp==='stokes' ? '<p>球体运动由统一阻力模型计算。Oseen 系数采用直径雷诺数，经验区间采用平滑衔接；仅在低 Re 区域使用 Stokes 比例关系。参考曲线表示无边界运动，容器中的小球到达边界后停止。未模拟壁面、附加质量和历史力。</p>' : exp==='poiseuille' ? '<p>泊肃叶关系用于充分发展的牛顿流体圆管层流；Re ≥ 2000 时仅展示公式外推，不据此声称层流模型成立。</p>' : '<p>牛顿黏性关系用于所声明的平行板、牛顿流体和速度梯度模型。</p>')
    };

  } else if (exp === 'poiseuille') {
    var R0 = params.radius || 0.002;
    var L = params.length || 1.0;
    var dP = params.pressure || 1000;
    var mu = params.viscosity || 0.001;
    var rho = params.density || 1000;

    var rVals = [0.3, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0].map(function(f) { return R0 * f; });
    var maxR = rVals[6];
    var xRange = maxR * 1.1;

    // 计算最大umax
    var umaxArr = rVals.map(function(R) { return dP * R * R / (4 * mu * L); });
    var yMax = Math.max.apply(null, umaxArr) * 1.1;

    var series = [];
    var tableRows = [];
    var N = 100;

    for (var i = 0; i < 7; i++) {
      var R = rVals[i];
      var umax = umaxArr[i];
      var data = [];
      for (var j = 0; j <= N; j++) {
        var r = -xRange + 2 * xRange * j / N;
        var u = (Math.abs(r) <= R) ? umax * (1 - r * r / (R * R)) : 0;
        data.push([r, u]);
      }
      series.push({
        name: 'R=' + _fmtNum(R) + ' m',
        type: 'line',
        data: data,
        smooth: false,
        lineStyle: { color: _T7[i], width: i === 6 ? 3 : 1.8, type: _dash7[i] },
        symbol: 'none',
        showSymbol: false
      });

      // 对比数据
      var calc = PhysicsEngine.poiseuille(R, L, dP, mu, rho);
      tableRows.push([
        _fmtNum(R),
        _fmtNum(umax) + ' m/s',
        _fmtNum(calc.vmax) + ' m/s',
        _fmtNum(calc.Q) + ' m\u00B3/s',
        _fmtNum(calc.Re, 2),
        '<span style="color:#2166AC;">' + _fmtNum(Math.abs(umax - calc.vmax) / Math.max(Math.abs(umax), 1e-20) * 100, 2) + '%</span>'
      ]);
    }

    var physicsP = PhysicsEngine.poiseuille(R0, L, dP, mu, rho);
    var tau_w_P = (dP / L) * (R0 / 2);

    reportData = {
      title: '\u6CCA\u8083\u53F6\u5B9A\u5F8B\u5B9E\u9A8C\u62A5\u544A',
      subtitle: '\u7BA1\u9053\u622A\u9762\u901F\u5EA6\u5206\u5E03 u \u7684\u7814\u7A76',
      chartTitle: 'u(r) \u2014 \u4E0D\u540C\u7BA1\u5F84\u4E0B\u7684\u622A\u9762\u901F\u5EA6\u5206\u5E03',
      chartSubtitle: '\u56FA\u5B9A\u53C2\u6570: L=' + _fmtNum(L) + ' m, \u0394P=' + _fmtNum(dP) + ' Pa, \u03BC=' + _fmtNum(mu) + ' Pa\u00B7s',
      xLabel: 'r (m)',
      yLabel: 'u (m/s)',
      paramHeaders: ['\u53C2\u6570', '\u7B26\u53F7', '\u503C', '\u5355\u4F4D'],
      paramRows: [
        ['\u7BA1\u9053\u534A\u5F84', 'R', _fmtNum(R0), 'm'],
        ['\u7BA1\u9053\u957F\u5EA6', 'L', _fmtNum(L), 'm'],
        ['\u538B\u5F3A\u5DEE', '\u0394P', _fmtNum(dP), 'Pa'],
        ['\u52A8\u529B\u7C98\u5EA6', '\u03BC', _fmtNum(mu), 'Pa\u00B7s'],
        ['\u6D41\u4F53\u5BC6\u5EA6', '\u03C1', _fmtNum(rho), 'kg/m\u00B3']
      ],
      calcHeaders: ['数据名称', '符号', '值', '单位'],
      calcRows: [
        ['最大速度', 'umax', _fmtNum(physicsP.vmax), 'm/s'],
        ['体积流量', 'Q', _fmtNum(physicsP.Q), 'm³/s'],
        ['平均速度', 'u_avg', _fmtNum(physicsP.v_avg), 'm/s'],
        ['雷诺数', 'Re', _fmtNum(physicsP.Re, 2), ''],
        ['壁面切应力', 'τw', _fmtNum(tau_w_P), 'Pa']
      ],
      series: series,
      seriesF: (function() {
        var sf = [];
        var dP_over_L_max = (dP / L) * 3;
        for (var k = 0; k < 7; k++) {
          var R = rVals[k];
          var dataF = [];
          for (var m = 0; m <= N; m++) {
            var x = dP_over_L_max * m / N;
            var umax_v = x * R * R / (4 * mu);
            dataF.push([x, umax_v]);
          }
          sf.push({
            name: 'R=' + _fmtNum(R) + ' m',
            type: 'line',
            data: dataF,
            smooth: false,
            lineStyle: { color: _T7[k], width: k === 6 ? 3 : 1.8, type: _dash7[k] },
            symbol: 'none',
            showSymbol: false
          });
        }
        return sf;
      })(),
      chartTitleF: 'umax vs ΔP/L — 不同管径下的最大速度响应',
      chartSubtitleF: '固定参数: L=' + _fmtNum(L) + ' m, μ=' + _fmtNum(mu) + ' Pa·s',
      xLabelF: 'ΔP/L (Pa/m)',
      yLabelF: 'umax (m/s)',
      smallCharts: [
        {
          id: 'sc-u-dpdl',
          title: '体积流率Q-压力差 ΔP',
          xLabel: 'ΔP (Pa)',
          yLabel: 'Q (m³/s)',
          subtitle: 'R=' + _fmtNum(R0) + ' m, L=' + _fmtNum(L) + ' m, μ=' + _fmtNum(mu) + ' Pa·s',
          data: (function() {
            var pts = [];
            var dPmin = dP * 0.1, dPmax = dP * 3;
            for (var j = 0; j <= 50; j++) {
              var dPv = dPmin + j * (dPmax - dPmin) / 50;
              var Qv = Math.PI * Math.pow(R0, 4) * dPv / (8 * mu * L);
              pts.push([dPv, Qv]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-u-mu',
          title: '体积流率Q-管道长度 L',
          xLabel: 'L (m)',
          yLabel: 'Q (m³/s)',
          subtitle: 'R=' + _fmtNum(R0) + ' m, ΔP=' + _fmtNum(dP) + ' Pa, μ=' + _fmtNum(mu) + ' Pa·s',
          data: (function() {
            var pts = [];
            var Lmin = L * 0.2, Lmax = L * 3;
            for (var j = 0; j <= 50; j++) {
              var Lv = Lmin + j * (Lmax - Lmin) / 50;
              var Q = Math.PI * Math.pow(R0, 4) * dP / (8 * mu * Lv);
              pts.push([Lv, Q]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-u-r',
          title: '体积流率Q-黏度系数 η',
          xLabel: 'μ (Pa·s)',
          yLabel: 'Q (m³/s)',
          subtitle: 'R=' + _fmtNum(R0) + ' m, ΔP=' + _fmtNum(dP) + ' Pa, L=' + _fmtNum(L) + ' m',
          data: (function() {
            var pts = [];
            var muMin = mu * 0.1, muMax = mu * 3;
            for (var j = 0; j <= 50; j++) {
              var mu_v = muMin + j * (muMax - muMin) / 50;
              var Qv = Math.PI * Math.pow(R0, 4) * dP / (8 * mu_v * L);
              pts.push([mu_v, Qv]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-q-r',
          title: 'Q vs 管径 R',
          xLabel: 'R (m)',
          yLabel: 'Q (m³/s)',
          subtitle: 'ΔP=' + _fmtNum(dP) + ' Pa, L=' + _fmtNum(L) + ' m, μ=' + _fmtNum(mu) + ' Pa·s',
          data: (function() {
            var pts = [];
            var Rmax = R0 * 3;
            for (var j = 0; j <= 50; j++) {
              var Rv = 0.0001 + j * (Rmax - 0.0001) / 50;
              var Qv = Math.PI * Math.pow(Rv, 4) * dP / (8 * mu * L);
              pts.push([Rv, Qv]);
            }
            return pts;
          })()
        }
      ],
      analysisText: '<p>本报告记录教学仿真，不是对自然规律的独立实测验证。关系拟合仅适用于同一控制条件组；应依据记录、模型适用范围与不确定度自行形成结论。</p>' + (exp==='stokes' ? '<p>球体运动由统一阻力模型计算。Oseen 系数采用直径雷诺数，经验区间采用平滑衔接；仅在低 Re 区域使用 Stokes 比例关系。参考曲线表示无边界运动，容器中的小球到达边界后停止。未模拟壁面、附加质量和历史力。</p>' : exp==='poiseuille' ? '<p>泊肃叶关系用于充分发展的牛顿流体圆管层流；Re ≥ 2000 时仅展示公式外推，不据此声称层流模型成立。</p>' : '<p>牛顿黏性关系用于所声明的平行板、牛顿流体和速度梯度模型。</p>')
    };

  } else if (exp === 'stokes') {
    var r0 = params.ballRadius || 0.001;
    var rhoP = params.ballDensity || 2500;
    var rhoF = params.fluidDensity || 1000;
    var muS = params.viscosity || 0.001;
    var g = 9.8;

    var rVals = [0.3, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0].map(function(f) { return r0 * f; });

    // 计算各条曲线的vt和tau
    var vtArr = rVals.map(function(r) {
      return PhysicsEngine.stokes(r,rhoP,rhoF,muS,g).vt;
    });
    var tauArr = rVals.map(function(r) {
      return 2 * rhoP * r * r / (9 * muS);
    });

    // X轴范围：取最大tau的5倍
    var maxTau = Math.max.apply(null, tauArr);
    var xMax = maxTau * 5;
    var yMax = Math.max.apply(null, vtArr) * 1.15;

    var series = [];
    var tableRows = [];
    var N = 200;

    for (var i = 0; i < 7; i++) {
      var r = rVals[i];
      var vt = vtArr[i];
      var tau = tauArr[i];
      var data = sphereReferenceCurve(r,rhoP,rhoF,muS,xMax,N);
      series.push({
        name: 'r=' + _fmtNum(r) + ' m',
        type: 'line',
        data: data,
        smooth: false,
        lineStyle: { color: _T7[i], width: i === 6 ? 3 : 1.8, type: _dash7[i] },
        symbol: 'none',
        showSymbol: false
      });

      // 对比数据
      var calc = PhysicsEngine.stokes(r, rhoP, rhoF, muS, g);
      tableRows.push([
        _fmtNum(r),
        _fmtNum(vt) + ' m/s',
        _fmtNum(calc.vt) + ' m/s',
        _fmtNum(tau) + ' s',
        _fmtNum(calc.Re, 2),
        '<span style="color:#2166AC;">' + _fmtNum(Math.abs(vt - calc.vt) / Math.max(Math.abs(vt), 1e-20) * 100, 2) + '%</span>'
      ]);
    }

    var physicsS = PhysicsEngine.stokes(r0, rhoP, rhoF, muS, g);
    var F_drag_S = PhysicsEngine.stokesDrag(muS,r0,physicsS.vt,rhoF);

    reportData = {
      title: '\u65AF\u6258\u514B\u65AF\u5B9A\u5F8B\u5B9E\u9A8C\u62A5\u544A',
      subtitle: '\u7403\u4F53\u6C89\u964D\u901F\u5EA6 v(t)\u4E0E\u9ECF\u6EDE\u963B\u529B\u7684\u7814\u7A76',
      chartTitle: 'v(t) \u2014 \u4E0D\u540C\u7403\u534A\u5F84\u4E0B\u7684\u6C89\u964D\u901F\u5EA6\u54CD\u5E94',
      chartSubtitle: '\u56FA\u5B9A\u53C2\u6570: \u03C1p=' + _fmtNum(rhoP) + ' kg/m\u00B3, \u03C1f=' + _fmtNum(rhoF) + ' kg/m\u00B3, \u03BC=' + _fmtNum(muS) + ' Pa\u00B7s',
      xLabel: 't (s)',
      yLabel: 'v (m/s)',
      paramHeaders: ['\u53C2\u6570', '\u7B26\u53F7', '\u503C', '\u5355\u4F4D'],
      paramRows: [
        ['\u5C0F\u7403\u534A\u5F84', 'r', _fmtNum(r0), 'm'],
        ['\u5C0F\u7403\u5BC6\u5EA6', '\u03C1p', _fmtNum(rhoP), 'kg/m\u00B3'],
        ['\u6D41\u4F53\u5BC6\u5EA6', '\u03C1f', _fmtNum(rhoF), 'kg/m\u00B3'],
        ['\u52A8\u529B\u7C98\u5EA6', '\u03BC', _fmtNum(muS), 'Pa\u00B7s']
      ],
      calcHeaders: ['数据名称', '符号', '值', '单位'],
      calcRows: [
        ['终极速度', 'vt', _fmtNum(physicsS.vt), 'm/s'],
        ['Stokes 线性时间尺度（非线性区仅作参考）', 'τ₀', _fmtNum(2 * rhoP * r0 * r0 / (9 * muS)), 's'],
        ['雷诺数', 'Re', _fmtNum(physicsS.Re, 2), ''],
        ['黏滞阻力', 'Fd', _fmtNum(F_drag_S), 'N']
      ],
      series: series,
      mediumCharts: [
        {
          id: 'mc-f-eta',
          title: 'F vs 粘度系数 η',
          xLabel: 'μ (Pa·s)',
          yLabel: 'F (N)',
          subtitle: 'v=' + _fmtNum(physicsS.vt) + ' m/s (参考速度)',
          series: (function() {
            var v_ref = physicsS.vt;
            var muMin = 0.00005, muMax = 2.0;
            var Npts = 50;
            var all = [];
            for (var i = 0; i < 7; i++) {
              var r_i = rVals[i];
              var pts = [];
              for (var j = 0; j <= Npts; j++) {
                var mu_v = muMin + j * (muMax - muMin) / Npts;
                var Fv = PhysicsEngine.stokesDrag(mu_v,r_i,v_ref,rhoF);
                pts.push([mu_v, Fv]);
              }
              all.push({
                name: 'r=' + _fmtNum(r_i) + ' m',
                data: pts,
                color: _T7[i],
                dash: _dash7[i],
                width: i === 6 ? 3 : 1.8
              });
            }
            return all;
          })()
        },
        {
          id: 'mc-f-r',
          title: 'F vs 小球半径 R',
          xLabel: 'r (m)',
          yLabel: 'F (N)',
          subtitle: 'v=' + _fmtNum(physicsS.vt) + ' m/s (参考速度)',
          series: (function() {
            var v_ref = physicsS.vt;
            var rMin = 0.0001, rMax = r0 * 3;
            var etaMuls = [0.3, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0];
            var Npts = 50;
            var all = [];
            for (var i = 0; i < 7; i++) {
              var mu_i = muS * etaMuls[i];
              var pts = [];
              for (var j = 0; j <= Npts; j++) {
                var rv = rMin + j * (rMax - rMin) / Npts;
                var Fv = PhysicsEngine.stokesDrag(mu_i,rv,v_ref,rhoF);
                pts.push([rv, Fv]);
              }
              all.push({
                name: 'μ=' + _fmtNum(mu_i) + ' Pa·s',
                data: pts,
                color: _T7[i],
                dash: _dash7[i],
                width: i === 6 ? 3 : 1.8
              });
            }
            return all;
          })()
        }
      ],
      smallCharts: [
        {
          id: 'sc-vt-eta',
          title: 'vt vs 粘度系数 η',
          xLabel: 'μ (Pa·s)',
          yLabel: 'vt (m/s)',
          subtitle: 'r=' + _fmtNum(r0) + ' m, ρp=' + _fmtNum(rhoP) + ' kg/m³, ρf=' + _fmtNum(rhoF) + ' kg/m³',
          data: (function() {
            var pts = [];
            for (var j = 0; j <= 50; j++) {
              var mu_v = 0.00005 + j * 1.99995 / 50;
              var vt_v = PhysicsEngine.stokes(r0,rhoP,rhoF,mu_v,g).vt;
              pts.push([mu_v, vt_v]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-vt-rhop',
          title: 'vt vs 小球密度 ρp',
          xLabel: 'ρp (kg/m³)',
          yLabel: 'vt (m/s)',
          subtitle: 'r=' + _fmtNum(r0) + ' m, ρf=' + _fmtNum(rhoF) + ' kg/m³, μ=' + _fmtNum(muS) + ' Pa·s',
          data: (function() {
            var pts = [];
            var rhoMin = rhoF + 100;
            var rhoMax = rhoP * 3;
            for (var j = 0; j <= 50; j++) {
              var rho_v = rhoMin + j * (rhoMax - rhoMin) / 50;
              var vt_v = PhysicsEngine.stokes(r0,rho_v,rhoF,muS,g).vt;
              pts.push([rho_v, vt_v]);
            }
            return pts;
          })()
        },
        {
          id: 'sc-vt-rhof',
          title: 'vt vs 流体密度 ρf',
          xLabel: 'ρf (kg/m³)',
          yLabel: 'vt (m/s)',
          subtitle: 'r=' + _fmtNum(r0) + ' m, ρp=' + _fmtNum(rhoP) + ' kg/m³, μ=' + _fmtNum(muS) + ' Pa·s',
          data: (function() {
            var pts = [];
            var rhoMax = rhoP - 100;
            for (var j = 0; j <= 50; j++) {
              var rf_v = 1 + j * (rhoMax - 1) / 50;
              var vt_v = PhysicsEngine.stokes(r0,rhoP,rf_v,muS,g).vt;
              pts.push([rf_v, vt_v]);
            }
            return pts;
          })()
        }
      ],
            analysisText: '<p>本报告记录教学仿真，不是对自然规律的独立实测验证。关系拟合仅适用于同一控制条件组；应依据记录、模型适用范围与不确定度自行形成结论。</p>' + (exp==='stokes' ? '<p>球体运动由统一阻力模型计算。Oseen 系数采用直径雷诺数，经验区间采用平滑衔接；仅在低 Re 区域使用 Stokes 比例关系。参考曲线表示无边界运动，容器中的小球到达边界后停止。未模拟壁面、附加质量和历史力。</p>' : exp==='poiseuille' ? '<p>泊肃叶关系用于充分发展的牛顿流体圆管层流；Re ≥ 2000 时仅展示公式外推，不据此声称层流模型成立。</p>' : '<p>牛顿黏性关系用于所声明的平行板、牛顿流体和速度梯度模型。</p>')
    };
  }

  // ---- 构建报告HTML ----
  var chartOpt = pubChartOpt7(reportData.chartTitle, reportData.chartSubtitle, reportData.xLabel, reportData.yLabel);
  chartOpt.series = reportData.series;

  var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
    '<title>' + reportData.title + '</title>\n' +
    offlineLabPlotScript() +
    '<style>\n' +
    '@page { margin: 20mm; size: A4; }\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; padding: 30px 50px; line-height: 1.6; }\n' +
    '.report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }\n' +
    '.report-header h1 { font-size: 22px; font-weight: bold; margin-bottom: 6px; }\n' +
    '.report-header p { font-size: 14px; color: #333; }\n' +
    '.section { margin-bottom: 28px; }\n' +
    '.section h2 { font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #ccc; }\n' +
    '.chart-box { width: 100%; height: 500px; margin: 10px 0; }\n' +
	    '.charts-row { display: flex; gap: 12px; margin: 10px 0; }\n' +
	    '.chart-box-half { flex: 1; min-width: 0; height: 500px; }\n' +
	    '.medium-charts-row { display: flex; gap: 14px; margin: 16px 0 8px; flex-wrap: wrap; }\n' +
	    '.medium-chart { flex: 1; min-width: 280px; height: 320px; }\n' +
    '.small-charts-row { display: flex; gap: 12px; margin: 16px 0 8px; flex-wrap: wrap; }\n' +
    '.small-chart { flex: 1; min-width: 200px; height: 260px; }\n' +
    '.dyn-charts-row { display: flex; gap: 14px; margin: 10px 0; flex-wrap: wrap; }\n' +
    '.dyn-chart { flex: 1 1 440px; min-width: 320px; height: 420px; }\n' +
    '@media print { .dyn-chart { height: 340px; } }\n' +
    '.tip-box { background: #f5f7fb; border-left: 3px solid #5b6abf; padding: 8px 12px; font-size: 12px; color: #444; margin: 8px 0; }\n' +
    '@media print { .small-chart { height: 220px; } }\n' +
    '.note { font-size: 12px; color: #666; margin-top: 8px; }\n' +
    '.analysis-content { font-size: 14px; line-height: 1.9; text-align: justify; }\n' +
    '.analysis-content p { margin-bottom: 10px; text-indent: 2em; }\n' +
    '.analysis-content b { color: #2166AC; }\n' +
    '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }\n' +
    '.toolbar-wrap { display: flex; justify-content: space-between; align-items: flex-start; margin: 10px 0 20px; }\n' +
    '.toolbar-wrap button { padding: 6px 16px; border: 1px solid #999; border-radius: 3px; background: #f5f5f5; color: #333; cursor: pointer; font-size: 12px; font-family: Arial, Helvetica, sans-serif; }\n' +
    '.toolbar-right button { margin-left: 8px; }\n' +
    '.toolbar-wrap button:hover { background: #e0e0e0; }\n' +
    '.fig-wrap { position: relative; display: block; }\n' +
    '.fig-inner { display: block; width: 100%; height: 100%; }\n' +
    '.fig-dl { position: absolute; top: 4px; right: 4px; z-index: 5; padding: 2px 8px; font-size: 11px; font-family: inherit; color: #333; background: #fff; border: 1px solid #b9b9b9; border-radius: 3px; cursor: pointer; opacity: 0.3; }\n' +
    '.fig-wrap:hover .fig-dl { opacity: 1; }\n' +
    '.fig-dl:hover { background: #f0f0f0; }\n' +
    '@media print { .fig-dl { display: none; } }\n' +
    '@media print { body { padding: 15px 25px; } .chart-box { height: 420px; } .toolbar-wrap { display: none; } }\n' +
    '</style>\n</head>\n<body>\n' +

    '<div class="report-header">\n' +
    '  <h1>' + reportData.title + '</h1>\n' +
    '  <p>' + reportData.subtitle + '</p>\n' +
    '  <p class="note">\u751F\u6210\u65F6\u95F4: ' + new Date().toLocaleString('zh-CN') + '</p>\n' +
    '</div>\n' +

    '<div class="toolbar-wrap">\n' +
    '  <div class="toolbar-left"><button onclick="window.close()">✕ 关闭</button></div>\n' +
    '  <div class="toolbar-right">' +
    '<button id="btn-save-all"> 保存全部图像</button> ' +
    '<button id="btn-pdf" title="调起浏览器打印，在目标处选择「另存为 PDF」"> 打印 / 导出 PDF</button></div>\n' +
    '</div>\n' +

    (function () {
      var n = 0, parts = [];
      function S(title, body) {
        n++;
        parts.push('<div class="section">\n  <h2>' + n + '. ' + title + '</h2>\n' + body + '</div>\n');
      }

      // 图表序号 + 单图下载按钮（供「保存全部图像」与「保存为PNG」使用）
      reportChartInfos = [];
      function figWrap(id, cls) {
        var figNo = reportChartInfos.length + 1;
        reportChartInfos.push({ id: id, figNo: figNo });
        return '<div class="' + cls + ' fig-wrap" data-fig="' + figNo + '">' +
          '<div class="fig-inner" id="' + id + '"></div>' +
          '<button class="fig-dl" data-chart="' + id + '" data-fig="' + figNo + '" title="只保存这一张图像">保存此图</button>' +
          '</div>';
      }

      S('\u5B9E\u9A8C\u53C2\u6570', _threeLineTable(reportData.paramHeaders, reportData.paramRows));

      if (reportData.calcRows) {
        S('\u8BA1\u7B97\u7ED3\u679C', _threeLineTable(reportData.calcHeaders, reportData.calcRows));
      }

      // ===== 由学生真实操作生成的章节（无操作时不出现）=====
      if (measured.hasData) {
        if (measured.statRows.length) {
          S('\u53C2\u6570\u8C03\u8282\u7EDF\u8BA1\u4E0E\u5173\u7CFB\u62DF\u5408',
            _threeLineTable(['\u53C2\u6570', '\u91C7\u6837\u70B9\u6570', '\u8C03\u8282\u8303\u56F4', '\u54CD\u5E94\u91CF\u53D8\u5316',
              '\u62DF\u5408\u5173\u7CFB', 'R\u00B2', '\u5E73\u5747\u8BEF\u5DEE'],
              measured.statRows, ['16%', '9%', '22%', '22%', '17%', '7%', '7%']));
        }

        if (measured.charts.length) {
          S('仿真记录\u56FE\u50CF',
            '<div class="dyn-charts-row">\n' +
            measured.charts.map(function (c) { return '  ' + figWrap(c.id, 'dyn-chart'); }).join('\n') + '\n' +
            '</div>\n' +
            '<div class="tip-box">本组图像完全依据你在本次实验中的真实操作绘制：调节过哪些参数，就绘制该参数与响应量的仿真关系曲线（含理论曲线与拟合曲线）；运行过仿真，就给出实测时序曲线；切换过多种流体，就给出流体对比图。操作不同，图像的数量与类型也不同。</div>');
        }

        if (measured.table) {
          S('仿真记录\u660E\u7EC6',
            _threeLineTable(measured.table.headers, measured.table.rows) +
            (measured.table.note ? '<p class="note">' + measured.table.note + '</p>' : ''));
        }
      }

      // ===== 理论参考曲线 =====
      var theoryBody = (reportData.seriesF ?
        '  <div class="charts-row">\n' +
        '    ' + figWrap('reportChart', 'chart-box-half') + '\n' +
        '    ' + figWrap('reportChartF', 'chart-box-half') + '\n' +
        '  </div>\n' :
        '  ' + figWrap('reportChart', 'chart-box') + '\n') +
        (reportData.mediumCharts ? '<div class="medium-charts-row">\n' +
        reportData.mediumCharts.map(function (mc) { return '  ' + figWrap(mc.id, 'medium-chart'); }).join('\n') + '\n' +
        '</div>\n' : '') +
        (reportData.smallCharts ? '<div class="small-charts-row">\n' +
        reportData.smallCharts.map(function (sc) { return '  ' + figWrap(sc.id, 'small-chart'); }).join('\n') + '\n' +
        '</div>\n' : '');
      if (!measured.hasData) {
        theoryBody = '<div class="tip-box">本次未记录到实验操作（未调节参数、未运行仿真），以下为理论参考曲线。调节滑块或运行仿真后再导出，报告会给出属于你自己的仿真记录曲线。</div>' + theoryBody;
      }
      S(measured.hasData ? '\u7406\u8BBA\u53C2\u8003\u66F2\u7EBF' : '\u591A\u66F2\u7EBF\u5BF9\u6BD4\u56FE', theoryBody);

      S('\u5B9E\u9A8C\u7ED3\u679C\u5206\u6790',
        '<div class="analysis-content">' +
        (measured.analysis || '') +
        (measured.analysis ? '<p style="text-indent:0;"><b>\u7406\u8BBA\u5BF9\u7167\u5206\u6790\uff1a</b></p>' : '') +
        (reportData.analysisText || '<p>\u6682\u65E0\u5206\u6790\u6570\u636E\u3002</p>') +
        '</div>');

      return parts.join('\n');
    })() +

    '<div class="footer">\n' +
    '  \u9ECF\u6027\u73B0\u8C61\u4EFF\u771F\u6A21\u62DF\u5668 \u2014 \u81EA\u52A8\u751F\u6210\u5B9E\u9A8C\u62A5\u544A\n' +
    '</div>\n' +

    '<script>\n' +
    'var chartList = ' + JSON.stringify(reportChartInfos) + ';\n' +
    'var figCharts = {};\n' +
    'function slug(s) { return String(s || "").replace(/[\\\\\\/:*?"<>|\\s]+/g, "_").slice(0, 60) || "chart"; }\n' +
    'function saveFig(c, name) {\n' +
    '  var url = c.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });\n' +
    '  var a = document.createElement("a"); a.href = url; a.download = name + ".png"; a.click();\n' +
    '}\n' +
    'function collectFigures() {\n' +
    '  if (window.__figs) return window.__figs;\n' +
    '  var out = [];\n' +
    '  chartList.forEach(function(info) {\n' +
    '    var c = figCharts[info.id];\n' +
    '    if (!c) return;\n' +
    '    var t = "";\n' +
    '    try { t = c.getOption().title[0].text; } catch (e) {}\n' +
    '    out.push({ no: info.figNo, title: t, name: "图" + info.figNo + "_" + slug(t), chart: c });\n' +
    '  });\n' +
    '  window.__figs = out;\n' +
    '  return out;\n' +
    '}\n' +
    'function afterNextPaint(fn) {\n' +
    '  requestAnimationFrame(function() { requestAnimationFrame(function() { setTimeout(fn, 60); }); });\n' +
    '}\n' +

    'document.querySelectorAll(".fig-dl").forEach(function(btn) {\n' +
    '  btn.addEventListener("click", function() {\n' +
    '    var id = btn.getAttribute("data-chart");\n' +
    '    var no = btn.getAttribute("data-fig");\n' +
    '    var c = figCharts[id];\n' +
    '    if (!c) { alert("图像尚未就绪，请稍候再试。"); return; }\n' +
    '    var t = "";\n' +
    '    try { t = c.getOption().title[0].text; } catch (e) {}\n' +
    '    saveFig(c, "图" + no + "_" + slug(t));\n' +
    '  });\n' +
    '});\n' +
    'var _saveAllBtn = document.getElementById("btn-save-all");\n' +
    'if (_saveAllBtn) {\n' +
    '  var _alt = document.createElement("a");\n' +
    '  _alt.textContent = "或点此逐张保存";\n' +
    '  _alt.style.cssText = "margin-left:10px;font-size:12px;color:#2166AC;cursor:pointer;text-decoration:underline;";\n' +
    '  _alt.addEventListener("click", saveAllFigures);\n' +
    '  _saveAllBtn.parentNode.insertBefore(_alt, _saveAllBtn.nextSibling);\n' +
    '}\n' +

    'function saveAllFigures() {\n' +
    '  var figs = collectFigures();\n' +
    '  if (!figs.length) { alert("报告中没有可保存的图像。"); return; }\n' +
    '  figs.forEach(function(f, i) {\n' +
    '    setTimeout(function() { saveFig(f.chart, f.name); }, i * 400);\n' +
    '  });\n' +
    '}\n' +

    'var ZIP_STORE = (function() {\n' +
    '  var T = (function() { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();\n' +
    '  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }\n' +
    '  function enc(s) { return new TextEncoder().encode(s); }\n' +
    '  return function zip(files) {\n' +
    '    var parts = [], central = [], offset = 0, count = 0;\n' +
    '    files.forEach(function(f) {\n' +
    '      var nb = enc(f.name), data = f.data, crc = crc32(data), sz = data.length;\n' +
    '      var lh = new Uint8Array(30 + nb.length), dv = new DataView(lh.buffer);\n' +
    '      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);\n' +
    '      dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);\n' +
    '      dv.setUint32(14, crc, true); dv.setUint32(18, sz, true); dv.setUint32(22, sz, true);\n' +
    '      dv.setUint16(26, nb.length, true); dv.setUint16(28, 0, true);\n' +
    '      lh.set(nb, 30); parts.push(lh, data);\n' +
    '      var ch = new Uint8Array(46 + nb.length), dc = new DataView(ch.buffer);\n' +
    '      dc.setUint32(0, 0x02014b50, true); dc.setUint16(4, 20, true); dc.setUint16(6, 20, true); dc.setUint16(8, 0x0800, true);\n' +
    '      dc.setUint32(16, crc, true); dc.setUint32(20, sz, true); dc.setUint32(24, sz, true);\n' +
    '      dc.setUint16(28, nb.length, true); dc.setUint32(42, offset, true);\n' +
    '      ch.set(nb, 46); central.push(ch);\n' +
    '      offset += lh.length + sz; count++;\n' +
    '    });\n' +
    '    var cdSize = central.reduce(function(a, b) { return a + b.length; }, 0);\n' +
    '    var end = new Uint8Array(22), de = new DataView(end.buffer);\n' +
    '    de.setUint32(0, 0x06054b50, true); de.setUint16(8, count, true); de.setUint16(10, count, true);\n' +
    '    de.setUint32(12, cdSize, true); de.setUint32(16, offset, true);\n' +
    '    return new Blob(parts.concat(central, [end]), { type: "application/zip" });\n' +
    '  };\n' +
    '})();\n' +

    'function downloadBlob(blob, name) {\n' +
    '  var u = URL.createObjectURL(blob);\n' +
    '  var a = document.createElement("a"); a.href = u; a.download = name; a.click();\n' +
    '  setTimeout(function() { URL.revokeObjectURL(u); }, 60000);\n' +
    '}\n' +

    'function saveAllZip() {\n' +
    '  var figs = collectFigures();\n' +
    '  if (!figs.length) { alert("报告中没有可导出的图像。"); return; }\n' +
    '  var files = figs.map(function(f) {\n' +
    '    var b64 = f.chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" }).split(",")[1];\n' +
    '    var bin = atob(b64), u8 = new Uint8Array(bin.length);\n' +
    '    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);\n' +
    '    return { name: f.name + ".png", data: u8 };\n' +
    '  });\n' +
    '  downloadBlob(ZIP_STORE(files), "实验报告图像_" + files.length + "张.zip");\n' +
    '}\n' +

    // 导出 PDF：直接用浏览器自带打印功能（打印对话框里「目标」选「另存为 PDF」即可）
    'function exportPdf() {\n' +
    '  try {\n' +
    '    window.print();\n' +
    '  } catch (e) {\n' +
    '    alert("无法调起打印：可手动按 Ctrl+P（macOS 按 ⌘P），在目标处选择「另存为 PDF」。");\n' +
    '  }\n' +
    '}\n' +

    'document.getElementById("btn-save-all").addEventListener("click", saveAllZip);\n' +
    'document.getElementById("btn-pdf").addEventListener("click", exportPdf);\n' +

    'var chartDom = document.getElementById("reportChart");\n' +
    'var myChart = LabPlot.create(chartDom);\n' +
    'var option = ' + JSON.stringify(chartOpt) + ';\n' +
    'myChart.setOption(option);\n' +
    'figCharts["reportChart"] = myChart;\n' +
    'window.addEventListener("resize", function() { myChart.resize(); });\n' +
    (reportData.seriesF ?
    'var chartOptF = ' + JSON.stringify(pubChartOpt7(reportData.chartTitleF, reportData.chartSubtitleF, reportData.xLabelF, reportData.yLabelF)) + ';\n' +
    'chartOptF.series = ' + JSON.stringify(reportData.seriesF) + ';\n' +
    'var myChartF = LabPlot.create(document.getElementById("reportChartF"));\n' +
    'myChartF.setOption(chartOptF);\n' +
    'figCharts["reportChartF"] = myChartF;\n' +
    'window.addEventListener("resize", function() { myChartF.resize(); });\n' : '') +
    'var dynChartsData = ' + JSON.stringify(measured.charts) + ';\n' +
    'if(dynChartsData && dynChartsData.length){\n' +
    '  var dynInstances = [];\n' +
    '  dynChartsData.forEach(function(c){\n' +
    '    var d = document.getElementById(c.id);\n' +
    '    if(!d) return;\n' +
    '    var ch = LabPlot.create(d);\n' +
    '    ch.setOption(c.opt);\n' +
    '    figCharts[c.id] = ch;\n' +
    '    dynInstances.push(ch);\n' +
    '  });\n' +
    '  window.addEventListener("resize", function(){ dynInstances.forEach(function(c){ c.resize(); }); });\n' +
    '}\n' +
    'var mediumChartsData = ' + JSON.stringify(reportData.mediumCharts) + ';\n' +
    'if(mediumChartsData && mediumChartsData.length){\n' +
    '  var mcInstances = [];\n' +
    '  mediumChartsData.forEach(function(mc) {\n' +
    '    var dom = document.getElementById(mc.id);\n' +
    '    if(!dom) return;\n' +
    '    var chart = LabPlot.create(dom);\n' +
    '    chart.setOption({\n' +
    '      backgroundColor: "#ffffff",\n' +
    '      title: { text: mc.title, subtext: mc.subtitle, left: "center", top: 4, textStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 11, fontWeight: "bold", color: "#000000" }, subtextStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 8, color: "#555555" } },\n' +
    '      tooltip: { trigger: "axis", textStyle: { fontSize: 10 } },\n' +
    '      grid: (mc.series && mc.series.length ? { left: 55, right: 75, top: 60, bottom: 30 } : { left: 55, right: 15, top: 60, bottom: 30 }),\n' +
    '      legend: (mc.series && mc.series.length ? { type: "scroll", orient: "vertical", right: 5, top: 55, textStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 8, color: "#000000" }, itemWidth: 16, itemHeight: 8 } : { show: false }),\n' +
    '      xAxis: { type: "value", name: mc.xLabel, nameLocation: "middle", nameGap: 22, nameTextStyle: { fontSize: 10, fontWeight: "bold", color: "#000000" }, axisLine: { lineStyle: { color: "#000000", width: 1 } }, axisLabel: { fontSize: 9, color: "#000000" }, splitLine: { show: false } },\n' +
    '      yAxis: { type: "value", name: mc.yLabel, nameLocation: "middle", nameGap: 45, nameTextStyle: { fontSize: 10, fontWeight: "bold", color: "#000000" }, axisLine: { lineStyle: { color: "#000000", width: 1 } }, axisLabel: { fontSize: 9, color: "#000000" }, splitLine: { show: false } },\n' +
    '      series: (mc.series && mc.series.length ? mc.series.map(function(s) { return { type: "line", name: s.name, data: s.data, smooth: true, symbol: "none", lineStyle: { color: s.color, width: s.width || 1.8, type: s.dash || "solid" } }; }) : [{ type: "line", data: mc.data, smooth: true, symbol: "none", lineStyle: { color: "#2166AC", width: 1.8 } }]),\n' +
    '      animation: false\n' +
    '    });\n' +
    '    figCharts[mc.id] = chart;\n' +
    '    mcInstances.push(chart);\n' +
    '  });\n' +
    '  window.addEventListener("resize", function() { mcInstances.forEach(function(c) { c.resize(); }); });\n' +
    '}\n' +
    'var smallChartsData = ' + JSON.stringify(reportData.smallCharts) + ';\n' +
    'if(smallChartsData && smallChartsData.length){\n' +
    '  var scInstances = [];\n' +
    '  smallChartsData.forEach(function(sc) {\n' +
    '    var dom = document.getElementById(sc.id);\n' +
    '    if(!dom) return;\n' +
    '    var chart = LabPlot.create(dom);\n' +
    '    chart.setOption({\n' +
    '      backgroundColor: "#ffffff",\n' +
    '      title: { text: sc.title, subtext: sc.subtitle, left: "center", top: 4, textStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 11, fontWeight: "bold", color: "#000000" }, subtextStyle: { fontFamily: "Arial,Helvetica,sans-serif", fontSize: 8, color: "#555555" } },\n' +
    '      tooltip: { trigger: "axis", textStyle: { fontSize: 10 } },\n' +
    '      grid: { left: 50, right: 15, top: 60, bottom: 30 },\n' +
    '      xAxis: { type: "value", name: sc.xLabel, nameLocation: "middle", nameGap: 22, nameTextStyle: { fontSize: 10, fontWeight: "bold", color: "#000000" }, axisLine: { lineStyle: { color: "#000000", width: 1 } }, axisLabel: { fontSize: 9, color: "#000000" }, splitLine: { show: false } },\n' +
    '      yAxis: { type: "value", name: sc.yLabel, nameLocation: "middle", nameGap: 40, nameTextStyle: { fontSize: 10, fontWeight: "bold", color: "#000000" }, axisLine: { lineStyle: { color: "#000000", width: 1 } }, axisLabel: { fontSize: 9, color: "#000000" }, splitLine: { show: false } },\n' +
    '      series: [{ type: "line", data: sc.data, smooth: true, symbol: "none", lineStyle: { color: "#2166AC", width: 1.8 } }],\n' +
    '      animation: false\n' +
    '    });\n' +
    '    figCharts[sc.id] = chart;\n' +
    '    scInstances.push(chart);\n' +
    '  });\n' +
    '  window.addEventListener("resize", function() { scInstances.forEach(function(c) { c.resize(); }); });\n' +
    '}\n' +
    '<\/script>\n' +
    '</body>\n</html>';

  // ---- 打开新窗口 ----
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, '_blank');
  if (!win) {
    // 弹窗被拦截，使用替代方案
    var a = document.createElement('a');
    a.href = url;
    a.download = (reportData.title || 'experiment-report') + '.html';
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } else {
    // 窗口关闭后释放Blob URL
    var checkClosed = setInterval(function() {
      if (win.closed) {
        clearInterval(checkClosed);
        URL.revokeObjectURL(url);
      }
    }, 1000);
    // 兜底：5 分钟后强制撤销 Blob URL，避免弹窗长期未关导致内存泄漏
    setTimeout(function() {
      clearInterval(checkClosed);
      try { URL.revokeObjectURL(url); } catch(e) {}
    }, 5 * 60 * 1000);
  }
  console.log('[Report] Report generated successfully');
  return true;
  } catch(e) {
    console.error('[Report] Error generating report:', e);
    alert('生成实验报告时出错: ' + e.message);
    return false;
  }
}


// 错误处理


// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error || event.message || '未知错误');
  
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  
});


// 初始化应用

function init() {
  setupEventListeners();
  console.log('黏性现象仿真实验教学软件 - 网页版已启动');
}


// 纯JavaScript二维码生成器 (QR Code v4, Byte mode, M纠错)
// 无任何外部依赖，离线可用

(function() {
  var QR = window.QRGenerator = {};

  // GF(256) 运算表
  var EXP = new Int32Array(512);
  var LOG = new Int32Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; EXP[i + 255] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  // Reed-Solomon 编码器
  function rsEncode(data, ecCount) {
    var gen = new Int32Array(ecCount + 1);
    gen[0] = 1;
    for (var i = 0; i < ecCount; i++) {
      gen[i + 1] = 1;
      for (var j = i; j > 0; j--) {
        gen[j] = gen[j - 1] ^ gfMul(gen[j], EXP[i]);
      }
      gen[0] = gfMul(gen[0], EXP[i]);
    }

    var res = new Int32Array(ecCount);
    for (var d = 0; d < data.length; d++) {
      var fb = data[d] ^ res[0];
      for (var j = 0; j < ecCount - 1; j++) {
        res[j] = res[j + 1] ^ gfMul(fb, gen[ecCount - 1 - j]);
      }
      res[ecCount - 1] = gfMul(fb, gen[0]);
    }
    return Array.from(res);
  }

  // BCH(15,5) 编码 (格式信息)
  function bch15_5(data5) {
    var d = data5 << 10;
    for (var i = 4; i >= 0; i--) {
      if (d & (1 << (i + 10))) d ^= (0x537 << i);
    }
    return ((data5 << 10) | (d & 0x3FF)) ^ 0x5412;
  }

  // 构建位流
  function buildBitStream(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 0xFF);
    }

    // 模式指示符 0100 (4 bits) + 计数 8 bits (v1-v9)
    var bits = [];
    bits.push(0,1,0,0); // Byte mode
    var count = text.length;
    for (var b = 7; b >= 0; b--) bits.push((count >> b) & 1);

    // 数据字节
    for (var i = 0; i < bytes.length; i++) {
      for (var b = 7; b >= 0; b--) bits.push((bytes[i] >> b) & 1);
    }

    // 终止符 0000
    for (var i = 0; i < 4; i++) bits.push(0);

    // 补齐到8的倍数
    while (bits.length % 8 !== 0) bits.push(0);

    // 补齐到64字节 (version 4 M 数据容量)
    var padBytes = [0xEC, 0x11];
    var pi = 0;
    while (bits.length < 64 * 8) {
      var pb = padBytes[pi % 2];
      for (var b = 7; b >= 0; b--) bits.push((pb >> b) & 1);
      pi++;
    }

    // 转为字节数组
    var result = [];
    for (var i = 0; i < bits.length; i += 8) {
      var val = 0;
      for (var b = 0; b < 8; b++) val = (val << 1) | bits[i + b];
      result.push(val);
    }
    return result;
  }

  // 生成最终码字序列 (数据 + EC 交织)
  function buildCodewords(dataBytes) {
    var BLOCK1 = 32, BLOCK2 = 32, EC = 18;
    var block1 = dataBytes.slice(0, BLOCK1);
    var block2 = dataBytes.slice(BLOCK1, BLOCK1 + BLOCK2);
    var ec1 = rsEncode(block1, EC);
    var ec2 = rsEncode(block2, EC);

    var result = [];
    // 数据交织
    for (var i = 0; i < BLOCK1; i++) { result.push(block1[i]); result.push(block2[i]); }
    // EC 交织
    for (var i = 0; i < EC; i++) { result.push(ec1[i]); result.push(ec2[i]); }
    return result;
  }

  // 构建模块矩阵 (version 4 = 33x33)
  function buildMatrix(codewords) {
    var SIZE = 33;
    var matrix = [];
    for (var r = 0; r < SIZE; r++) {
      matrix[r] = new Int32Array(SIZE);
    }

    // 标记功能模块 (1 = 功能模块)
    // 1. 寻像图形 (7x7 方块)
    function fillRect(row, col, h, w, val) {
      for (var r = row; r < row + h; r++)
        for (var c = col; c < col + w; c++)
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) matrix[r][c] = val;
    }

    // 三个寻像图形 + 分隔符(1模块宽)
    var finderPositions = [{r:0,c:0},{r:0,c:SIZE-7},{r:SIZE-7,c:0}];
    finderPositions.forEach(function(p) {
      fillRect(p.r, p.c, 7, 7, 1);        // 寻像图形
      fillRect(p.r-1, p.c-1, 9, 9, 2);    // 分隔符先标记为2
      fillRect(p.r, p.c, 7, 7, 1);        // 恢复寻像图形
    });

    // 2. 时序图形 (第6行和第6列)
    for (var i = 0; i < SIZE; i++) {
      if (matrix[6][i] === 0) matrix[6][i] = 1;
      if (matrix[i][6] === 0) matrix[i][6] = 1;
    }

    // 3. 校正图形 (version 4: 中心在 [6,26])
    var alignCenters = [6, 26];
    alignCenters.forEach(function(ar) {
      alignCenters.forEach(function(ac) {
        if (matrix[ar][ac] >= 1) return; // 与寻像图形重叠则跳过
        for (var r = ar - 2; r <= ar + 2; r++)
          for (var c = ac - 2; c <= ac + 2; c++)
            if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && matrix[r][c] === 0)
              matrix[r][c] = 1;
      });
    });

    // 4. 格式信息保留区
    // Copy 0: 左上角寻像图形周围
    for (var i = 0; i <= 8; i++) {
      if (matrix[i][8] === 0) matrix[i][8] = 1; // 竖条
      if (matrix[8][i] === 0) matrix[8][i] = 1; // 横条
    }
    // Copy 1: 右上 + 左下
    for (var i = SIZE - 1; i >= SIZE - 8; i--) {
      if (matrix[8][i] === 0) matrix[8][i] = 1; // 右上横条
      if (matrix[i][8] === 0) matrix[i][8] = 1; // 左下竖条
    }
    // 5. 暗模块 (4V+9, 8) = (25, 8) for V=4
    matrix[25][8] = 1;

    // 分隔符标记作为浅色功能模块(防止数据覆盖)
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (matrix[r][c] === 2) matrix[r][c] = 4;

    // 填充实际寻像图形模块值(深色/浅色)
    function drawFinder(row, col) {
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < 7; c++) {
          var isDark = (r === 0 || r === 6 || c === 0 || c === 6 ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          matrix[row + r][col + c] = isDark ? 3 : 4; // 3=深 4=浅 (功能模块数据)
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, SIZE - 7);
    drawFinder(SIZE - 7, 0);

    // 时序图形: 交替深浅，从深色开始
    for (var i = 8; i <= SIZE - 9; i++) {
      matrix[6][i] = (i % 2 === 0) ? 3 : 4;   // 第6行
      matrix[i][6] = (i % 2 === 0) ? 3 : 4;   // 第6列
    }

    // 校正图形 (5x5): 外框深, 内框浅, 中心深
    function drawAlignment(row, col) {
      for (var r = -2; r <= 2; r++) {
        for (var c = -2; c <= 2; c++) {
          var isDark = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
          matrix[row + r][col + c] = isDark ? 3 : 4;
        }
      }
    }
    alignCenters.forEach(function(ar) {
      alignCenters.forEach(function(ac) {
        // 跳过与寻像图形重叠的校正图形 (5×5 vs 7×7 AABB overlap)
        var overlaps = false;
        for (var fi = 0; fi < finderPositions.length; fi++) {
          var fp = finderPositions[fi];
          if (!(ar + 2 < fp.r || ar - 2 > fp.r + 6 || ac + 2 < fp.c || ac - 2 > fp.c + 6)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) return;
        drawAlignment(ar, ac);
      });
    });

    // 将数据码字转为位序列
    var dataBits = [];
    for (var i = 0; i < codewords.length; i++) {
      for (var b = 7; b >= 0; b--) {
        dataBits.push((codewords[i] >> b) & 1);
      }
    }

    // 按模块放置顺序填充数据位
    var bitIdx = 0;
    var right = SIZE - 1;
    var up = true;

    while (right >= 0) {
      if (right === 6) right = 5; // 跳过垂直时序列

      if (up) {
        for (var row = SIZE - 1; row >= 0; row--) {
          for (var col = right; col >= right - 1; col--) {
            if (col >= 0 && matrix[row][col] === 0 && bitIdx < dataBits.length) {
              matrix[row][col] = dataBits[bitIdx] ? 5 : 6;
              bitIdx++;
            }
          }
        }
      } else {
        for (var row = 0; row < SIZE; row++) {
          for (var col = right; col >= right - 1; col--) {
            if (col >= 0 && matrix[row][col] === 0 && bitIdx < dataBits.length) {
              matrix[row][col] = dataBits[bitIdx] ? 5 : 6;
              bitIdx++;
            }
          }
        }
      }
      right -= 2;
      up = !up;
    }

    return matrix;
  }

  // 掩码惩罚评分
  function evalLine(arr) {
    var p = 0, run = 0;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i]) { run++; }
      else { if (run >= 5) p += run - 2; run = 0; }
    }
    if (run >= 5) p += run - 2;
    return p;
  }

  function eval2x2(mat, SIZE) {
    var p = 0;
    for (var r = 0; r < SIZE - 1; r++)
      for (var c = 0; c < SIZE - 1; c++)
        if (mat[r][c] === mat[r+1][c] && mat[r][c] === mat[r][c+1] && mat[r][c] === mat[r+1][c+1])
          p += 3;
    return p;
  }

  function evalPattern(mat, SIZE, pattern) {
    var p = 0;
    // 检查行方向
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c <= SIZE - 7; c++) {
        var match = true;
        for (var k = 0; k < 7; k++) {
          if (mat[r][c + k] !== pattern[k]) { match = false; break; }
        }
        if (match) p += 40;
      }
    }
    // 检查列方向
    for (var c = 0; c < SIZE; c++) {
      for (var r = 0; r <= SIZE - 7; r++) {
        var match = true;
        for (var k = 0; k < 7; k++) {
          if (mat[r + k][c] !== pattern[k]) { match = false; break; }
        }
        if (match) p += 40;
      }
    }
    return p;
  }

  function evalRatio(mat, SIZE) {
    var dark = 0;
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (mat[r][c]) dark++;
    var pct = dark / (SIZE * SIZE) * 100;
    var lower = Math.floor(pct / 5) * 5;
    var upper = lower + 5;
    return Math.min(Math.abs(lower - 50) / 5, Math.abs(upper - 50) / 5) * 10;
  }

  function evaluateMask(matrix, maskFn) {
    var SIZE = matrix.length;
    var masked = [];
    for (var r = 0; r < SIZE; r++) {
      masked[r] = [];
      for (var c = 0; c < SIZE; c++) {
        var mod = matrix[r][c];
        var isDark;
        if (mod === 3) isDark = true;
        else if (mod === 4) isDark = false;
        else if (mod === 5) isDark = !maskFn(r, c);
        else if (mod === 6) isDark = maskFn(r, c);
        else isDark = false;
        masked[r][c] = isDark;
      }
    }

    var penalty = 0;
    // 行
    for (var r = 0; r < SIZE; r++) penalty += evalLine(masked[r]);
    // 列
    for (var c = 0; c < SIZE; c++) {
      var col = [];
      for (var r = 0; r < SIZE; r++) col.push(masked[r][c]);
      penalty += evalLine(col);
    }
    penalty += eval2x2(masked, SIZE);
    penalty += evalPattern(masked, SIZE, [1,0,1,1,1,0,1]);
    penalty += evalRatio(masked, SIZE);
    return { penalty: penalty, masked: masked };
  }

  // 应用格式信息
  function applyFormat(masked, maskIdx) {
    var SIZE = masked.length;
    // EC level M = 00, mask = 3-bit index
    var formatData = (0 << 3) | maskIdx; // 5 bits: EC(2) + Mask(3)
    var format = bch15_5(formatData);

    // Copy 0: 左上
    var pos0_r = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8];
    var pos0_c = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0];
    for (var i = 0; i < 15; i++) {
      var bit = (format >> i) & 1;
      masked[pos0_r[i]][pos0_c[i]] = bit === 1;
    }

    // Copy 1: 右上 + 左下
    var pos1_r = [8,8,8,8,8,8,8,8,26,27,28,29,30,31,32];
    var pos1_c = [32,31,30,29,28,27,26,25,8,8,8,8,8,8,8];
    // 注意: 格式位分布在 copy1 的顺序与 copy0 相同
    for (var i = 0; i < 8; i++) {
      masked[pos1_r[i]][pos1_c[i]] = ((format >> i) & 1) === 1;
    }
    for (var i = 8; i < 15; i++) {
      masked[pos1_r[i]][pos1_c[i]] = ((format >> i) & 1) === 1;
    }

    // 暗模块永远为深色
    masked[25][8] = true;

    return masked;
  }

  // 主入口: 在canvas上绘制二维码
  QR.drawOnCanvas = function(canvas, text, moduleSize) {
    var SIZE = 33;
    var dataBytes = buildBitStream(text);
    var codewords = buildCodewords(dataBytes);
    var matrix = buildMatrix(codewords);

    // 8种掩码函数
    var maskFns = [
      function(r, c) { return (r + c) % 2 === 0; },
      function(r, c) { return r % 2 === 0; },
      function(r, c) { return c % 3 === 0; },
      function(r, c) { return (r + c) % 3 === 0; },
      function(r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
      function(r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
      function(r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
      function(r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; }
    ];

    // 评估所有掩码，选择惩罚最小的
    var bestIdx = 0;
    var bestPenalty = Infinity;
    var bestMasked = null;
    for (var m = 0; m < 8; m++) {
      var result = evaluateMask(matrix, maskFns[m]);
      if (result.penalty < bestPenalty) {
        bestPenalty = result.penalty;
        bestIdx = m;
        bestMasked = result.masked;
      }
    }

    var finalMatrix = applyFormat(bestMasked, bestIdx);

    // 绘制到Canvas (含4模块静区)
    var size = moduleSize || 200;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var quiet = 4; // 静区模块数
    var totalMods = SIZE + quiet * 2;
    var ms = size / totalMods;

    // 白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 绘制深色模块 (偏移quiet个模块)
    ctx.fillStyle = '#000000';
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (finalMatrix[r][c]) {
          ctx.fillRect(
            Math.floor((c + quiet) * ms),
            Math.floor((r + quiet) * ms),
            Math.ceil(ms),
            Math.ceil(ms)
          );
        }
      }
    }
  };

})();


// 二维码弹窗事件处理

(function() {
  function openQrModal() {
    var overlay = document.getElementById('qrModalOverlay');
    var canvas = document.getElementById('qrCanvas');
    if (overlay && canvas) {
      // 绘制二维码
      QRGenerator.drawOnCanvas(canvas, 'https://hanhhhy.github.io/-/v8.html', 200);
      overlay.classList.add('active');
    }
  }

  function closeQrModal() {
    var overlay = document.getElementById('qrModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 在init之后绑定
  function bindQrEvents() {
    var homeBtn = document.getElementById('homeQrBtn');
    var expBtn = document.getElementById('expQrBtn');
    var closeBtn = document.getElementById('qrModalClose');
    var overlay = document.getElementById('qrModalOverlay');

    if (homeBtn) homeBtn.addEventListener('click', openQrModal);
    if (expBtn) expBtn.addEventListener('click', openQrModal);
    if (closeBtn) closeBtn.addEventListener('click', closeQrModal);
    if (overlay) overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeQrModal();
    });

    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        closeQrModal();
      }
    });
  }

  // 确保DOM加载后绑定
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindQrEvents);
  } else {
    bindQrEvents();
  }
})();

// 等待 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM 已经加载完成
  init();
}







// 实验助手 — 知识库 + 匹配引擎 + 交互

var AIKnowledgeBase = [
  // ========== 通用 ==========
  {
    id: 'welcome',
    keywords: ['你好', '帮助', '功能', '能做什么', '介绍'],
    tags: ['对话'],
    experiment: 'all',
    title: '流体·实验助手使用指南',
    response: '我可以帮你：\n1. <b> 原理</b> — 解释当前实验的物理原理和公式含义\n2. <b> 公式</b> — 展示关键公式及推导过程\n3. <b> 指导</b> — 提供仿真操作步骤和参数建议\n4. <b> 对话</b> — 回答你关于实验的任何问题\n\n你可以直接输入问题，例如"终端速度怎么算"、"为什么球不动"、"对比模式怎么用"等。'
  },
  {
    id: 'compare_mode',
    keywords: ['对比', '对比模式', '三组', 'ABC', '并行', '比较'],
    tags: ['指导'],
    experiment: 'all',
    title: '对比模式使用说明',
    response: '<b>对比模式</b>可以同时运行三组独立参数（A/B/C），直观比较参数变化的影响。\n\n<b>使用方法：</b>\n1. 点击顶部工具栏的"开启对比模式"按钮\n2. 分别为 A、B、C 三组设置不同参数\n3. 点击"开始"启动三组并行仿真\n4. 观察三组之间的差异\n\n<b>斯托克斯对比模式</b>还支持切换对比维度（半径对比 / 黏度对比），并显示 v-t 曲线叠加图。\n\n<b>拖尾效果：</b>牛顿和泊肃叶对比模式下，只有调节黏度 η/μ 参数后才会显示粒子拖尾。'
  },

  // ========== 牛顿黏性定律 — 原理方面 ==========
  {
    id: 'newton_velocity_gradient',
    keywords: ['速度梯度', 'du/dz', '流速分布斜率'],
    tags: ['原理', '公式'],
    experiment: 'newton',
    title: '速度梯度 — du/dz',
    response: ' <b>公式定义</b>\n速度梯度是描述流体速度在空间垂直方向上变化快慢的物理量。\n<span class="ai-msg-formula">速度梯度 = du/dz</span>\n\n <b>参数解释</b>\ndu = 两层流体之间的速度差 (m/s)\ndz = 两层流体之间的垂直距离 (m)\n\n <b>物理意义</b>\n在木板实验中，下板静止 (v=0)，上板以速度 U 向右移动，两板间距为 z。牛顿流体作层流运动时，流速在垂直方向上呈线性分布，这条直线的斜率就是速度梯度。\n<span class="ai-msg-formula">du/dz = U / z</span>\n\n <b>直观理解</b>\n就像多层蛋糕每层以不同速度滑动：越靠近上板的层移动越快，越靠近下板的层移动越慢。速度梯度描述的就是"下一层比上一层快多少"。<span class="ai-msg-highlight">梯度越大，流体变形越快，黏性力也越大。</span>'
  },
  {
    id: 'newton_shear_stress',
    keywords: ['剪切应力', '剪应力', 'τ'],
    tags: ['原理', '公式'],
    experiment: 'newton',
    title: '剪切应力 — τ',
    response: ' <b>定义</b>\n剪切应力是流体内部单位面积上所承受的黏性力，反映流体层之间相互"拉扯"的强度。\n\n <b>公式</b>\n<span class="ai-msg-formula">τ = F / A</span>\n\n <b>参数解释</b>\nτ (tau) = 剪切应力，单位 Pa 或 N/m²\nF = 平行于平板拉动流体所需的外力 (N)\nA = 流体与平板的接触面积 (m²)\n\n <b>物理意义</b>\n在木板实验中，施加的外力 F 就是用来克服流体内部的剪切应力。想象把一叠扑克牌斜着推，每张牌之间会产生抵抗滑动的摩擦力——剪切应力就是这种"单位面积上的内部摩擦力"。<span class="ai-msg-highlight">剪切应力越大，说明流体越黏，越难拖动。</span>'
  },
  {
    id: 'newton_viscosity',
    keywords: ['动力粘度', '粘度', '粘性系数', 'μ', '黏滞系数'],
    tags: ['原理', '公式'],
    experiment: 'newton',
    title: '动力黏度 — μ',
    response: ' <b>定义</b>\n动力黏度是流体的固有属性，表征流体抵抗剪切变形的能力。黏度越大，流体越"稠"，越难流动。\n\n <b>公式（由牛顿定律导出）</b>\n<span class="ai-msg-formula">μ = τ / (du/dz)</span>\n\n <b>参数解释</b>\nμ = 动力黏度，单位 Pa·s (帕斯卡·秒)\nτ = 剪切应力 (Pa)\ndu/dz = 速度梯度 (s⁻¹，即每秒的剪切速率)\n\n <b>实验测定方法</b>\n1. 测量拉力 F，计算 τ = F / A\n2. 测量上下板速度差 U 与间距 z，计算 du/dz = U / z\n3. 代入公式：μ = τ / (du/dz)\n\n<span class="ai-msg-warn"> 注意：水的 μ 约 0.001 Pa·s，甘油的 μ 约 1.5 Pa·s（约为水的1500倍）。水、酒精、空气属于牛顿流体，其 μ 值为常数，不随剪切速率变化。</span>'
  },
  {
    id: 'newton_viscous_force',
    keywords: ['黏性力', '黏滞力', '内摩擦力', '阻力'],
    tags: ['原理', '公式'],
    experiment: 'newton',
    title: '黏性力 — F',
    response: ' <b>定义</b>\n黏性力是流体内部由于分子内聚力及动量交换而产生的阻碍相对运动的力。它是流体摩擦的宏观表现。\n\n <b>公式（力形式）</b>\n<span class="ai-msg-formula">F = μ × A × (U / z)</span>\n\n <b>参数解释</b>\nF = 黏性力 (N)\nμ = 动力黏度 (Pa·s)\nA = 接触面积 (m²)\nU = 上板移动速度 (m/s)\nz = 两板间距 (m)\n\n <b>影响因素与变化趋势</b>\n<span class="ai-msg-highlight">速度 U 越大 → 黏性力越大</span>（拉得越快，阻力越大）\n<span class="ai-msg-highlight">间距 z 越小 → 黏性力越大</span>（间隙越窄，摩擦越强）\n<span class="ai-msg-highlight">面积 A 越大 → 黏性力越大</span>（接触面越大，总力越大）\n<span class="ai-msg-highlight">黏度 μ 越大 → 黏性力越大</span>（流体越黏，越难拖动）\n\n <b>直观理解</b>\n就像手掌在桌面和糖浆表面滑动的区别：糖浆黏度大，所以你需要更大的力才能以相同速度滑动手掌。'
  },
  {
    id: 'newton_law_summary',
    keywords: ['牛顿粘性定律是什么', '牛顿黏性定律'],
    tags: ['原理', '公式'],
    experiment: 'newton',
    title: '牛顿黏性定律 — 总结',
    response: ' <b>核心内容</b>\n流体层间由于相对运动产生的内摩擦力（黏性力）与速度梯度成正比。\n\n <b>三大核心公式</b>\n1. <b>应力形式：</b><span class="ai-msg-formula">τ = μ × (du/dz)</span>——剪切应力等于黏度乘以速度梯度\n2. <b>力形式：</b><span class="ai-msg-formula">F = μ × A × (U / z)</span>——将应力乘以面积得到总黏性力\n3. <b>黏度形式：</b><span class="ai-msg-formula">μ = (F / A) / (U / z)</span>——由实验测量值反算流体黏度\n\n<span class="ai-msg-warn"> <b>注意</b>\n遵循这一定律的流体称为<b>牛顿流体</b>（空气、水、大部分轻质油），其 μ 为常数，剪切应力与速度梯度成正比。\n不遵循的称为<b>非牛顿流体</b>（泥浆、油漆、血液、高分子溶液），其表观黏度随剪切速率变化而改变，τ 与 du/dz 不是线性关系。</span>'
  },

  // ========== 牛顿黏性定律 — 操作方面 ==========
  {
    id: 'newton_apparatus',
    keywords: ['实验装置', '平行板', '如何搭建', '装置构成', '边界条件'],
    tags: ['指导'],
    experiment: 'newton',
    title: '木板实验装置 — 平行平板拖曳流',
    response: '<b>本仿真模拟的是平行平板拖曳流实验（Parallel-Plate Drag Flow）。</b>\n\n<b> 装置构成：</b>\n· <b>下板：</b>固定不动，表面粗糙确保流体无滑移（速度为 0）\n· <b>上板：</b>以恒定速度 <span class="ai-msg-highlight">U</span> 向右运动\n· <b>流体域：</b>填充在两板之间，高度为 <span class="ai-msg-highlight">z</span>\n\n<b> 边界条件：</b>\n· <b>无滑移边界条件（No-slip Condition）：</b>紧贴壁面的流体速度与壁面速度一致。即：\n  下壁面处流体速度 = 0（板静止，流体也静止）\n  上壁面处流体速度 = U（板运动，流体同速运动）\n· 这一条件是牛顿黏性定律成立的前提——正是因为流层之间速度不同，才产生了内摩擦力（剪切应力）。'
  },
  {
    id: 'newton_velocity_profile',
    keywords: ['速度分布', '速度剖面', '线性分布', '流线', '库埃特流动', 'Couette'],
    tags: ['指导'],
    experiment: 'newton',
    title: '线性速度分布 — 库埃特流动',
    response: '<b>在层流状态下，牛顿流体在两平行板间的速度分布是一条直线。</b>\n\n<b> 图像表征：</b>\n将流体切成无数薄层：\n· <b>最底层</b>（紧贴下板，y=0）：速度为 <span class="ai-msg-highlight">0</span>\n· <b>最顶层</b>（紧贴上板，y=z）：速度为 <span class="ai-msg-highlight">U</span>\n· <b>中间任意一层</b>（距下板 y）：速度 <span class="ai-msg-formula">v(y) = (U / z) × y</span>\n· 速度在 y 方向上从 0 线性增加到 U，斜率为 <span class="ai-msg-formula">U / z</span>（即剪切率）\n\n<b> 流动形态：</b>\n· 这种流动称为<b>库埃特流动（Couette Flow）</b>——由壁面运动驱动的纯剪切流动\n· 在仿真动画中，不同颜色的粒子水平移动，上层粒子跑得快，下层粒子跑得慢，形成整齐的斜线\n· 各流层之间没有质量交换（层流），动量仅通过分子碰撞在层间传递\n· 这正是牛顿黏性定律 <span class="ai-msg-formula">F/A = μ × (U / z)</span> 中"线性速度梯度"的直观体现'
  },

  // ========== 泊肃叶定律 — 原理方面 ==========
  {
    id: 'poiseuille_formula',
    keywords: ['泊肃叶', '公式', 'poiseuille', 'Q', '圆管流量', '泊肃叶定律'],
    tags: ['原理', '公式'],
    experiment: 'poiseuille',
    title: '泊肃叶定律',
    response: ' <b>核心公式</b>\n<span class="ai-msg-formula">Q = (π × ΔP × R⁴) / (8 × μ × L)</span>\n\n <b>参数解释</b>\n<span class="ai-msg-highlight">Q</span>：体积流量（m³/s），单位时间内流过截面的体积。\n<span class="ai-msg-highlight">ΔP</span>：压力差（Pa），是推动流体流动的动力。\n<span class="ai-msg-highlight">R</span>：管道半径（m），是影响流量的最敏感因素。\n<span class="ai-msg-highlight">μ</span>：动力黏度（Pa·s），反映流体的黏稠程度。\n<span class="ai-msg-highlight">L</span>：管道长度（m）。\n\n <b>物理意义</b>\n流量与压力差成正比，与黏度成反比，且与管道半径的<b>四次方</b>成正比。\n<span class="ai-msg-warn">稍微增加管径，流量会急剧增加。</span>'
  },
  {
    id: 'poiseuille_velocity_profile',
    keywords: ['速度分布', '速度剖面', '抛物线', '层流剖面', '最大速度'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '抛物线速度分布',
    response: ' <b>图像表征</b>\n在圆管层流中，流体的速度沿管径方向呈<b>抛物线分布</b>。\n· <b>管壁处</b>：流速为 <span class="ai-msg-warn">0</span>（无滑移条件）。\n· <b>管中心</b>：流速最大 <span class="ai-msg-highlight">u_max</span>。\n· 整体形状像一个旋转抛物面。\n\n <b>数学表达</b>\n<span class="ai-msg-formula">u(r) = (ΔP / (4μL)) × (R² − r²)</span>\n其中 <span class="ai-msg-highlight">r</span> 是距离管中心的径向距离。\n\n <b>仿真观察提示</b>\n管中心的粒子像子弹一样射出，靠近边缘的粒子几乎在原地蠕动。<span class="ai-msg-warn">这种分布是层流的标志。</span>'
  },
  {
    id: 'poiseuille_pressure_diff',
    keywords: ['压力差', '压差', 'ΔP', '驱动压力', '压降'],
    tags: ['原理', '公式'],
    experiment: 'poiseuille',
    title: '压力差 — ΔP',
    response: ' <b>定义公式</b>\n压力差（<span class="ai-msg-highlight">ΔP</span>）是流体流动的<b>驱动力</b>，类似于水流从高往低处流。\n<span class="ai-msg-formula">ΔP = P₁ − P₂</span>（入口压力减去出口压力）\n\n <b>在仿真中的作用</b>\n· 增大入口压力或减小出口压力时，ΔP 变大。\n· 根据泊肃叶定律，<span class="ai-msg-warn">ΔP 增大一倍，流量 Q 也增大一倍。</span>'
  },
  {
    id: 'poiseuille_r4_effect',
    keywords: ['半径影响', 'R的四次方', '管径', '半径', '为什么是半径四次方'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '半径四次方效应',
    response: ' <b>数据演示</b>\n这是泊肃叶定律中最反直觉也最重要的特性：流量与管道半径的<b>四次方</b>成正比。\n· 半径变为 <b>2 倍</b> → 流量变为 2⁴ = <b>16 倍</b>\n· 半径变为 <b>0.5 倍</b> → 流量减少到 (0.5)⁴ = <b>1/16</b>\n\n <b>原因解释</b>\n1. <b>几何因素：</b>横截面积与 R² 成正比，面积大了能流过的流体自然多了。\n2. <b>阻力因素：</b>靠近管壁的流体受阻，半径越大，中心区域的流体受管壁影响的比例越小，平均流速就越快。\n\n <b>生活应用</b>\n<span class="ai-msg-warn">这就是为什么血管稍微狭窄（半径减小）会导致血流量灾难性下降，引发心梗或脑梗。</span>'
  },
  {
    id: 'poiseuille_avg_velocity',
    keywords: ['平均流速', '平均速度', 'V_avg'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '平均流速 — V_avg',
    response: ' <b>公式</b>\n平均流速是假设流体以同一速度流过管道时的速度，等于<b>总流量除以横截面积</b>。\n<span class="ai-msg-formula">V_avg = Q / A = Q / (πR²)</span>\n\n <b>与最大流速的关系</b>\n在抛物线分布中，平均流速正好是管中心最大流速的<b>一半</b>：\n<span class="ai-msg-formula">V_avg = u_max / 2</span>\n\n <b>仿真观测</b>\n如果看到中心粒子速度是 <b>10 cm/s</b>，那么整个管道的平均输送速度大约是 <b>5 cm/s</b>。'
  },
  {
    id: 'poiseuille_reynolds',
    keywords: ['层流', '湍流', '雷诺数', 'Re', '临界'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '层流与湍流',
    response: ' <b>判断依据（雷诺数 Re）</b>\n泊肃叶定律<b>仅在层流状态下成立</b>。当流速过快时，流动会变得混乱（湍流），公式不再适用。\n<span class="ai-msg-formula">Re = (ρ × V_avg × D) / μ</span>（ρ 为密度，D 为管径，μ 为黏度）\n\n <b>临界值</b>\n· <b>Re < 2000</b>：<span class="ai-msg-highlight">层流</span>（流动平稳，速度分布为抛物线，适用泊肃叶定律）\n· <b>2000 ~ 4000</b>：过渡区（不稳定，可能来回切换）\n· <b>Re > 4000</b>：<span class="ai-msg-warn">湍流</span>（流动混乱，能量损耗剧增，<b>不适用</b>泊肃叶定律）\n\n <b>仿真提示</b>\n如果在仿真中将流速调得极高，会发现<b>速度剖面变平</b>，且流量与压差不再成直线关系——这就是转捩为湍流的迹象。'
  },

  // ========== 泊肃叶定律 — 操作方面 ==========
  {
    id: 'poiseuille_flow_measure',
    keywords: ['如何测流量', '体积流量', '质量流量', '测量', '测流量', '流量'],
    tags: ['指导'],
    experiment: 'poiseuille',
    title: '流量测量 — 体积法',
    response: ' <b>操作步骤</b>\n在仿真实验中，通常使用<b>体积法</b>测量流量 Q：\n1. 在管道出口放置一个<b>虚拟容器</b>。\n2. 记录时间 <b>t</b> 内收集到的流体体积 <b>V</b>。\n3. 计算：<span class="ai-msg-formula">Q = V / t</span>\n\n <b>数据处理</b>\n保持管道<b>长度</b>和<b>黏度</b>不变，改变入口压力 ΔP，记录对应的 Q。绘制 <b>Q-ΔP 曲线</b>，应该得到一条<b>通过原点的直线</b>，以此验证泊肃叶定律的正确性。'
  },
  {
    id: 'poiseuille_3d',
    keywords: ['3d', '旋转', '缩放', '三维', '视角', '泊肃叶图', '线图'],
    tags: ['指导'],
    experiment: 'poiseuille',
    title: '泊肃叶 3D 视图操作',
    response: '<b>泊肃叶实验线图模拟使用 3D WebGL 渲染：</b>\n· <b>鼠标拖拽</b> — 旋转视角\n· <b>滚轮</b> — 缩放\n· <b>右键拖拽</b> — 平移\n\n3D 视图中可以看到：\n· 半透明管道\n· 内部粒子流动（水平方向）\n· 粒子速度与径向位置的关系（管中心快，管壁慢）\n\n如果发给别人看不到 3D 图，需要确保网络连接正常（Three.js 从 CDN 加载）。'
  },
  {
    id: 'poiseuille_params',
    keywords: ['管道半径', '管长', '压差', '密度', '泊肃叶参数', 'R', 'L', 'ΔP'],
    tags: ['指导'],
    experiment: 'poiseuille',
    title: '泊肃叶实验 — 参数说明',
    response: '<b>可调参数：</b>\n· <b>管道半径 R</b>（0.0005~0.005 m）— 流量正比于 R⁴，极敏感\n· <b>管道长度 L</b>（0.1~2 m）— 流量反比于 L\n· <b>压强差 ΔP</b>（100~100000 Pa）— 驱动流动的压差\n· <b>动力黏度 μ</b>（0.001~2 Pa·s）— 流量反比于 μ\n· <b>流体密度 ρ</b>（50~1500 kg/m³）— 影响雷诺数\n\n<b>注意：</b>管道半径参数影响最大（四次方关系），建议微调观察。'
  },

  // ========== 斯托克斯定律 — 原理方面 ==========
  // —— 受力全景 ——
  {
    id: 'stokes_force_balance',
    keywords: ['受力分析', '力平衡', '重力浮力阻力', '小球为什么下落', '三力平衡'],
    tags: ['原理'],
    experiment: 'stokes',
    title: '受力全景图',
    response: ' <b>平衡方程</b>\n小球在流体中受到三个力，达到平衡时即为终端速度。\n<span class="ai-msg-formula">重力 (F_g) = 浮力 (F_b) + 黏滞阻力 (F_d)</span>\n\n <b>公式展开</b>\n<span class="ai-msg-formula">(4/3)πR³ρₛg = (4/3)πR³ρ_fg + 6πμRv</span>\n\n <b>关键洞察</b>\n左边是<b>"推动力"</b>（重力与浮力之差），右边是<b>"阻碍力"</b>（黏滞阻力）。终端速度就是这两者博弈的结果。'
  },
  // —— 阻力 Fd 的三因素 ——
  {
    id: 'stokes_r_fd',
    keywords: ['小球半径', '半径影响阻力', '球大小对阻力', 'R对Fd'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '半径对阻力的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">F_d = 6πμRv</span>\n\n <b>正比关系</b>\n粘滞阻力 <i>F</i><sub>d</sub> 与小球半径 R 成<b>一次方正比</b>。如果半径 R 增加 2 倍，在其他条件不变的情况下，粘滞阻力 <i>F</i><sub>d</sub> 也会增加 2 倍。\n\n<span class="ai-msg-warn"> 注意陷阱：</span>虽然在 <i>F</i><sub>d</sub> 公式中 R 是一阶关系，但在<b>终端速度</b>公式中 R 是<b>二阶关系</b>，因为更大的球重量增加得更快（<i>F</i><sub>g</sub> ∝ R³）。'
  },
  {
    id: 'stokes_mu_fd',
    keywords: ['黏滞系数对阻力', '黏滞系数影响阻力', '黏度', 'μ对Fd'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '黏度对阻力的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">F_d = 6πμRv</span>\n\n <b>正比关系</b>\n粘滞阻力 <i>F</i><sub>d</sub> 与流体黏度 μ 成<b>一次方正比</b>。如果黏度 μ 增加 2 倍，阻力 <i>F</i><sub>d</sub> 也会增加 2 倍。\n\n <b>仿真现象</b>\n在高黏度流体中小球运动比在低黏度中<b>费力得多</b>，因为阻力随 μ 线性增长。'
  },
  {
    id: 'stokes_v_fd',
    keywords: ['小球速度', '相对于静止流体速度', '速度对阻力影响', 'v对Fd'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '速度对阻力的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">F_d = 6πμRv</span>\n\n <b>正比关系</b>\n粘滞阻力 <i>F</i><sub>d</sub> 与小球速度 v 成<b>一次方正比</b>。<b>小球下得越快，受到的阻力就越大。</b>\n\n <b>物理机制</b>\n这也是为什么小球会从<b>加速转为匀速</b>：速度增加 → 阻力增加 → 合力减小 → 加速度归零。'
  },
  // —— 终端速度 vt 的四因素 ——
  {
    id: 'stokes_r_vt',
    keywords: ['半径影响速度', '球大小对沉降', 'R对vt', '半径与终端速度'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '半径对终端速度的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">v_t = (2R²(ρₛ − ρ_f)g) / (9μ)</span>\n\n <b>平方关系（极其敏感）</b>\n终端速度 <i>v</i><sub>t</sub> 与小球半径 R 的<b>平方</b>成正比。\n· 若半径 R 变为 <b>2 倍</b>，终端速度 <i>v</i><sub>t</sub> 会变为 <b>4 倍</b>。\n· 若半径 R 变为 <b>0.5 倍</b>，终端速度 <i>v</i><sub>t</sub> 会变为 <b>0.25 倍</b>。\n\n <b>物理原因</b>\n虽然半径变大阻力也变大（<i>F</i><sub>d</sub> ∝ R），但重力（重量）增加得更快（<i>F</i><sub>g</sub> ∝ R³）。因此大球下沉更快。'
  },
  {
    id: 'stokes_rhos_vt',
    keywords: ['球密度影响速度', '重球下落', 'ρₛ对vt', '小球密度', '密度与终端速度'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '球密度对终端速度的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">v_t = (2R²(ρₛ − ρ_f)g) / (9μ)</span>\n\n <b>正比关系</b>\n终端速度 <i>v</i><sub>t</sub> 与<b>有效密度差 (ρₛ − ρ_f)</b> 成正比。\n· 小球密度 ρₛ 越大，重力越大，下沉越快。\n· 如果小球密度等于流体密度（ρₛ = ρ_f），速度 <i>v</i><sub>t</sub> = 0，<b>小球悬浮</b>。\n\n <b>仿真操作</b>\n试着把小球换成铁球（高密度），它会像石头一样砸下去；换成泡沫球（低密度），它会慢慢飘。'
  },
  {
    id: 'stokes_mu_vt',
    keywords: ['黏度影响速度', '黏稠度对沉降', 'μ对vt', '流体黏度与终端速度'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '流体黏度对终端速度的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">v_t = (2R²(ρₛ − ρ_f)g) / (9μ)</span>\n\n <b>反比关系</b>\n终端速度 <i>v</i><sub>t</sub> 与流体黏度 μ 成<b>反比</b>。\n· 若黏度 μ 增加 2 倍，终端速度 <i>v</i><sub>t</sub> <b>减半</b>。\n· 若黏度 μ 增加 10 倍，终端速度 <i>v</i><sub>t</sub> 变为原来的 <b>1/10</b>。\n\n <b>生活例子</b>\n这就是为什么人在水中游得很慢（水黏度适中），而在糖浆里几乎动弹不得（高黏度）。'
  },
  {
    id: 'stokes_rhof_vt',
    keywords: ['流体密度影响速度', 'ρf对vt', '流体密度与终端速度'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '流体密度对终端速度的影响',
    response: ' <b>公式</b>\n<span class="ai-msg-formula">v_t = (2R²(ρₛ − ρ_f)g) / (9μ)</span>\n\n <b>负相关关系</b>\n终端速度 <i>v</i><sub>t</sub> 随流体密度 ρ_f 的增加而<b>减小</b>。\n· 流体越密实，提供的浮力越大，抵消的重力越多，小球下沉越慢。\n· 极端情况：如果流体密度大于小球密度，括号内为负，速度方向向上（小球浮起）。\n\n<span class="ai-msg-warn">在仿真中如果 ρ_f ≥ ρ_s，小球会反向上升。</span>'
  },
  // —— 统揽与边界 ——
  {
    id: 'stokes_reynolds',
    keywords: ['适用条件', '什么时候不准', 'Re', '雷诺数', '适用范围'],
    tags: ['原理'],
    experiment: 'stokes',
    title: '雷诺数校验',
    response: ' <b>雷诺数公式</b>\n上述所有关系仅在 <b>Re < 0.1</b> 时成立。\n<span class="ai-msg-formula">Re = (ρ_f × v_t × 2R) / μ</span>\n\n<span class="ai-msg-warn"> 警告：</span>如果你把半径调得太大或密度调得太大，导致 <i>v</i><sub>t</sub> 过高，Re 超过 1，流动会产生涡旋，实际阻力会比 6πμRv 大得多，小球会偏离上述规律。\n\n在仿真中可在数据面板查看实时 Re 值，超出适用范围时会显示警告。'
  },
  {
    id: 'stokes_law',
    keywords: ['斯托克斯', '公式', 'stokes', '原理', '斯托克斯定律', '阻力公式', 'Fd'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '斯托克斯定律 — 总结',
    response: ' <b>核心公式</b>\n斯托克斯定律描述了微小球体在无限广阔的黏性流体中缓慢运动时，所受的流体阻力。\n<span class="ai-msg-formula">F_d = 6π × μ × R × v</span>\n\n <b>参数解释</b>\nF_d = 流体对球的粘性阻力 (N)，方向始终与运动方向相反。\nμ = 流体的动力黏度 (Pa·s)。\nR = 小球的半径 (m)。\nv = 小球相对于流体的运动速度 (m/s)。\n\n<span class="ai-msg-warn"> 适用范围：</span>\n1. 雷诺数 Re << 1（通常 Re < 0.1）。\n2. 流体必须无限大（忽略管壁效应）。\n3. 球体表面光滑，且运动速度均匀。'
  },
  {
    id: 'stokes_terminal_velocity',
    keywords: ['终端速度', '沉降速度', '终极速度', '匀速下落', '最大速度', 'vt'],
    tags: ['原理', '公式'],
    experiment: 'stokes',
    title: '终端速度 — v_t',
    response: ' <b>物理过程</b>\n终端速度 (v_t) 是指小球在流体中下落时，加速度减为 0 后的恒定速度。\n1. <b>初始时刻：</b>小球速度为 0，阻力为 0，重力 > 浮力，小球加速下落。\n2. <b>加速过程：</b>速度增加，阻力 <i>F</i><sub>d</sub> 随之增加（<i>F</i><sub>d</sub> ∝ v）。\n3. <b>平衡时刻：</b>阻力 + 浮力 = 重力。合力为 0，加速度为 0，速度不再增加。\n\n <b>计算公式</b>\n<span class="ai-msg-formula">v_t = (2 × R² × (ρ_s − ρ_f) × g) / (9 × μ)</span>\n\n <b>仿真观察</b>\n在仿真中你会看到小球一开始落得越来越快，随后变成等间距的虚线（匀速运动），那个时刻的速度就是终端速度。'
  },
  {
    id: 'stokes_wall_effect',
    keywords: ['管壁效应', '无限广延', '容器大小', '边界影响', '壁面效应'],
    tags: ['原理'],
    experiment: 'stokes',
    title: '无限广延条件',
    response: ' <b>实际情况</b>\n斯托克斯公式假设小球是在<b>无限大</b>的流体中运动。如果你的容器管径太小，管壁会阻碍流体绕流，导致实际阻力比公式计算的要大。\n\n <b>修正</b>\n为了消除管壁效应，通常需要引入修正因子（如 Ladenburg 修正）。\n\n <b>仿真提示</b>\n在仿真中试着缩小容器的直径，你会发现小球的终端速度变慢了，这就是管壁的作用。\n\n<span class="ai-msg-warn">容器直径远大于球径时（如 10 倍以上），管壁效应可忽略。</span>'
  },

  // ========== 斯托克斯定律 — 操作方面 ==========
  {
    id: 'stokes_params',
    keywords: ['球半径', '球密度', '流体密度', '斯托克斯参数', 'r', 'ρs', 'ρf'],
    tags: ['指导'],
    experiment: 'stokes',
    title: '斯托克斯实验 — 参数说明',
    response: '<b>可调参数：</b>\n· <b>小球半径 r</b>（0.0001~0.01 m）— 终端速度正比于 r²\n· <b>小球密度 ρs</b>（500~20000 kg/m³）— 密度越大沉降越快\n· <b>流体密度 ρf</b>（50~1500 kg/m³）— 密度越接近球密度沉降越慢\n· <b>动力黏度 μ</b>（0.001~2 Pa·s）— 终端速度反比于 μ\n\n<b>对比模式默认：</b>r=0.004 m, μ=1.0 Pa·s\n<b>观察要点：</b>r 改变 2 倍，vt 改变 4 倍（平方关系），对比模式下视觉差异非常明显。'
  },
  {
    id: 'stokes_guide',
    keywords: ['操作', '步骤', '怎么用', '斯托克斯实验', '球下降', '沉降'],
    tags: ['指导'],
    experiment: 'stokes',
    title: '斯托克斯实验 — 操作指南',
    response: '<b>操作步骤：</b>\n1. 在首页选择"斯托克斯定律实验"\n2. 切换到"线图模拟"标签页\n3. 调节左侧参数（球半径、密度、流体密度、黏度）\n4. 点击"开始"观察小球沉降\n5. 观察右侧 v-t 曲线、阻力曲线\n\n<b>推荐初始参数：</b>\n· r=0.004m, ρs=2500kg/m³, ρf=1000kg/m³, μ=1.0Pa·s\n\n<b>进阶：</b>进入对比模式，分别设置 A/B/C 三组不同半径（如 0.002/0.004/0.008m），同时观察沉降速度的巨大差异。'
  },
  {
    id: 'stokes_why_slow',
    keywords: ['慢', '不动', '太快', '速度', '为什么', '球消失', '看不到'],
    tags: ['指导'],
    experiment: 'stokes',
    title: '斯托克斯 — 常见问题排查',
    response: '<b>小球不动 / 太慢？</b>\n· 检查黏度 μ 是否设置过大（>1.5 Pa·s）\n· 检查球半径 r 是否过小（<0.001 m）\n· 尝试增大 r 或减小 μ\n· v_t ∝ r²，半径小一半速度变 1/4\n\n<b>小球太快 / 瞬间消失？</b>\n· 检查黏度 μ 是否设置过小（<0.1 Pa·s）\n· 检查球半径 r 是否过大（>0.006 m）\n· 如果发给别人后速度异常快，可能是显示器刷新率问题（已修复为自适应帧间隔）\n\n<b>小球直接没了？</b>\n· 可能是流体密度 ρf 设置过大（≥ 球体密度 ρs），小球浮起或不下沉'
  },
  {
    id: 'stokes_vt_chart',
    keywords: ['vt', '曲线', '图表', 'v-t', '实时', 'eCharts'],
    tags: ['指导'],
    experiment: 'stokes',
    title: 'v-t 曲线图说明',
    response: '<b>v-t 曲线（速度-时间图）：</b>\n显示球体从释放到达到终端速度的全过程。\n\n<span class="ai-msg-formula">v(t) = v_t · (1 − e^(−t/τ))</span>\n\n· τ = m/(6πμr) — 时间常数\n· 5τ 后速度达到终速的 99% 以上\n\n<b>对比模式中</b> A/B/C 三条曲线叠加显示，直观比较不同参数下的加速过程和终速差异。理论曲线为虚线，实时数据为实线。'
  },

  // ========== 通用仿真操作 ==========
  {
    id: 'sim_buttons',
    keywords: ['按钮', '开始', '暂停', '重置', '播放', '控制', '开关'],
    tags: ['指导'],
    experiment: 'all',
    title: '仿真控制按钮说明',
    response: '<b>仿真控制栏（底部）：</b>\n· <b>开始</b> — 启动仿真动画\n· <b>暂停</b> — 暂停动画（保持当前位置）\n· <b>重置</b> — 恢复初始状态\n· <b>开启对比模式</b> — 进入 A/B/C 三组参数并行对比\n\n<b>键盘快捷键：</b>\n· <b>C</b> — 切换对比模式\n· <b>T</b> — 切换深色/浅色主题\n· <b>空格</b> — 开始/暂停'
  },
  {
    id: 'theme_preset',
    keywords: ['主题', '深色', '浅色', '暗色', '亮色', '预设', '流体', '水', '油'],
    tags: ['指导'],
    experiment: 'all',
    title: '主题与预设流体',
    response: '<b>主题切换：</b>\n点击右上角"/☀"按钮切换浅色/深色主题，或按键盘 <b>T</b> 键。\n\n<b>流体预设：</b>\n在黏度参数旁可选择预设流体（水、空气、甘油、蜂蜜、橄榄油等），自动填充对应的黏度和密度值。\n\n<b>自定义参数：</b>\n也可手动拖动滑块设置任意值，不受预设限制。'
  },

  // ========== 牛顿粘性定律 — 实验现象 ==========
  {
    id: 'newton_phenomena_u',
    keywords: ['上板速度变化', '速度增大', '速度减小', 'U变化', '速度影响', '板速度'],
    tags: ['原理'],
    experiment: 'newton',
    title: '上板速度 u 对流动的影响',
    response: ' <b>现象观察（z、η、A 不变）</b>\n\n<b>▲ u 增大时：</b>\n1. 位移轨迹整体右移，流体层位移速率增大\n2. 稳态速度梯度趋势线斜率减小，层间速度差减小\n3. 位移轨迹波动振幅增大，层间剪切效应增强\n\n<b>▼ u 减小时：</b>\n1. 位移轨迹整体左移，流体层位移速率减小\n2. 稳态速度梯度趋势线斜率增大，层间速度差增大\n3. 位移轨迹波动振幅减小，层间剪切效应减弱\n\n <b>核心规律：</b>上板速度直接决定流体整体运动快慢，速度越大，各层速度差越大，剪切效应越强。'
  },
  {
    id: 'newton_phenomena_z',
    keywords: ['板间距变化', '间距增大', '间距减小', 'z变化', '间距影响', '板间距'],
    tags: ['原理'],
    experiment: 'newton',
    title: '板间距 z 对流动的影响',
    response: ' <b>现象观察（u、η、A 不变）</b>\n\n<b>▲ z 增大时：</b>\n1. 位移曲线簇沿纵轴拉伸，分布变稀疏\n2. 稳态速度梯度趋势线斜率减小，层间速度过渡更平缓\n3. 位移轨迹波动减弱，剪切效应减弱\n\n<b>▼ z 减小时：</b>\n1. 位移曲线簇沿纵轴压缩，分布变密集\n2. 稳态速度梯度趋势线斜率增大，层间速度差增大\n3. 位移轨迹波动增强，剪切效应增强\n\n <b>核心规律：</b>间距越小，速度梯度 du/dz 越大，剪切效应越强。这就是为什么窄间隙中的流体更难被剪切。'
  },
  {
    id: 'newton_phenomena_eta',
    keywords: ['粘度变化', '粘度增大', '粘度减小', 'η变化', '粘度对流动', '动力粘度影响'],
    tags: ['原理'],
    experiment: 'newton',
    title: '动力粘度 η 对流动的影响',
    response: ' <b>现象观察（u、z、A 不变）</b>\n\n<b>▲ η 增大时：</b>\n1. 位移轨迹波动振幅显著减小，趋近平行直线\n2. 速度分布更接近理想线性关系\n3. 达到稳态位移分布的时间延长\n\n<b>▼ η 减小时：</b>\n1. 位移轨迹波动振幅增大，偏离线性关系更明显\n2. 流体层响应上板运动更快，迅速达到稳态分布\n\n <b>核心规律：</b>粘度 η 不影响速度梯度的大小，但影响流体达到稳态的时间。高粘度流体更"稳定"（波动小），低粘度流体响应更快。\n\n<span class="ai-msg-warn"> 注意：粘度变化不改变粒子速度！粒子速度只取决于上板速度 u 和层位置，与 η 无关。</span>'
  },
  {
    id: 'newton_phenomena_A',
    keywords: ['接触面积变化', '面积增大', '面积减小', 'A变化', '面积影响', '平板面积'],
    tags: ['原理'],
    experiment: 'newton',
    title: '平板接触面积 A 对流动的影响',
    response: ' <b>现象观察（u、z、η 不变）</b>\n\n<b>▲ A 增大时：</b>\n1. 位移曲线簇变宽，参与剪切的流体层数量增加\n2. 曲线簇整体波动效应增强，总粘性力作用更显著\n\n<b>▼ A 减小时：</b>\n1. 位移曲线簇变窄，参与剪切的流体层数量减少\n2. 曲线簇整体波动效应减弱，总粘性力作用减弱\n\n <b>核心规律：</b>面积越大，总粘性力 F = ηA·(du/dz) 越大，但单位面积上的剪切应力 τ 不变。面积只影响总量，不影响强度。'
  },

  // ========== 牛顿粘性定律 — 深入理解 ==========
  {
    id: 'newton_shear_effect',
    keywords: ['剪切效应', '层间摩擦', '拉扯', '动量传递', '层间作用'],
    tags: ['原理'],
    experiment: 'newton',
    title: '层间剪切效应 — 深入理解',
    response: ' <b>什么是剪切效应？</b>\n流体层间发生相对运动时，因粘性产生的相互拉扯、摩擦的作用效果。\n\n <b>物理机制：</b>\n1. 分子动量交换：快层的分子跳到慢层，加速慢层；慢层的分子跳到快层，减速快层\n2. 分子内聚力：相邻层的分子间吸引力抵抗层的相对滑动\n\n <b>在仿真中的体现：</b>\n- 粒子轨迹的波动振幅反映剪切效应的强度\n- 上板速度 u 越大 → 层间速度差越大 → 剪切效应越强\n- 板间距 z 越小 → 速度梯度越大 → 剪切效应越强\n- 粘度 η 越大 → 内摩擦力越大 → 剪切效应越显著\n\n 剪切效应是牛顿粘性定律的核心物理图像。'
  },
  {
    id: 'newton_couette_flow',
    keywords: ['库埃特流动', 'Couette', '纯剪切', '拖曳流', '流动类型'],
    tags: ['原理'],
    experiment: 'newton',
    title: '库埃特流动（Couette Flow）',
    response: ' <b>定义</b>\n库埃特流动是由壁面运动驱动的纯剪切流动，是验证牛顿粘性定律的经典实验构型。\n\n <b>实验构型：</b>\n· 下板固定（v=0），上板以恒定速度 U 运动\n· 两板间充满待测牛顿流体\n· 流体在无压力梯度条件下仅由壁面剪切驱动\n\n <b>流动特征：</b>\n· 速度分布为线性：v(y) = U × (y/z)\n· 速度梯度恒定：du/dz = U/z\n· 剪切应力恒定：τ = η × U/z（整个流场均匀）\n\n <b>教学意义：</b>\n库埃特流动是最简单的粘性流动，线性速度分布使 du/dz 一目了然，是理解牛顿粘性定律的理想模型。'
  },

  // ========== 泊肃叶定律 — 实验现象 ==========
  {
    id: 'poiseuille_phenomena_r',
    keywords: ['管径变化', '半径增大', '半径减小', 'r变化', '管径对流量'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '圆管半径 r 对流量的影响',
    response: ' <b>现象观察（ΔP、η、L 不变）</b>\n\n<b>▲ r 增大时：</b>\n1. 流量轨迹整体右移，流体体积流量显著增大\n2. 流量随半径的变化更显著，体积流量增幅明显\n3. 流量轨迹波动振幅减小，流动更稳定，管内流速分布更均匀\n\n<b>▼ r 减小时：</b>\n1. 流量轨迹整体左移，流体体积流量显著减小\n2. 流量随半径的变化更平缓，体积流量降幅减缓\n3. 流量轨迹波动振幅增大，流动稳定性下降\n\n <b>核心规律：</b>Q ∝ r⁴。半径增大到2倍，流量变为16倍！这是泊肃叶定律最反直觉也最重要的特性。'
  },
  {
    id: 'poiseuille_phenomena_dp',
    keywords: ['压强差变化', '压力变化', 'ΔP变化', '压差对流量', '压力影响'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '压强差 ΔP 对流量的影响',
    response: ' <b>现象观察（r、η、L 不变）</b>\n\n<b>▲ ΔP 增大时：</b>\n1. 流量轨迹整体右移，流体体积流量同步增大\n2. 流量与压强差呈线性正比关系，变化规律稳定\n3. 流量轨迹波动振幅增大，管内流体流动的动力增强\n\n<b>▼ ΔP 减小时：</b>\n1. 流量轨迹整体左移，流体体积流量同步减小\n2. 流量与压强差的线性关系保持不变\n3. 流量轨迹波动振幅减小，管内流体流动更平缓\n\n <b>核心规律：</b>Q ∝ ΔP。压强差增大一倍，流量也增大一倍（线性关系，与 r⁴ 效应形成对比）。'
  },
  {
    id: 'poiseuille_phenomena_eta',
    keywords: ['泊肃叶粘度', '粘度对流量的影响', 'η对Q', '流体粘度泊肃叶'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '动力粘度 η 对流量的影响',
    response: ' <b>现象观察（r、ΔP、L 不变）</b>\n\n<b>▲ η 增大时：</b>\n1. 流量轨迹波动振幅显著减小，趋近平稳直线\n2. 体积流量显著减小，流量与粘度呈反比关系\n3. 流体达到稳态流量的时间延长\n\n<b>▼ η 减小时：</b>\n1. 流量轨迹波动振幅增大\n2. 体积流量增大，流体流动更顺畅\n3. 管内流速分布差异变大，层间剪切效应略有增强\n\n <b>核心规律：</b>Q ∝ 1/η。粘度增大一倍，流量减半。'
  },
  {
    id: 'poiseuille_phenomena_L',
    keywords: ['管长变化', '长度对流量', 'L变化', '管道长度影响'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '圆管长度 L 对流量的影响',
    response: ' <b>现象观察（r、ΔP、η 不变）</b>\n\n<b>▲ L 增大时：</b>\n1. 流量轨迹整体左移，流体体积流量减小\n2. 流量随管长的增加而缓慢降低，变化幅度平缓\n3. 流量轨迹波动减弱，管内流体流动阻力增大\n\n<b>▼ L 减小时：</b>\n1. 流量轨迹整体右移，流体体积流量增大\n2. 流量随管长的变化更显著，体积流量增幅明显\n3. 流量轨迹波动增强，管内流体流动阻力减小\n\n <b>核心规律：</b>Q ∝ 1/L。管长加倍，流量减半。与半径 r⁴ 效应相比，管长的影响是温和的一阶反比关系。'
  },

  // ========== 泊肃叶定律 — 深入理解 ==========
  {
    id: 'poiseuille_parabolic_why',
    keywords: ['为什么是抛物线', '抛物线原因', '速度分布原因', '推导'],
    tags: ['原理'],
    experiment: 'poiseuille',
    title: '为什么速度分布是抛物线？',
    response: ' <b>推导逻辑：</b>\n1. <b>力平衡：</b>取半径为 r 的圆柱形流体元，压力差驱动力 = 粘性阻力\n<span class="ai-msg-formula">ΔP × πr² = -η × (dv/dr) × 2πrL</span>\n2. <b>解微分方程：</b>整理得 dv/dr = -ΔP·r/(2ηL)\n3. <b>积分：</b>代入边界条件 v(R)=0（管壁无滑移），得：\n<span class="ai-msg-formula">v(r) = (ΔP/(4ηL)) × (R² - r²)</span>\n\n 这就是二次函数——抛物线的数学本质！\n\n <b>直观理解：</b>\n管中心的流体离管壁最远，受粘性阻力影响最小，跑得最快；管壁处的流体被"粘住"，速度为零。从管壁到中心，速度以二次曲线形式递增。'
  },
  {
    id: 'poiseuille_flow_resistance',
    keywords: ['流阻', 'Rf', '流动阻力', '阻力公式', '管道阻力'],
    tags: ['原理', '公式'],
    experiment: 'poiseuille',
    title: '流阻 Rf — 管道的"阻力"',
    response: ' <b>定义</b>\n流阻类似于电路中的电阻——衡量管道对流体流动的阻碍程度。\n<span class="ai-msg-formula">Rf = 8ηL / (πr⁴)</span>\n\n <b>欧姆定律类比：</b>\nΔP = Q × Rf（类似 V = I × R）\n\n <b>影响因素：</b>\n· η 越大 → Rf 越大（流体越黏，阻力越大）\n· L 越大 → Rf 越大（管越长，阻力越大）\n· r 越大 → Rf 急剧减小（r⁴ 反比关系）\n\n 这就是为什么自来水管道比针管容易流水——管径的四次方效应！'
  },

  // ========== 各实验 — 参数联动 ==========
  {
    id: 'three_laws_compare',
    keywords: ['三个定律', '对比', '区别', '联系', '关系', '总结'],
    tags: ['原理'],
    experiment: 'all',
    title: '三大粘性定律的对比与联系',
    response: ' <b>三大定律对比：</b>\n\n<b>1. 牛顿粘性定律</b> — 定义粘度\n<span class="ai-msg-formula">τ = η × (du/dz)</span>\n核心：剪切应力与速度梯度成正比\n场景：两平行板间的剪切流动\n\n<b>2. 泊肃叶定律</b> — 管流流量\n<span class="ai-msg-formula">Q = πΔPr⁴/(8ηL)</span>\n核心：流量正比于半径的四次方\n场景：圆管内的层流流动\n\n<b>3. 斯托克斯定律</b> — 球体阻力\n<span class="ai-msg-formula">Fd = 6πηrv</span>\n核心：阻力正比于速度、半径和粘度\n场景：小球在粘性流体中沉降\n\n <b>内在联系：</b>三个定律都基于牛顿粘性定律的核心思想——粘性力与速度梯度成正比。泊肃叶和斯托克斯分别是这一思想在管流和绕流中的具体应用。'
  },

  // ========== 实际操作实验 ==========
  {
    id: 'real_newton_lab',
    keywords: ['怎么做牛顿实验', '实际操作', '牛顿实验步骤', '平行板实验', '粘度测量实验', '真实实验'],
    tags: ['指导'],
    experiment: 'newton',
    title: ' 真实实验：牛顿粘性定律 — 平行板法测粘度',
    response: '<b> 实验目的：</b>通过平行板拖曳实验，验证牛顿粘性定律，测定流体的动力粘度 η。\n\n<b> 所需器材：</b>\n· 两块光滑平行金属板（上板可滑动，下板固定）\n· 精密拉力计或力传感器（精度 0.01 N）\n· 可调速电机驱动系统\n· 游标卡尺（测板间距，精度 0.01 mm）\n· 待测流体（甘油、机油、糖浆等）\n· 温度计（流体粘度随温度变化！）\n\n<b> 操作步骤：</b>\n<b>步骤 1 — 准备：</b>将待测流体均匀填充于两板之间，调至目标板间距 z，记录温度 T。\n<b>步骤 2 — 测量面积 A：</b>用游标卡尺测量流体与上板的接触面积 A。\n<b>步骤 3 — 设置速度 U：</b>启动电机，使上板以恒定低速 U 移动，确保流动保持层流。\n<b>步骤 4 — 记录拉力 F：</b>待流动稳定后，读取拉力计示数 F。\n<b>步骤 5 — 重复：</b>改变 U（或 z，或 A），重复步骤 1-4，至少采集 5 组数据。\n\n<b> 数据处理：</b>\n1. 计算速度梯度：du/dz = U / z\n2. 计算剪切应力：τ = F / A\n3. 绘制 τ - (du/dz) 散点图，拟合直线\n4. 直线斜率即为动力粘度 η\n\n<b> 注意事项：</b>\n· 温度必须恒定！粘度对温度极其敏感（±1°C 可导致 5-10% 误差）\n· 上板速度不宜过大，避免湍流\n· 确保板面完全被流体浸润，无气泡\n· 边缘效应：板面积应远大于间距（A >> z²），减少边缘漏流影响'
  },
  {
    id: 'real_poiseuille_lab',
    keywords: ['怎么做泊肃叶实验', '管流实验', '毛细管粘度计', '流量测量实验', '泊肃叶真实实验'],
    tags: ['指导'],
    experiment: 'poiseuille',
    title: ' 真实实验：泊肃叶定律 — 毛细管法测流量',
    response: '<b> 实验目的：</b>通过测量圆管层流的流量与压差关系，验证泊肃叶定律，利用 Q ∝ r⁴ 关系测定管径或粘度。\n\n<b> 所需器材：</b>\n· 细长毛细管（内径 0.5~3 mm，长度 0.2~1 m，已知精确内径）\n· 恒压水源或高位水箱（提供稳定 ΔP）\n· 量筒 + 秒表（测体积流量 Q = V/t）\n· U 型管压力计或电子压差计\n· 待测液体（水、乙醇、甘油水溶液等）\n· 恒温水浴（控温 ±0.1°C）\n\n<b> 操作步骤：</b>\n<b>步骤 1 — 安装：</b>将毛细管水平放置，一端连接恒压水源，另一端出口置入量筒。\n<b>步骤 2 — 设定 ΔP：</b>调节高位水箱高度，记录 U 型管两侧液面差，计算 ΔP = ρgΔh。\n<b>步骤 3 — 测流量 Q：</b>用秒表记录收集一定体积 V 所需的时间 t，计算 Q = V/t。\n<b>步骤 4 — 重复：</b>保持 ΔP 不变，测量 3 次取平均。然后改变 ΔP，重复步骤 2-4。\n<b>步骤 5 — 换管：</b>更换不同内径的毛细管，重复全部实验。\n\n<b> 数据处理：</b>\n1. 绘制 Q - ΔP 曲线，应得过原点直线（验证线性关系）\n2. 绘制 Q - r⁴ 曲线，应得过原点直线（验证四次方效应）\n3. 由斜率反算 η = πr⁴ΔP/(8QL)，与已知值对比\n\n<b> 注意事项：</b>\n· 必须确保 Re < 2000（层流条件），否则数据无效\n· 毛细管入口段需足够长（L >> 0.06×Re×D），确保充分发展流动\n· 液体需脱气处理，气泡会严重干扰流量\n· 温度控制至关重要'
  },
  {
    id: 'real_stokes_lab',
    keywords: ['怎么做斯托克斯实验', '落球法', '沉降实验', '小球下落', '粘度测量', '斯托克斯真实实验'],
    tags: ['指导'],
    experiment: 'stokes',
    title: ' 真实实验：斯托克斯定律 — 落球法测粘度',
    response: '<b> 实验目的：</b>通过测量小球在粘性流体中的终端沉降速度，利用斯托克斯定律计算流体动力粘度 η。\n\n<b> 所需器材：</b>\n· 透明量筒或沉降管（内径至少为球径的 10 倍以上，高约 1 m）\n· 精密小球（钢球或玻璃球，已知密度 ρs 和半径 r，表面光滑）\n· 游标卡尺或千分尺（测球径，精度 0.01 mm）\n· 电子天平（测球质量，验证密度）\n· 秒表（精度 0.01 s）\n· 待测液体（甘油、蓖麻油、机油等）\n· 温度计 + 恒温水浴\n· 刻度标尺（贴于量筒外壁）\n\n<b> 操作步骤：</b>\n<b>步骤 1 — 准备：</b>将待测液体注入量筒，恒温水浴控温，记录温度 T。在量筒外壁标记两个刻度线（上标记和下标记，间距约 30-50 cm）。\n<b>步骤 2 — 测量球参数：</b>用千分尺测球径 r（测量 3 次取平均），用天平测质量 m，验证 ρs = 3m/(4πr³)。\n<b>步骤 3 — 释放小球：</b>用镊子将小球在液面中心轻轻释放，确保球沿管中心轴线下落（避免管壁效应）。\n<b>步骤 4 — 计时：</b>球经过上刻度线时开始计时，经过下刻度线时停止。记录时间 t。\n<b>步骤 5 — 重复：</b>每种球重复 3-5 次取平均。更换不同半径或不同材质的小球，重复全部实验。\n\n<b> 数据处理：</b>\n1. 计算终端速度 vt = 上下刻度间距 / 时间 t\n2. 验证层流条件：计算 Re = ρf·vt·2r/η，确保 Re < 0.1\n3. 由 vt 反算 η = 2r²(ρs-ρf)g/(9vt)\n4. 对比不同球径测得的 η 值应一致（验证定律正确性）\n\n<b> 注意事项：</b>\n· 上刻度线必须在液面以下足够深处（球已加速到终端速度）\n· 容器内径应 >> 球径（至少 10 倍），否则需用 Ladenburg 修正\n· 小球必须沿管中心下落，贴壁会导致误差极大\n· 液体中不能有气泡\n· 温度是最大误差来源，必须严格控温'
  },
  {
    id: 'real_lab_common_errors',
    keywords: ['实验误差', '注意事项', '失败原因', '误差来源', '为什么不对', '实验室技巧'],
    tags: ['指导'],
    experiment: 'all',
    title: ' 粘性实验 — 常见误差来源与避免方法',
    response: '<b> 温度失控（最大误差来源！）</b>\n流体粘度对温度极其敏感：水的粘度在 20°C 和 25°C 之间相差约 12%！甘油在 ±1°C 可导致 ±8% 的粘度变化。\n<b> 对策：</b>使用恒温水浴，控温精度至少 ±0.1°C，实验前液体需恒温 30 分钟以上。\n\n<b> 湍流干扰</b>\n流速过高导致流动失稳，偏离层流状态，公式不再适用。\n<b> 对策：</b>实验前估算 Re 数，确保 Re < 2000（管流）或 Re < 0.1（落球）。\n\n<b> 管壁/边缘效应</b>\n落球法：容器壁阻碍流体绕流。管流法：入口段流动尚未充分发展。\n<b> 对策：</b>落球容器内径 ≥ 10 倍球径；管流入口段长度 > 0.06×Re×D。\n\n<b> 测量精度不足</b>\n秒表反应时间误差（±0.2s）、游标卡尺读数误差、力传感器零点漂移等。\n<b> 对策：</b>多次测量取平均，使用电子传感器替代人工读数，标定仪器零点。\n\n<b> 流体污染/气泡</b>\n流体中混入气泡或杂质会改变有效粘度。\n<b> 对策：</b>液体静置或真空脱气，使用纯净液体，定期更换。\n\n<b> 小球偏心下落</b>\n落球法中球不沿管轴心下落，靠近管壁导致阻力偏大。\n<b> 对策：</b>使用导向管或中心释放器，目测确认轨迹居中。'
  },
  {
    id: 'real_lab_viscosity_meter',
    keywords: ['粘度计', '测量粘度', '粘度测定方法', '用什么测粘度', '粘度仪'],
    tags: ['指导'],
    experiment: 'all',
    title: ' 常见粘度测量方法一览',
    response: '<b>工业与实验室常用的粘度测定方法：</b>\n\n<b>1. 旋转粘度计（最常用）</b>\n原理：基于牛顿粘性定律 τ=η·(du/dz)\n· 圆筒式（Couette 型）：液体在两个同心圆筒间被剪切\n· 锥板式：液体在旋转锥体和固定平板间被剪切\n· 优点：可连续测量，适合非牛顿流体\n· 精度：±1-2%\n\n<b>2. 毛细管粘度计（经典标准）</b>\n原理：基于泊肃叶定律 Q=πΔPr⁴/(8ηL)\n· 乌氏粘度计（Ubbelohde）：测量液体流过毛细管的时间\n· 奥氏粘度计（Ostwald）：操作简单，常用于教学\n· 优点：精度高（±0.1%），是运动粘度的标准方法\n· 缺点：只能测透明牛顿流体\n\n<b>3. 落球粘度计（教学常用）</b>\n原理：基于斯托克斯定律 Fd=6πηrv\n· 测量小球在液体中下落一定距离的时间\n· Höppler 落球粘度计：倾斜管式，精度高\n· 优点：直观易懂，适合高粘度液体\n· 缺点：需知球和液体的密度\n\n<b>4. 振动式粘度计（工业在线）</b>\n· 测量振动探头在流体中的阻尼\n· 适合在线连续监测\n\n<b> 选择建议：</b>\n· 教学实验 → 落球法或毛细管法（原理清晰）\n· 低粘度液体（< 100 mPa·s） → 毛细管法\n· 高粘度液体（> 1 Pa·s） → 落球法或旋转法\n· 非牛顿流体 → 旋转粘度计（可改变剪切速率）'
  }
];


// 实验助手控制器

// 按原站公开组件的轮廓采样方式绘制悬浮入口的形变吉祥物。
if (!customElements.get('ai-launcher-mascot')) {
  customElements.define('ai-launcher-mascot', class extends HTMLElement {
    constructor() {
      super();
      this.pointCount = 72;
      this.morphDuration = 1150;
      this.previousForm = 0;
      this.frame = 0;
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host { display: block; width: 28px; height: 28px; contain: layout style; }
          * { box-sizing: border-box; }
          .ip { position: absolute; top: 0; left: 0; width: 56px; height: 56px; transform: translateY(-2px) scale(.5); transform-origin: top left; }
          .body { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(135deg,#c9a3ff 0%,#cbe7ff 55.2885%,#67e0ff 100%); background-position: 50% 50%; background-size: 240% 240%; will-change: clip-path,background-position; }
          .eyes { position: absolute; top: 20px; left: 18px; z-index: 1; display: flex; width: 20px; height: 7px; justify-content: space-between; transform: translate(var(--eye-offset-x,0),var(--eye-offset-y,0)); transition: transform 120ms ease-out; }
          .eye { width: 5px; height: 7px; background: #131212; border-radius: 10px; transform-origin: center; }
          .ip:not(.hovering):not(.morphing):not(.tracking) .eye { animation: ai-mascot-blink 4.6s linear infinite; }
          .ip.hovering .body { background-image: linear-gradient(135deg,#a8a0ff 0%,#cec9ff 50%,#ffc7e1 100%); animation: ai-mascot-drift 5.5s ease-in-out infinite alternate; }
          .ip[data-form="2"] .eyes { top: 19px; }
          @keyframes ai-mascot-blink { 0%,6.5217%,13.0435%,100% { transform: scaleY(1); } 3.2609%,9.7826% { transform: scaleY(.08); } }
          @keyframes ai-mascot-drift { 0% { background-position: 0% 20%; } 50% { background-position: 100% 80%; } 100% { background-position: 12% 100%; } }
          @media (prefers-reduced-motion: reduce) { .ip.hovering .body,.eye { animation: none; } }
        </style>
        <svg width="0" height="0" aria-hidden="true">
          <path id="form1" d="M21 4.04145C25.3316 1.54059 30.6684 1.54059 35 4.04145L45.2487 9.95855C49.5803 12.4594 52.2487 17.0812 52.2487 22.0829L52.2487 33.9171C52.2487 38.9188 49.5803 43.5406 45.2487 46.0415L35 51.9586C30.6684 54.4594 25.3316 54.4594 21 51.9586L10.7513 46.0415C6.41967 43.5406 3.75129 38.9188 3.75129 33.9171L3.75129 22.0829C3.75129 17.0812 6.41967 12.4594 10.7513 9.95855L21 4.04145Z" />
          <path id="form2" d="M18 4H38C45.732 4 52 10.268 52 18V38C52 45.732 45.732 52 38 52H18C10.268 52 4 45.732 4 38V18C4 10.268 10.268 4 18 4Z" />
          <path id="form3" d="M26.0737 7.08552C28.4607 3.65233 33.5393 3.65233 35.9263 7.08553L43.0981 17.4007C43.5053 17.9863 44.0137 18.4947 44.5993 18.9019L54.9145 26.0737C58.3477 28.4607 58.3477 33.5393 54.9145 35.9263L44.5993 43.0981C44.0136 43.5053 43.5053 44.0137 43.0981 44.5993L35.9263 54.9145C33.5393 58.3477 28.4607 58.3477 26.0737 54.9145L18.9019 44.5993C18.4947 44.0136 17.9863 43.5053 17.4007 43.0981L7.08552 35.9263C3.65233 33.5393 3.65233 28.4607 7.08553 26.0737L17.4007 18.9019C17.9863 18.4947 18.4947 17.9863 18.9019 17.4007L26.0737 7.08552Z" />
        </svg>
        <div class="ip" data-form="0"><div class="body"></div><div class="eyes" aria-hidden="true"><span class="eye"></span><span class="eye"></span></div></div>`;
      this.ip = this.shadowRoot.querySelector('.ip');
      this.body = this.shadowRoot.querySelector('.body');
      this.shapes = [this.circlePoints(), this.samplePath('form1'), this.samplePath('form2'), this.samplePath('form3', 61 / 62, -2.5)];
      this.points = this.shapes[0].map(p => ({ ...p }));
      this.setShape(this.points);
      this.onEnter = () => this.activate();
      this.onLeave = () => this.reset();
      this.onMove = event => this.trackEyes(event);
    }
    connectedCallback() {
      this.addEventListener('pointerenter', this.onEnter);
      this.addEventListener('pointerleave', this.onLeave);
      this.addEventListener('click', this.onEnter);
      window.addEventListener('pointermove', this.onMove, { passive: true });
    }
    disconnectedCallback() {
      cancelAnimationFrame(this.frame);
      this.removeEventListener('pointerenter', this.onEnter);
      this.removeEventListener('pointerleave', this.onLeave);
      this.removeEventListener('click', this.onEnter);
      window.removeEventListener('pointermove', this.onMove);
    }
    circlePoints() {
      return Array.from({ length: this.pointCount }, (_, i) => {
        const angle = -Math.PI / 2 + i / this.pointCount * Math.PI * 2;
        return { x: 28 + Math.cos(angle) * 28, y: 28 + Math.sin(angle) * 28 };
      });
    }
    samplePath(id, scale = 1, offset = 0) {
      const path = this.shadowRoot.getElementById(id);
      const length = path.getTotalLength();
      return Array.from({ length: this.pointCount }, (_, i) => {
        const point = path.getPointAtLength(i / this.pointCount * length);
        return { x: point.x * scale + offset, y: point.y * scale + offset };
      });
    }
    alignPoints(from, target) {
      let best = target, bestError = Infinity;
      for (const direction of [1, -1]) {
        for (let start = 0; start < this.pointCount; start++) {
          const aligned = target.map((_, i) => target[(start + direction * i + this.pointCount * 2) % this.pointCount]);
          const error = from.reduce((sum, p, i) => sum + (p.x - aligned[i].x) ** 2 + (p.y - aligned[i].y) ** 2, 0);
          if (error < bestError) { bestError = error; best = aligned; }
        }
      }
      return best;
    }
    setShape(points) {
      this.body.style.clipPath = `polygon(${points.map(p => `${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`).join(',')})`;
    }
    morphTo(target, done) {
      cancelAnimationFrame(this.frame);
      const from = this.points.map(p => ({ ...p }));
      const to = this.alignPoints(from, target);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.points = to.map(p => ({ ...p }));
        this.setShape(this.points);
        this.ip.classList.remove('morphing');
        if (done) done();
        return;
      }
      const start = performance.now();
      this.ip.classList.add('morphing');
      const step = now => {
        const progress = Math.min((now - start) / this.morphDuration, 1);
        const eased = 1 - (1 - progress) ** 3;
        this.points = from.map((p, i) => ({ x: p.x + (to[i].x - p.x) * eased, y: p.y + (to[i].y - p.y) * eased }));
        this.setShape(this.points);
        if (progress < 1) this.frame = requestAnimationFrame(step);
        else { this.ip.classList.remove('morphing'); if (done) done(); }
      };
      this.frame = requestAnimationFrame(step);
    }
    activate() {
      if (this.ip.classList.contains('hovering')) return;
      const options = [1, 2, 3].filter(n => n !== this.previousForm);
      const form = options[Math.floor(Math.random() * options.length)];
      this.previousForm = form;
      this.ip.dataset.form = String(form);
      this.ip.classList.remove('tracking');
      this.ip.classList.add('hovering');
      this.morphTo(this.shapes[form]);
    }
    reset() {
      if (this.ip.dataset.form === '0' && !this.ip.classList.contains('hovering')) return;
      this.ip.classList.remove('hovering');
      this.morphTo(this.shapes[0], () => { this.ip.dataset.form = '0'; });
    }
    trackEyes(event) {
      if (this.ip.dataset.form !== '0' || this.ip.classList.contains('hovering')) return;
      const box = this.getBoundingClientRect();
      const dx = event.clientX - box.left - box.width / 2;
      const dy = event.clientY - box.top - box.height / 2;
      const distance = Math.hypot(dx, dy);
      if (distance > 150) {
        this.ip.classList.remove('tracking');
        this.ip.style.removeProperty('--eye-offset-x');
        this.ip.style.removeProperty('--eye-offset-y');
        return;
      }
      this.ip.classList.add('tracking');
      this.ip.style.setProperty('--eye-offset-x', `${(dx / 150 * 6).toFixed(2)}px`);
      this.ip.style.setProperty('--eye-offset-y', `${(dy / 150 * 4).toFixed(2)}px`);
    }
  });
}
var AIAssistant = {
  isOpen: false,
  isMinimized: false,
  conversationHistory: [],
  lastQueryType: null,

  // ========== 格式化工具 ==========

  formatNumber: function(value, decimals) {
    if (value == null || isNaN(value)) return "N/A";
    decimals = decimals || 2;
    if (isFinite(value)) {
      if (Math.abs(value) >= 0.01 && Math.abs(value) < 1000)
        return value.toFixed(decimals);
      else
        return value.toExponential(decimals);
    }
    return value > 0 ? "∞" : "-∞";
  },

  formatShort: function(value) {
    return this.formatNumber(value, 2);
  },

  formatResponse: function(text) {
    var mm = window.aiRenderMath ? window.aiRenderMath(String(text)) : null;
    var out = (mm ? mm[0] : String(text)).replace(/\n/g, '<br>');
    if (mm && mm[1].length) out = window.aiMathUnstash(out, mm[1]);
    return out;
  },

  // ========== 打字机效果 ==========

  typewriterEffect: function(container, htmlText, speed) {
    speed = speed || 30;
    var processed = htmlText.replace(/<br\s*\/?>/gi, '<span class="br-marker"></span>');
    var wrapper = document.createElement("div");
    wrapper.innerHTML = processed;

    var tokens = [];
    function walk(node) {
      if (node.nodeType === 3) {
        var text = node.textContent;
        if (text) tokens.push({ type: "text", content: text });
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        if (tag === "span" && node.className === "br-marker") {
          tokens.push({ type: "br" });
        } else {
          var attrStr = "";
          for (var i = 0; i < node.attributes.length; i++) {
            var attr = node.attributes[i];
            attrStr += " " + attr.name + '="' + attr.value + '"';
          }
          tokens.push({ type: "tag-open", html: "<" + tag + attrStr + ">" });
          for (var j = 0; j < node.childNodes.length; j++) walk(node.childNodes[j]);
          tokens.push({ type: "tag-close", html: "</" + tag + ">" });
        }
      }
    }
    for (var k = 0; k < wrapper.childNodes.length; k++) walk(wrapper.childNodes[k]);

    var chars = [];
    for (var ti = 0; ti < tokens.length; ti++) {
      var tok = tokens[ti];
      if (tok.type === "text") {
        for (var cj = 0; cj < tok.content.length; cj++)
          chars.push({ type: "char", char: tok.content[cj] });
      } else if (tok.type === "br") {
        chars.push({ type: "br" });
      } else {
        chars.push({ type: "html", content: tok.html });
      }
    }

    var pos = 0, currentHTML = "";
    var self = this;
    (function step() {
      if (pos < chars.length) {
        var c = chars[pos];
        if (c.type === "char") currentHTML += c.char;
        else if (c.type === "br") currentHTML += "<br>";
        else currentHTML += c.content;
        pos++;
        container.innerHTML = currentHTML + '<span class="typewriter-cursor"></span>';
        var msgContainer = document.getElementById("ai-messages");
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        var delay = speed + 20 * (Math.random() - 0.5);
        setTimeout(step, delay);
      } else {
        container.innerHTML = htmlText;
        var mc = document.getElementById("ai-messages");
        if (mc) mc.scrollTop = mc.scrollHeight;
      }
    })();
  },

  showThinking: function(callback, duration) {
    duration = duration || 1500;
    var container = document.getElementById("ai-messages");
    if (container) {
      var thinkingDiv = document.createElement("div");
      thinkingDiv.className = "ai-thinking";
      thinkingDiv.innerHTML = '⏳ 思考中<span class="ai-thinking-dots"><span></span><span></span><span></span></span>';
      container.appendChild(thinkingDiv);
      container.scrollTop = container.scrollHeight;
      setTimeout(function() {
        if (thinkingDiv.parentNode) thinkingDiv.parentNode.removeChild(thinkingDiv);
        if (callback) callback();
      }, duration);
    }
  },

  showThinkingAndType: function(text, title) {
    var self = this;
    var delay = 800 + 1200 * Math.random();
    this.showThinking(function() {
      var container = document.getElementById("ai-messages");
      if (container) {
        var msgDiv = document.createElement("div");
        msgDiv.className = "ai-msg assistant";
        container.appendChild(msgDiv);
        var html = (title ? '<div class="ai-msg-title">' + title + "</div>" : "") + self.formatResponse(text);
        self.typewriterEffect(msgDiv, html, 25);
      }
    }, delay);
  },

  // ========== 查询处理 ==========

  classifyQuery: function(text) {
    var lower = text.toLowerCase();
    if (/计算|多少|等于|结果是/.test(lower)) return "calculation";
    if (/影响|变化|增大|减小|如果.*会|变大|变小/.test(lower)) return "parameter_effect";
    if (/什么|为什么|怎么|如何|是什么意思|解释/.test(lower)) return "concept";
    if (/操作|使用|怎么.*用|步骤|方法/.test(lower)) return "operation";
    if (/对比|比较|区别|差异|不同/.test(lower)) return "comparison";
    return "concept";
  },

  handleVisualizationCommand: function(text) {
    var lower = text.toLowerCase();
    if (/公式推导|推导过程|怎么来的|如何得出/.test(lower)) {
      this.showFormulaDerivation(); return true;
    }
    if (/参数影响|变化趋势|参数对比|可视化.*参数/.test(lower)) {
      this.showParameterVisualization(); return true;
    }
    if (/对比.*和|比较.*和|水.*蜂蜜|蜂蜜.*水|对比.*管径|对比.*半径/.test(lower)) {
      this.showComparisonDemo(); return true;
    }
    if (/学习引导|步骤指导|循序渐进|新手/.test(lower)) {
      this.showLearningGuide(); return true;
    }
    return false;
  },

  generateContextualResponse: function(text, type) {
    var ctx = this.getContext();
    var lower = text.toLowerCase();
    var st = ctx.simulationState;

    if (ctx.expName === '斯托克斯定律' && st.terminalVelocity !== undefined) {
      var vt = st.terminalVelocity;
      var Re = st.reynoldsNumber;
      if (/终端速度|终速|vt|收尾速度/.test(lower)) {
        return ' **当前参数下的终端速度**\n\nvt = 2R²g(ρs-ρf) / 9η\n= **' + this.formatShort(vt) + ' m/s**\n= **' + this.formatShort(vt * 1000) + ' mm/s**';
      }
      if (/雷诺数|Re/.test(lower)) {
        // 分区阈值与 PhysicsEngine.stokes 保持一致（0.1 / 1 / 800），不再用 1 / 1000
        var regime = st.blended ? ' 模型平滑过渡区：采用相邻公式混合' : st.dragFormula === 'stokes' ? ' 斯托克斯区（Re < 0.1，采用低雷诺数近似 F = 6πμrv）'
          : st.dragFormula === 'oseen' ? ' Oseen 修正区（0.1 ≤ Re < 1，需一阶惯性修正）'
          : st.dragFormula === 'schiller-naumann' ? ' Schiller–Naumann 过渡区（1 ≤ Re < 800，含 Re^0.687 修正）'
          : ' 牛顿阻力区（Re ≥ 800，斯托克斯公式不再适用）';
        return ' **当前雷诺数分析**\n\nRe = **' + this.formatShort(Re) + '**\n' + regime + '\n\n附：雷诺数 Re = ρ·2R·vt / η';
      }
      if (type === 'parameter_effect') {
        if (/半径|r|R/.test(lower) && /增大|增加|变大|一倍/.test(lower)) {
          return ' **半径影响分析**\n\n终端速度公式 vt ∝ R²\n\n如果半径增大一倍（2倍）：\nvt 增大到 **4倍**\n\n- 当前 vt = ' + this.formatShort(vt) + ' m/s\n- 增大后 vt ≈ ' + this.formatShort(vt * 4) + ' m/s\n\n 这是斯托克斯定律关键结论：速度正比于半径的平方！';
        }
        if (/粘度|粘滞|黏度|η/.test(lower) && /增大|增加|变大/.test(lower)) {
          return ' **粘度影响分析**\n\n终端速度公式 vt ∝ 1/η\n\n如果粘度增大一倍（2倍）：\nvt 减小到 **1/2倍**\n\n- 当前 vt = ' + this.formatShort(vt) + ' m/s\n- 增大后 vt ≈ ' + this.formatShort(vt / 2) + ' m/s\n\n 粘滞系数越大，小球沉降越慢。';
        }
      }
    }

    if (ctx.expName === '牛顿黏性定律' && st.velocityGradient !== undefined) {
      if (/速度梯度|du\/dz/.test(lower)) {
        return ' **当前速度梯度**\n\ndu/dz = U / z = **' + st.velocityGradient.toFixed(2) + ' s⁻¹**\n\n剪切应力 τ = η × (du/dz) = **' + st.shearStress + ' Pa**\n内摩擦力 F = τ × A = **' + st.frictionForce + ' N**';
      }
    }

    if (ctx.expName === '泊肃叶定律' && st.flowRate !== undefined) {
      if (/流量|Q/.test(lower)) {
        return ' **当前流量**\n\nQ = πR⁴ΔP / (8ηL)\n= **' + this.formatShort(st.flowRate) + ' m³/s**\n= **' + (1e6 * st.flowRate).toFixed(3) + ' mL/s**\n\n最大流速 vmax = **' + this.formatShort(st.maxVelocity) + ' m/s**';
      }
      if (/半径.*影响|R.*影响|四次方/.test(lower)) {
        return ' **半径对流量影响（四次方效应）**\n\nQ ∝ R⁴\n\n如果半径增大50%（1.5倍）：\n流量增大到 1.5⁴ = **5.06倍**\n\n如果半径增大一倍（2倍）：\n流量增大到 2⁴ = **16倍**\n\n 这就是"半径四次方效应"——管道半径的微小变化会导致流量的剧烈变化！';
      }
    }

    return null;
  },

  // ========== 可视化演示 ==========

  showFormulaDerivation: function() {
    var ctx = this.getContext();
    var text = '';
    if (ctx.expName === '斯托克斯定律') {
      text = ' **斯托克斯定律公式推导**\n\n**目标**：推导终端速度 vt = 2R²g(ρs - ρf) / 9η\n\n**第1步 - 受力分析**\n小球在流体中受三个力：\n  • 重力 G = mg = ρs·(4/3)πR³·g ↓\n  • 浮力 Fb = ρf·(4/3)πR³·g ↑\n  • 粘滞阻力 Fd = 6πηRv ↑\n\n**第2步 - 牛顿第二定律**\nma = G - Fb - Fd\n= (4/3)πR³g(ρs - ρf) - 6πηRv\n\n**第3步 - 匀速条件**\n达到匀速时 a = 0：\n6πηRvt = (4/3)πR³g(ρs - ρf)\n\n**第4步 - 解出 vt**\nvt = (4/3)πR³g(ρs - ρf) / (6πηR)\n  = 2R²g(ρs - ρf) / 9η  ';
    } else if (ctx.expName === '牛顿黏性定律') {
      text = ' **牛顿黏性定律公式推导**\n\n**目标**：理解 τ = η·(du/dz) 和 F = ηA·(U/z)\n\n**实验模型**：两块平行板，底板固定，顶板以速度U移动，板间距为z\n\n**第1步 - 速度梯度定义**\ndu/dz = (顶板速度 - 底板速度) / 板间距 = U / z\n\n**第2步 - 牛顿黏性基本公式**\nτ = η × (du/dz)\n  = η × (U / z)\n\n**第3步 - 计算内摩擦力**\nF = τ × A\n  = η × A × (U / z)\n\n物理意义：\n- η越大 → 流体越黏稠 → 力越大\n- A越大 → 接触面积越大 → 力越大\n- z越小 → 速度梯度越大 → 力越大';
    } else if (ctx.expName === '泊肃叶定律') {
      text = ' **泊肃叶定律公式推导**\n\n**目标**：推导流量 Q = πR⁴ΔP / (8ηL)\n\n**前提假设**：\n1. 层流流动（Re < 2000）\n2. 不可压缩牛顿流体\n3. 圆管充分发展流动\n\n**第1步 - 力平衡分析**\n取圆柱形流体元：压力差驱动力 = 粘性阻力\nΔP·πr² = -η·(dv/dr)·2πrL\n\n**第2步 - 速度分布**\ndv/dr = -ΔP·r / (2ηL)\n积分得：v(r) = ΔP(R² - r²) / (4ηL)\n这是抛物线分布！\n\n**第3步 - 积分求流量**\nQ = ∫ v(r)·2πr·dr (从0到R)\n  = ∫[ΔP(R² - r²)/(4ηL)]·2πr·dr\n  = πΔPR⁴ / (8ηL)  ';
    }
    this.showThinkingAndType(text, ' 公式推导');
  },

  showParameterVisualization: function() {
    var ctx = this.getContext();
    var st = ctx.simulationState;
    var text = '';
    if (ctx.expName === '斯托克斯定律' && st.terminalVelocity !== undefined) {
      var vt = st.terminalVelocity;
      // 用当前真实半径做基准，按 vt ∝ R² 计算其它半径下的 vt
      var Rcur_mm = (ctx.params.ballRadius || 0.001) * 1000;
      var eta_cur = ctx.params.viscosity || 1;
      // 半径档位（mm），vt 比例 = (R/Rcur)²
      function vtAtR(rmm) { return vt * (rmm / Rcur_mm) * (rmm / Rcur_mm); }
      // 粘度档位，vt 比例 = η_cur / η
      function vtAtEta(e) { return e > 0 ? vt * (eta_cur / e) : vt; }
      text = ' **参数影响可视化 — 斯托克斯定律**\n\n' +
        '公式：vt = 2R²g(ρs - ρf) / 9η\n\n' +
        '━━━ 半径 R 的影响（η固定）━━━\n' +
        'R = ' + (Rcur_mm * 0.5).toFixed(2) + 'mm → vt = ' + this.formatShort(vtAtR(Rcur_mm * 0.5)) + ' m/s\n' +
        'R = ' + (Rcur_mm * 0.75).toFixed(2) + 'mm → vt = ' + this.formatShort(vtAtR(Rcur_mm * 0.75)) + ' m/s\n' +
        'R = ' + Rcur_mm.toFixed(2) + 'mm → vt = ' + this.formatShort(vt) + ' m/s ← 当前\n' +
        'R = ' + (Rcur_mm * 1.25).toFixed(2) + 'mm → vt = ' + this.formatShort(vtAtR(Rcur_mm * 1.25)) + ' m/s\n' +
        'R = ' + (Rcur_mm * 1.5).toFixed(2) + 'mm → vt = ' + this.formatShort(vtAtR(Rcur_mm * 1.5)) + ' m/s\n\n' +
        '━━━ 粘度 η 的影响（R固定）━━━\n' +
        'η = ' + (eta_cur * 0.5) + ' Pa·s → vt = ' + this.formatShort(vtAtEta(eta_cur * 0.5)) + ' m/s\n' +
        'η = ' + eta_cur + ' Pa·s → vt = ' + this.formatShort(vt) + ' m/s ← 当前\n' +
        'η = ' + (eta_cur * 1.5) + ' Pa·s → vt = ' + this.formatShort(vtAtEta(eta_cur * 1.5)) + ' m/s\n' +
        'η = ' + (eta_cur * 2) + ' Pa·s → vt = ' + this.formatShort(vtAtEta(eta_cur * 2)) + ' m/s';
    } else if (ctx.expName === '泊肃叶定律' && st.flowRate !== undefined) {
      text = ' **参数影响可视化 — 泊肃叶定律**\n\n' +
        '公式：Q = πR⁴ΔP / (8ηL)\n\n' +
        '━━━ 半径 R 对流量 Q 的影响（四次方！）━━━\n' +
        'R = 1.0mm → Q ∝ 1⁴ = 1 倍\n' +
        'R = 1.5mm → Q ∝ 1.5⁴ = 5.1 倍\n' +
        'R = 2.0mm → Q ∝ 2⁴ = 16 倍\n' +
        'R = 2.5mm → Q ∝ 2.5⁴ = 39 倍\n' +
        'R = 3.0mm → Q ∝ 3⁴ = 81 倍\n\n' +
        ' 管道半径的微小增加会导致流量的巨大增长！';
    } else {
      text = ' **参数影响可视化**\n\n' +
        '请先启动实验模拟，然后询问"显示参数影响"，即可看到当前参数下的数值分析表格。';
    }
    this.showThinkingAndType(text, ' 参数影响可视化');
  },

  showComparisonDemo: function() {
    var ctx = this.getContext();
    var text = '';
    if (ctx.expName === '斯托克斯定律' || ctx.expName === '斯托克斯定律实验') {
      text = ' **流体对比演示 — 不同流体中的沉降**\n\n' +
        '同一小球（R=2mm, ρs=7800kg/m³）在不同流体中：\n\n' +
        '| 流体 | η (Pa·s) | ρ (kg/m³) | 终端速度 |\n' +
        '|------|----------|-----------|----------|\n' +
        '|  水 | 0.001 | 1000 | ~59 mm/s |\n' +
        '|  橄榄油 | 0.081 | 920 | ~0.74 mm/s |\n' +
        '|  甘油 | 1.412 | 1260 | ~0.04 mm/s |\n' +
        '|  蜂蜜 | 2.0 | 1400 | ~0.03 mm/s |\n\n' +
        ' 粘度越高，沉降越慢（反比关系）';
    } else if (ctx.expName === '泊肃叶定律') {
      text = ' **管径对比演示 — 相同压差下的流量差异**\n\n' +
        '同一条件（ΔP=100Pa, η=2mPa·s, L=1m）不同管径：\n\n' +
        '| 管径 | 半径 R | 流量 Q |\n' +
        '|------|--------|--------|\n' +
        '|  细管 | 1.0mm | ~0.04 mL/s |\n' +
        '|  中管 | 2.0mm | ~0.66 mL/s |\n' +
        '|  粗管 | 3.0mm | ~3.3 mL/s |\n' +
        '|  特粗管 | 5.0mm | ~25.0 mL/s |\n\n' +
        ' 半径从1mm增到5mm（5倍），流量增大625倍（5⁴）！';
    } else {
      text = ' **对比演示**\n\n请先在斯托克斯定律或泊肃叶定律实验中启动模拟，然后询问"对比水和蜂蜜"或"对比不同管径"。';
    }
    this.showThinkingAndType(text, ' 对比演示');
  },

  showLearningGuide: function() {
    var ctx = this.getContext();
    var expName = ctx.expName || '当前实验';
    var text = ' **学习引导 — ' + expName + '**\n\n' +
      ' **阶段一：基础观察（~5分钟）**\n' +
      '1. 观察默认参数下的仿真动画\n' +
      '2. 注意流动模式（层流/湍流）和粒子运动\n' +
      '3. 查看右侧数据面板的计算结果\n\n' +
      ' **阶段二：参数探索（~10分钟）**\n' +
      '1. 逐个调整每个参数滑块\n' +
      '2. 观察参数变化对结果的影响\n' +
      '3. 尝试流体预设按钮快速切换场景\n' +
      '4. 使用实验助手的"显示参数影响"功能\n\n' +
      ' **阶段三：对比实验（~15分钟）**\n' +
      '1. 开启对比模式（按钮）\n' +
      '2. 设置A/B/C三组不同参数\n' +
      '3. 对比不同流体的行为差异\n' +
      '4. 尝试"对比水和蜂蜜"等命令\n\n' +
      ' **阶段四：深入思考（~10分钟）**\n' +
      '1. 使用"显示公式推导"理解数学原理\n' +
      '2. 思考实际应用场景\n' +
      '3. 尝试预测参数变化的结果\n' +
      '4. 用仿真验证你的预测';
    this.showThinkingAndType(text, ' 学习引导');
  },

  // ========== 智能推荐 ==========

  showSmartRecommendations: function() {
    var ctx = this.getContext();
    if (!ctx.expName || ctx.expName === '未选择') return;
    var questions = [];
    if (ctx.expName === '斯托克斯定律') {
      questions = [
        '当前参数下终端速度是多少？',
        '雷诺数是多少？',
        '如果半径增大一倍，速度会怎样？',
        '显示公式推导',
        '显示参数影响',
        '对比水和蜂蜜',
        '学习引导'
      ];
    } else if (ctx.expName === '牛顿黏性定律') {
      questions = [
        '当前速度梯度是多少？',
        '剪切应力如何计算？',
        '显示公式推导',
        '显示参数影响',
        '学习引导'
      ];
    } else if (ctx.expName === '泊肃叶定律') {
      questions = [
        '当前流量是多少？',
        '半径对流量有什么影响？',
        '显示公式推导',
        '显示参数影响',
        '对比不同管径',
        '学习引导'
      ];
    }
    if (questions.length > 0) {
      var html = ' **你可能想问**：\n' +
        questions.map(function(q) {
          return '<span class="ai-msg-action" onclick="AIAssistant.askQuestion(\'' + q.replace(/'/g, "\\'") + '\')"> ' + q + '</span><br>';
        }).join('');
      var self = this;
      setTimeout(function() {
        self.showThinkingAndType(html, ' 智能推荐');
      }, 500);
    }
  },

  askQuestion: function(text) {
    var input = document.getElementById('ai-user-input');
    if (input) { input.value = text; }
    this.send();
  },

  // ========== 面板控制 ==========

  syncPanelVisibility: function(visible) {
    var panel = document.getElementById('ai-panel');
    var launcher = document.getElementById('ai-launcher');
    clearTimeout(this._panelAnimationTimer);
    clearTimeout(this._panelContentTimer);
    if (panel) {
      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.classList.remove('is-opening', 'is-open', 'is-closing', 'is-content-opening', 'is-content-closing');
      panel.classList.toggle('open', visible);
      if (visible) {
        if (reducedMotion) {
          panel.classList.add('is-open');
        } else {
          panel.classList.add('is-opening');
          this._panelContentTimer = setTimeout(function() {
            panel.classList.remove('is-opening');
            panel.classList.add('is-content-opening');
          }, 300);
          this._panelAnimationTimer = setTimeout(function() {
            panel.classList.remove('is-content-opening');
            panel.classList.add('is-open');
          }, 700);
        }
      } else if (!reducedMotion && this._panelWasOpen) {
        panel.classList.add('is-open', 'is-closing', 'is-content-closing');
        this._panelAnimationTimer = setTimeout(function() {
          panel.classList.remove('is-open', 'is-closing', 'is-content-closing');
        }, 200);
      }
      panel.classList.remove('minimized');
      panel.inert = !visible;
      panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    this._panelWasOpen = visible;
    if (launcher) {
      launcher.classList.toggle('is-hidden', visible);
      launcher.disabled = visible;
      launcher.setAttribute('aria-expanded', visible ? 'true' : 'false');
    }
  },

  open: function() {
    if (this.isOpen && !this.isMinimized) return;
    this.isOpen = true;
    this.isMinimized = false;
    this.bindFloatingDrag();
    this.syncPanelVisibility(true);
    this.showSmartRecommendations();
    var input = document.getElementById('ai-user-input');
    if (input) setTimeout(function() { input.focus(); }, 250);
  },

  close: function() {
    this.isOpen = false;
    this.isMinimized = false;
    this.syncPanelVisibility(false);
    var launcher = document.getElementById('ai-launcher');
    if (launcher) launcher.focus();
  },

  minimize: function() {
    this.close();
  },

  toggleDock: function() {
    var panel = document.getElementById('ai-panel');
    var button = document.getElementById('ai-size-btn');
    if (!panel) return;
    var floating = panel.classList.toggle('floating');
    // 切换模式时清除拖动坐标；进入浮层先落在右下角，随后可自由拖动。
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.height = '';
    if (button) {
      button.setAttribute('aria-pressed', floating ? 'true' : 'false');
      button.setAttribute('aria-label', floating ? '侧栏' : '浮层');
      button.title = floating ? '侧栏' : '浮层';
    }
  },

  // 兼容旧入口：之前的“切换窗口大小”调用仍转到浮层切换。
  toggleSize: function() {
    this.toggleDock();
  },

  bindFloatingDrag: function() {
    if (this._floatingDragBound) return;
    var panel = document.getElementById('ai-panel');
    var header = document.getElementById('ai-panel-header');
    if (!panel || !header) return;
    this._floatingDragBound = true;
    var drag = null;
    header.addEventListener('pointerdown', function (event) {
      if (window.matchMedia('(max-width: 767px)').matches || !panel.classList.contains('floating') || event.button !== 0 || event.target.closest('button')) return;
      var rect = panel.getBoundingClientRect();
      drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      var rect = panel.getBoundingClientRect();
      var margin = 8;
      var maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      var maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      var left = Math.min(maxLeft, Math.max(margin, event.clientX - drag.offsetX));
      var top = Math.min(maxTop, Math.max(margin, event.clientY - drag.offsetY));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    });
    var endDrag = function (event) {
      if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return;
      drag = null;
    };
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
  },

  switchTab: function(tab) { /* 已移除标签栏 */ },
  handleMode: function(mode) { /* 已移除模式栏 */ },

  queryByMode: function(tags) {
    var exp = AppState.currentExperiment || 'all';
    var matches = AIKnowledgeBase.filter(function(entry) {
      var tagMatch = tags.some(function(t) { return entry.tags.indexOf(t) >= 0; });
      var expMatch = entry.experiment === 'all' || entry.experiment === exp;
      return tagMatch && expMatch;
    });
    if (matches.length > 0) { this.showEntry(matches[0]); }
    else { this.addAssistantMsg('当前实验暂无相关内容，请尝试在" 对话"模式下输入具体问题。'); }
  },

  getContext: function() {
    var exp = AppState.currentExperiment;
    var expNames = { newton: '牛顿黏性定律', poiseuille: '泊肃叶定律', stokes: '斯托克斯定律' };
    var ctx = { expName: expNames[exp] || '未选择', params: {}, simulationState: {} };
    if (exp) {
      try { ctx.params = getParamValues(); } catch(e) {}
      try {
        var st = ctx.simulationState;
        var pv = ctx.params;
        // 复用 PhysicsEngine 计算当前值，保持参数名与滑块单位一致。
        
        
        if (exp === 'newton') {
          var cn = PhysicsEngine.newtonViscosity(pv.velocity, pv.viscosity, pv.distance, pv.area);
          st.velocityGradient = cn.grad;   // s⁻¹
          st.shearStress = cn.tau;         // Pa
          st.frictionForce = cn.F;         // N
          st.spacingMm = pv.distance;      // 滑块单位就是 mm
        } else if (exp === 'poiseuille') {
          var cp = PhysicsEngine.poiseuille(pv.radius, pv.length, pv.pressure, pv.viscosity, pv.density);
          st.flowRate = cp.Q;              // m³/s
          st.maxVelocity = cp.vmax;        // m/s
          st.avgVelocity = cp.v_avg;       // m/s
          st.resistance = cp.Rf;           // Pa·s/m³
          st.reynoldsNumber = cp.Re;
        } else if (exp === 'stokes') {
          var cs = PhysicsEngine.stokes(pv.ballRadius, pv.ballDensity, pv.fluidDensity, pv.viscosity);
          st.terminalVelocity = cs.vt;     // m/s
          st.gravity = cs.Fg;              // N
          st.buoyancy = cs.Fb;             // N
          st.netForce = cs.Fg - cs.Fb;     // N
          st.volume = cs.volume;
          st.mass = cs.mass;
          st.reynoldsNumber = cs.Re;
          st.dragFormula = cs.dragFormula; // stokes / oseen / schiller-naumann / newton
          var muSafe = Math.max(pv.viscosity, 1e-12);
          st.timeConstant = (2 * pv.ballDensity * pv.ballRadius * pv.ballRadius) / (9 * muSafe);
        }
      } catch(e) {}
    }
    return ctx;
  },

  addAssistantMsg: function(text, title) {
    var container = document.getElementById('ai-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'ai-msg assistant';
    div.innerHTML = (title ? '<div class="ai-msg-title">' + title + '</div>' : '') + text.replace(/\n/g, '<br>');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  addUserMsg: function(text) {
    var container = document.getElementById('ai-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'ai-msg user';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
};


// 实验助手本地问答扩展
// 在 AIAssistant 对象定义之后挂载：
// 数值问答：提取参数并调用 PhysicsEngine
// 知识匹配：同义词归一、加权评分和置信度阈值
// 未匹配时提供相关条目和示例问法

(function () {
  'use strict';
  var A = window.AIAssistant;
  if (!A) { console.warn('[AI v2] AIAssistant 未找到，跳过'); return; }

  // ---- 同义词归一：两边都归一后再比，避免「粘度 / 黏度」这类漏匹配 ----
  A._SYN = {
    '粘度': '黏度', '粘滞': '黏度', '粘性': '黏度', '动力粘度': '黏度', '黏滞': '黏度',
    '压力差': '压差', '压降': '压差', '压强差': '压差', '压强': '压差',
    '管径': '半径', '管子粗细': '半径',
    '两板间距': '间距', '平板间距': '间距', '板间距': '间距', '缝隙': '间距', '两板距离': '间距',
    '终速': '终端速度', '收尾速度': '终端速度', '沉降速度': '终端速度', '沉降速率': '终端速度',
    '球半径': '小球半径',
    '体积流量': '流量', '出水量': '流量',
    '流速': '速度', '速率': '速度'
  };

  A._norm = function (text) {
    var s = String(text == null ? '' : text).toLowerCase();
    s = s.replace(/[\uFF01-\uFF5E]/g, function (c) {          // 全角 → 半角
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    }).replace(/[\s，。、？！,.\?!;；:：()（）\[\]【】"'“”‘’\-_/]/g, '');
    var syn = this._SYN;
    Object.keys(syn).forEach(function (k) { s = s.split(k).join(syn[k]); });
    return s;
  };

  // ---- 可问的量 ----
  A._QTY = [
    { exp: 'stokes',     re: /终端速度|vt|v_t/,              name: '终端速度 <i>v</i><sub>t</sub>',   unit: 'm/s',     get: function (c) { return c.vt; } },
    { exp: 'stokes',     re: /黏滞阻力|粘滞阻力|阻力|fd/,    name: '黏滞阻力 <i>F</i><sub>d</sub>',   unit: 'N',       get: function (c) { return c.Fg - c.Fb; } },
    { exp: 'stokes',     re: /雷诺数|re\b/,                  name: '雷诺数 Re',      unit: '',        get: function (c) { return c.Re; } },
    { exp: 'poiseuille', re: /体积流量|流量|q\b/,            name: '体积流量 Q',     unit: 'm³/s',    get: function (c) { return c.Q; } },
    { exp: 'poiseuille', re: /最大流速|最大速度|umax|u_max/, name: '最大流速 <i>u</i><sub>max</sub>', unit: 'm/s',     get: function (c) { return c.vmax; } },
    { exp: 'poiseuille', re: /流阻/,                          name: '流阻 <i>R</i><sub>f</sub>',       unit: 'Pa·s/m³', get: function (c) { return c.Rf; } },
    { exp: 'poiseuille', re: /雷诺数|re\b/,                  name: '雷诺数 Re',      unit: '',        get: function (c) { return c.Re; } },
    { exp: 'newton',     re: /黏性力|内摩擦力|摩擦力|f\b/,   name: '黏性力 F',       unit: 'N',       get: function (c) { return c.F; } },
    { exp: 'newton',     re: /剪切应力|切应力|τ|tau/,        name: '剪切应力 τ',     unit: 'Pa',      get: function (c) { return c.tau; } },
    { exp: 'newton',     re: /速度梯度|dud[zy]/,             name: '速度梯度 du/dz', unit: 's⁻¹',     get: function (c) { return c.grad; } }
  ];

  // ---- 各实验可调参数（用于从问句抽覆盖值） ----
  A._PARAM = {
    newton: [
      { key: 'velocity',  re: /速度|u\b/,      label: '上板速度 u', unit: 'm/s' },
      { key: 'distance',  re: /间距|z\b/,      label: '板间距 z',   unit: 'mm' },
      { key: 'area',      re: /面积|a\b/,      label: '板面积 A',   unit: 'm²' },
      { key: 'viscosity', re: /黏度|η/,        label: '黏度 η',     unit: 'Pa·s' }
    ],
    poiseuille: [
      { key: 'radius',    re: /半径|r\b/,      label: '管半径 R',   unit: 'm' },
      { key: 'length',    re: /管长|长度|l\b/, label: '管长 L',     unit: 'm' },
      { key: 'pressure',  re: /压差|dp/,       label: '压强差 ΔP',  unit: 'Pa' },
      { key: 'viscosity', re: /黏度|μ/,        label: '黏度 μ',     unit: 'Pa·s' },
      { key: 'density',   re: /密度|ρ/,        label: '流体密度 ρ', unit: 'kg/m³' }
    ],
    stokes: [
      { key: 'ballRadius',   re: /小球半径|半径|r\b/, label: '小球半径 r',   unit: 'm' },
      { key: 'viscosity',    re: /黏度|μ|η/,          label: '黏度 μ',      unit: 'Pa·s' },
      { key: 'ballDensity',  re: /小球密度|球密度/,   label: '小球密度 ρs', unit: 'kg/m³' },
      { key: 'fluidDensity', re: /流体密度/,          label: '流体密度 ρf', unit: 'kg/m³' }
    ]
  };

  // 从问句解析「把某参数改成多少」，返回 { overrides, notes }
  A._parseOverrides = function (exp, raw) {
    var defs = this._PARAM[exp] || [];
    var overrides = {}, notes = [];
    if (!defs.length) return { overrides: overrides, notes: notes };
    var text = String(raw || '').toLowerCase();

    defs.forEach(function (p) {
      var m = p.re.exec(text);
      if (!m) return;
      var win = text.slice(m.index + m[0].length, m.index + m[0].length + 28);
      var mult = null;

      if (/翻倍|加倍|增大一倍|增加一倍|大一倍|double|乘2|×2/.test(win)) mult = 2;
      else if (/减半|少一半|一半|除以2|÷2/.test(win)) mult = 0.5;
      else {
        var pm = /(?:增大|增加|提高|变大|上升|提升)\s*([\d.]+)\s*%/.exec(win);
        if (pm) mult = 1 + parseFloat(pm[1]) / 100;
        else {
          pm = /(?:减小|减少|降低|变小|下降)\s*([\d.]+)\s*%/.exec(win);
          if (pm) mult = 1 - parseFloat(pm[1]) / 100;
        }
      }
      if (mult && isFinite(mult) && mult > 0) {
        overrides[p.key] = { mult: mult };
        notes.push(p.label + ' × ' + mult);
        return;
      }

      var vm = /(?:改成|变为|变成|设为|调到|调成|取为|到)\s*([\d.]+)\s*(mm|cm|m|kpa|pa|m\/s)?/.exec(win);
      if (!vm) vm = /([\d.]+)\s*(mm|cm|m|kpa|pa|m\/s)/.exec(win);
      if (vm) {
        var v = parseFloat(vm[1]);
        if (!isFinite(v)) return;
        var u = (vm[2] || '').toLowerCase();
        if (u === 'mm') v *= 0.001;
        else if (u === 'cm') v *= 0.01;
        else if (u === 'kpa') v *= 1000;
        overrides[p.key] = { value: v };
        notes.push(p.label + ' = ' + v);
      }
    });

    return { overrides: overrides, notes: notes };
  };

  A._isValueQuestion = function (raw) {
    return /多少|是多少|等于|数值|计算|算一下|算算|求|当前|现在|如果|假如|假设|改成|变成|设为|调到|翻倍|减半/.test(String(raw || ''));
  };

  // ---- 任意数值问答：算不出来返回 null ----
  A.tryCompute = function (text) {
    var raw = String(text || '');
    var lower = raw.toLowerCase();
    var cur = AppState.currentExperiment;
    var norm = this._norm(raw);

    var qty = null;
    for (var i = 0; i < this._QTY.length; i++) {
      var q = this._QTY[i];
      if (!q.re.test(lower) && !q.re.test(norm)) continue;
      if (q.exp === cur) { qty = q; break; }
      if (!qty) qty = q;
    }
    if (!qty) {
      if (!cur || !this._isValueQuestion(raw)) return null;
      qty = this._QTY.filter(function (x) { return x.exp === cur; })[0] || null;
      if (!qty) return null;
    }

    var wantManual = this._isValueQuestion(raw);
    var parsed = this._parseOverrides(qty.exp, raw);
    var hasOverride = Object.keys(parsed.overrides).length > 0;
    if (!wantManual && !hasOverride) return null;

    var usingLive = (qty.exp === cur), p;
    try {
      if (usingLive) { p = getParamValues(); }
      else {
        p = {};
        EXPERIMENTS[qty.exp].params.forEach(function (d) { p[d.id] = d.value; });
      }
    } catch (e) { return null; }

    var changes = [];
    Object.keys(parsed.overrides).forEach(function (k) {
      var ov = parsed.overrides[k], before = p[k];
      if (before == null || !isFinite(before)) {
        try { console.warn('[AI v2] 参数 ' + k + ' 不在当前参数集里，跳过该覆盖'); } catch (e) {}
        return;
      }
      p[k] = ov.mult != null ? before * ov.mult : ov.value;
      changes.push({ key: k, before: before, after: p[k] });
    });

    var c;
    if (qty.exp === 'newton') c = PhysicsEngine.newtonViscosity(p.velocity, p.viscosity, p.distance, p.area);
    else if (qty.exp === 'poiseuille') c = PhysicsEngine.poiseuille(p.radius, p.length, p.pressure, p.viscosity, p.density);
    else c = PhysicsEngine.stokes(p.ballRadius, p.ballDensity, p.fluidDensity, p.viscosity);
    if (!c) return null;

    var val = qty.get(c);
    if (val == null || !isFinite(val)) return null;

    var expName = { newton: '牛顿黏性定律', poiseuille: '泊肃叶定律', stokes: '斯托克斯定律' }[qty.exp];
    var out = ' **' + qty.name + ' — ' + expName + '**\n\n';
    out += usingLive ? '基准：当前滑块参数\n\n' : '基准：' + expName + '的默认参数（你当前不在这个实验里）\n\n';

    var self = this;
    if (changes.length) {
      out += '代入的改动：\n';
      changes.forEach(function (ch) {
        var def = (self._PARAM[qty.exp] || []).filter(function (x) { return x.key === ch.key; })[0];
        out += '· ' + (def ? def.label : ch.key) + '：' + self.formatShort(ch.before) + ' → **' + self.formatShort(ch.after) + '**\n';
      });
      out += '\n';
    }

    var shown = (Math.abs(val) < 0.001 || Math.abs(val) >= 10000) ? val.toExponential(4) : this.formatNumber(val, 4);
    out += '结果：**' + shown + (qty.unit ? ' ' + qty.unit : '') + '**\n';

    var extra = [];
    if (qty.exp === 'poiseuille') {
      extra.push('最大流速 ' + this.formatShort(c.vmax) + ' m/s');
      extra.push('平均速度 ' + this.formatShort(c.v_avg) + ' m/s');
      extra.push('雷诺数 ' + this.formatShort(c.Re));
    } else if (qty.exp === 'newton') {
      extra.push('速度梯度 ' + this.formatShort(c.grad) + ' s⁻¹');
      extra.push('剪切应力 ' + this.formatShort(c.tau) + ' Pa');
      extra.push('黏性力 ' + this.formatShort(c.F) + ' N');
    } else {
      extra.push('终端速度 ' + this.formatShort(c.vt) + ' m/s');
      extra.push('黏滞阻力 ' + this.formatShort(c.Fg - c.Fb) + ' N');
      extra.push('雷诺数 ' + this.formatShort(c.Re));
    }
    out += '\n同组其它量：' + extra.join('　|　') + '\n';

    if (qty.exp === 'stokes' && c.dragFormula) {
      var zone = c.dragFormula === 'stokes' ? ' 斯托克斯区（采用低雷诺数近似 F = 6πμrv）'
        : c.dragFormula === 'oseen' ? ' Oseen 修正区（0.1 ≤ Re < 1）'
        : c.dragFormula === 'schiller-naumann' ? ' Schiller–Naumann 过渡区（1 ≤ Re < 800）'
        : ' 牛顿阻力区（Re ≥ 800，斯托克斯公式不适用）';
      out += '\n阻力分区：' + zone + '\n';
    }

    return out;
  };

  // ---- 匹配升级：同义词归一 + 加权 + 置信度阈值 ----
  A.matchQuery = function (text) {
    var q = this._norm(text);
    var exp = AppState.currentExperiment || 'all';
    var self = this;
    var scored = AIKnowledgeBase.map(function (entry) {
      var score = 0, hits = 0, best = 0;
      (entry.keywords || []).forEach(function (kw) {
        var k = self._norm(kw);
        if (!k) return;
        if (q.indexOf(k) >= 0) {
          var w = k.length >= 4 ? 6 : (k.length >= 3 ? 4 : 2);
          score += w; hits++;
          if (w > best) best = w;
        }
      });
      if (hits > 0) {
        if (entry.experiment === exp) score += 6;
        else if (entry.experiment && entry.experiment !== 'all') score -= 3;
      }
      return { entry: entry, score: score, hits: hits, best: best };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    self._lastScored = scored;
    var top = scored[0];
    if (!top || top.hits === 0) return null;
    // 置信度：至少要命中一个 ≥3 字的关键词，或命中 2 个以上；否则宁可交给
    // tryCompute / 兜底，也不要凭一个短词乱答
    if (top.best < 4 && top.hits < 2) return null;
    return top.entry;
  };

  A._openByTitle = function (title) {
    var e = AIKnowledgeBase.filter(function (x) { return x.title === title; })[0];
    if (e) this.showEntry(e);
  };

  console.log('[AI v2] 智能问答已挂载：数值计算 / 同义词匹配 / 兜底引导');
})();


// 实验助手 UI v2：空态建议卡片 / 清空对话 / 实验标签

(function () {
  'use strict';
  var A = window.AIAssistant;
  if (!A) { console.warn('[AI UI v2] AIAssistant 未找到'); return; }

  // 根据当前实验生成建议问题。
  var SUGGEST = {
    newton: [
      ['', '当前黏性力是多少'],
      ['', '板间距减半，黏性力变成多少'],
      ['', '牛顿黏性定律的公式怎么推导'],
      ['', '速度梯度是什么意思'],
      ['', '当前剪切应力是多少'],
      ['', '黏度翻倍，黏性力如何变化'],
      ['', '显示参数影响'],
      ['', '如何完成牛顿黏性实验']
    ],
    poiseuille: [
      ['', '当前流量是多少'],
      ['', '半径改成 3mm，流量是多少'],
      ['', '为什么流量和半径是四次方关系'],
      ['', '怎么判断是不是层流'],
      ['', '当前雷诺数是多少'],
      ['', '压强差翻倍，流量如何变化'],
      ['', '为什么必须满足层流条件'],
      ['', '如何记录实验数据']
    ],
    stokes: [
      ['', '当前终端速度是多少'],
      ['', '黏度翻倍，终端速度变成多少'],
      ['', '斯托克斯定律的公式怎么推导'],
      ['', '什么情况下斯托克斯公式不适用'],
      ['', '当前雷诺数是多少'],
      ['', '小球半径翻倍，终端速度如何变化'],
      ['', '为什么有奥森修正'],
      ['', '如何判断公式适用范围']
    ],
    none: [
      ['', '牛顿黏性定律是什么'],
      ['', '泊肃叶定律的公式是什么'],
      ['', '斯托克斯定律是什么'],
      ['', '怎么开启对比模式'],
      ['', '三个实验有什么联系'],
      ['', '如何选择实验'],
      ['', '如何记录实验数据'],
      ['', '生成报告需要哪些步骤']
    ]
  };

  A.renderSuggestions = function () {
    var host = document.getElementById('ai-suggest');
    var exp = AppState.currentExperiment || 'none';
    if (this._suggestExperiment !== exp) {
      this._suggestExperiment = exp;
      this._suggestPage = 0;
    }
    var all = SUGGEST[exp] || SUGGEST.none;
    var list = all.slice((this._suggestPage || 0) * 4, ((this._suggestPage || 0) + 1) * 4);
    if (host) {
      host.innerHTML = list.map(function (it, i) {
        return '<button class="ai-suggest-item" data-i="' + i + '" style="--faq-index:' + i + '" type="button">' +
          (i === 0 ? '<span class="ico" aria-hidden="true"></span>' : '') +
          '<span class="txt">' + it[1] + '</span>' +
          '<span class="arrow" aria-hidden="true">›</span></button>';
      }).join('');
      Array.prototype.forEach.call(host.querySelectorAll('.ai-suggest-item'), function (b) {
        b.addEventListener('click', function () { A.askQuestion(list[+this.dataset.i][1]); });
      });
    }
    var quick = document.getElementById('ai-quick-menu');
    if (quick) {
      quick.innerHTML = '<div class="ai-quick-heading"><span>快捷问题</span><span>点击直接提问</span></div>' + list.map(function (it, i) {
        return '<button type="button" data-i="' + i + '">' + it[1] + '</button>';
      }).join('');
      Array.prototype.forEach.call(quick.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () { A.closeQuickMenu(); A.askQuestion(list[+this.dataset.i][1]); document.getElementById('ai-user-input')?.focus(); });
      });
    }
  };

  A.refreshSuggestions = function () {
    this._suggestPage = ((this._suggestPage || 0) + 1) % 2;
    this.renderSuggestions();
  };

  A.closeQuickMenu = function () {
    document.getElementById('ai-quick-menu')?.classList.remove('open');
    document.getElementById('ai-quick-btn')?.setAttribute('aria-expanded', 'false');
  };

  A.toggleQuickMenu = function () {
    var menu = document.getElementById('ai-quick-menu');
    var button = document.getElementById('ai-quick-btn');
    if (!menu) return;
    this.renderSuggestions();
    var open = menu.classList.toggle('open');
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) menu.querySelector('button')?.focus();
  };

  A.syncInputState = function () {
    var input = document.getElementById('ai-user-input');
    var button = document.getElementById('ai-send-btn');
    if (!input) return;
    input.style.height = '44px';
    input.style.height = Math.min(88, Math.max(44, input.scrollHeight)) + 'px';
    if (button) {
      var hasText = !!input.value.trim();
      button.classList.toggle('is-active', hasText);
      button.disabled = !hasText;
    }
  };

  A.clearChat = function () {
    if (this._requestBusy) {
      this.addAssistantMsg('当前请求仍在执行，完成后再新建会话。');
      return;
    }
    var c = document.getElementById('ai-messages');
    if (!c) return;
    this.conversationHistory = [];
    this.lastQueryType = null;
    c.innerHTML =
      '<div class="ai-intro" id="ai-intro">' +
      '  <div class="ai-hero">' +
      '    <span class="ai-hero-greeting">Hi～</span>' +
      '    <h4>我是流体 实验助手 </h4>' +
      '    <p>遇到实验问题，直接告诉我就好</p>' +
      '    <span class="ai-hero-avatar" aria-hidden="true"><video autoplay muted loop playsinline src="assets/f23244e077856102.webm"></video></span>' +
      '  </div>' +
      '  <div class="ai-suggest" id="ai-suggest"></div>' +
      '  <button class="ai-suggest-refresh" type="button" onclick="AIAssistant.refreshSuggestions()" aria-label="换一批推荐问题"><span aria-hidden="true">⟳</span> 换一批</button>' +
      '</div>';
    var input = document.getElementById('ai-user-input');
    if (input) input.value = '';
    this.syncInputState();
    var menu = document.getElementById('ai-quick-menu');
    this.closeQuickMenu();
    this.renderSuggestions();
    var suggest = document.getElementById('ai-suggest');
    if (suggest) {
      suggest.classList.remove('new-chat-animate');
      void suggest.offsetWidth;
      suggest.classList.add('new-chat-animate');
      window.setTimeout(function () {
        suggest.classList.remove('new-chat-animate');
      }, 1200);
    }
  };

  // 打开面板时刷新实验标签与建议
  var _open = A.open;
  A.open = function () {
    _open.apply(this, arguments);
    try { this.renderSuggestions(); } catch (e) {}
  };

  // 旧的「 智能推荐」每次开面板都往对话里塞消息，已被空态卡片取代
  A.showSmartRecommendations = function () {};

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && A.isOpen) {
      if (document.getElementById('ai-quick-menu')?.classList.contains('open')) {
        A.closeQuickMenu(); document.getElementById('ai-quick-btn')?.focus();
      } else A.close();
    }
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('#ai-quick-menu, #ai-quick-btn')) A.closeQuickMenu();
  });

  function boot() {
    try {
      A.renderSuggestions();
      var input = document.getElementById('ai-user-input');
      if (input) input.addEventListener('input', function () { A.syncInputState(); });
      A.syncInputState();
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 700); });
  } else {
    setTimeout(boot, 700);
  }
  console.log('[AI UI v2] 空态建议卡片已挂载');
})();



(function() {
'use strict';


// 3D流体力学仿真 - Three.js 完整引擎
// 包装为IIFE以避免变量冲突


        
        // 全局变量与初始化
        
        let scene, camera, renderer, controls;
        let currentScene = 'newton';
        let animationId;
        
        // 动画状态
        const animationStates = {
            newton: { running: false, time: 0 },
            poiseuille: { running: false, time: 0 },
            stokes: { running: false, mode: 'gravity', ballVelocity: 0, visualVelocity: 0, ballPosition: 4.0, hasFlashed: false }
        };
        
        // 场景对象容器
        const sceneObjects = {
            newton: null,
            poiseuille: null,
            stokes: null
        };
        
        // 物理参数
        const physics = {
            newton: {
                viscosity: 1,
                velocity: 2,
                gap: 1,
                area: 1
            },
            poiseuille: {
                radius: 2.5,
                pressure: 100,
                viscosity: 2,
                length: 1
            },
            stokes: {
                radius: 2,       // mm
                viscosity: 1,    // Pa·s
                omega: 1000,
                mode: 'gravity'
            }
        };
        
        // 泊肃叶粒子速度颜色映射
        // speedNorm: 0=管壁(最慢), 1=中心(最快)
        // 颜色方案：蓝(慢) → 青 → 绿 → 黄 → 橙 → 红(快)
        const poiseuilleColorCache = {};
        function getPoiseuilleParticleColor(speedNorm) {
            // 量化到100级以复用材质
            const key = Math.round(speedNorm * 99);
            if (poiseuilleColorCache[key]) return poiseuilleColorCache[key];

            const t = key / 99; // 0~1
            let r, g, b;
            // 颜色分布：大幅减少红色，增加绿黄区间
            // 蓝→青(15%) → 青→绿(25%) → 绿→黄(30%) → 黄→橙(20%) → 橙→红(10%)
            if (t < 0.15) {
                // 蓝 → 青 (0-15%, 占15%)
                const s = t / 0.15;
                r = 0; g = Math.round(68 + s * 102); b = Math.round(255 - s * 55);
            } else if (t < 0.40) {
                // 青 → 绿 (15-40%, 占25%)
                const s = (t - 0.15) / 0.25;
                r = 0; g = Math.round(170 + s * 85); b = Math.round(200 - s * 200);
            } else if (t < 0.70) {
                // 绿 → 黄 (40-70%, 占30%)
                const s = (t - 0.40) / 0.3;
                r = Math.round(s * 255); g = 255; b = 0;
            } else if (t < 0.90) {
                // 黄 → 橙 (70-90%, 占20%)
                const s = (t - 0.70) / 0.2;
                r = 255; g = Math.round(255 - s * 119); b = 0;
            } else {
                // 橙 → 红 (90-100%, 占10%)
                const s = (t - 0.90) / 0.1;
                r = 255; g = Math.round(136 - s * 136); b = 0;
            }

            const color = new THREE.Color(r / 255, g / 255, b / 255);
            poiseuilleColorCache[key] = color;
            return color;
        }
        
        function getPoiseuilleParticleMaterial(speedNorm) {
            const color = getPoiseuilleParticleColor(speedNorm);
            return new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.4,
                emissive: color.clone().multiplyScalar(0.3),
                emissiveIntensity: 0.5
            });
        }
        
        // 根据实时速度获取粒子颜色（蓝→红渐变）
        // speedNorm: 0=最慢(蓝色), 1=最快(红色)
        // 这个函数现在只根据速度着色，不再根据雷诺数区分
        function getParticleColorBySpeed(speedNorm) {
            // 直接使用速度梯度着色：蓝→青→绿→黄→橙→红
            return getPoiseuilleParticleColor(speedNorm);
        }
        
        // 根据雷诺数状态获取粒子颜色（创建时使用）
        // Re < 2000: 速度梯度着色 (蓝->红)
        // 2000 <= Re < 4000: 过渡状态 (黄+红)
        // Re >= 4000: 湍流状态 (只有红)
        function getParticleColorByReynolds(speedNorm, Re) {
            if (Re < 2000) {
                // 层流：速度梯度着色
                return getPoiseuilleParticleColor(speedNorm);
            } else if (Re < 4000) {
                // 过渡状态：黄色和红色
                // speedNorm >= 0.5 用红色，< 0.5 用黄色
                if (speedNorm >= 0.5) {
                    return new THREE.Color(1, 0, 0); // 纯红
                } else {
                    return new THREE.Color(1, 1, 0); // 纯黄
                }
            } else {
                // 湍流状态：只有红色
                return new THREE.Color(1, 0, 0); // 纯红
            }
        }
        
        // 材质缓存：按 (speedNorm 量化 + 雷诺数区间) 复用，避免每帧 new 出新材质造成 GPU 内存泄漏
        const _poiseuilleMaterialCache = {};
        function getParticleMaterialByReynolds(speedNorm, Re) {
            // 统一使用速度着色，不再根据雷诺数区分
            var reBucket = Re < 2000 ? 'l' : (Re < 4000 ? 't' : 'r');
            var key = Math.round(speedNorm * 99) + '_' + reBucket;
            if (_poiseuilleMaterialCache[key]) return _poiseuilleMaterialCache[key];
            const color = getParticleColorBySpeed(speedNorm);
            var m = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.4,
                emissive: color.clone().multiplyScalar(0.3),
                emissiveIntensity: 0.5
            });
            _poiseuilleMaterialCache[key] = m;
            return m;
        }

        // 释放所有缓存材质（场景切换/清理时调用）
        function disposePoiseuilleMaterialCache() {
            for (var k in _poiseuilleMaterialCache) {
                if (Object.prototype.hasOwnProperty.call(_poiseuilleMaterialCache, k)) {
                    _poiseuilleMaterialCache[k].dispose();
                    delete _poiseuilleMaterialCache[k];
                }
            }
        }
        
        
        // Three.js 初始化
        
        function initThree(targetScene) {
            const container = document.getElementById('canvas-container');
            if (!container) { console.warn("canvas-container not found"); return false; }
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            // 检测WebGL支持
            let webglAvailable = false;
            try {
                const testCanvas = document.createElement('canvas');
                webglAvailable = !!(window.WebGLRenderingContext && 
                    (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
            } catch(e) {
                webglAvailable = false;
            }
            
            // 如果WebGL不可用，显示提示
            if (!webglAvailable) {
                var loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.innerHTML = `
                    <div style="color: #00d4ff; text-align: center; padding: 40px; max-width: 600px;">
                        <h2 style="margin-bottom: 20px; font-size: 1.5rem;"> WebGL 不可用</h2>
                        <p style="margin-bottom: 15px; line-height: 1.6; color: rgba(255,255,255,0.8);">
                            您的浏览器环境不支持WebGL渲染。这通常发生在以下情况：
                        </p>
                        <ul style="text-align: left; margin: 20px auto; padding-left: 20px; color: rgba(255,255,255,0.7); line-height: 1.8;">
                            <li>浏览器或设备不支持WebGL</li>
                            <li>GPU被禁用或不可用</li>
                            <li>在预览/沙箱环境中运行</li>
                        </ul>
                        <p style="margin-top: 20px; padding: 15px; background: rgba(0,212,255,0.1); border-radius: 8px; border: 1px solid rgba(0,212,255,0.3);">
                            <strong>解决方法：</strong>请在本地浏览器中直接打开此HTML文件，或使用支持WebGL的现代浏览器（Chrome、Firefox、Edge等）访问。
                        </p>
                    </div>
                `;
                return false;
            }
            
            // 场景
            scene = new THREE.Scene();
            var isDark = document.body.classList.contains('dark-theme');
            scene.background = new THREE.Color(isDark ? 0x0a0a1a : 0xe8f0ff);
            scene.fog = new THREE.FogExp2(isDark ? 0x0a0a1a : 0xe8f0ff, isDark ? 0.03 : 0.02);
            
            // 相机
            camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            camera.position.set(8, 5, 10);
            
            // 渲染器
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
            renderer.outputEncoding = THREE.sRGBEncoding;
            container.appendChild(renderer.domElement);
            
            // 控制器
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 2;
            controls.maxDistance = 20;
            
            // 灯光
            const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -10;
            directionalLight.shadow.camera.right = 10;
            directionalLight.shadow.camera.top = 10;
            directionalLight.shadow.camera.bottom = -10;
            directionalLight.shadow.bias = -0.0001;
            scene.add(directionalLight);
            
            const pointLight1 = new THREE.PointLight(0x00d4ff, 0.8, 30);
            pointLight1.position.set(-5, 5, 5);
            scene.add(pointLight1);
            
            const pointLight2 = new THREE.PointLight(0x7b2cbf, 0.8, 30);
            pointLight2.position.set(5, 5, -5);
            scene.add(pointLight2);

            const rimLight = new THREE.PointLight(0xff8844, 0.6, 25);
            rimLight.position.set(0, -3, 8);
            scene.add(rimLight);
            
            // 网格辅助
            const gridHelper = new THREE.GridHelper(20, 20, 0x1a3a5a, 0x0a1a2a);
            gridHelper.position.y = -2;
            scene.add(gridHelper);
            
            // 初始化所有场景
            initNewtonScene();
            initPoiseuilleScene();
            initStokesScene();
            
            // 显示初始场景（优先使用外部传入的目标实验场景，避免首帧显示默认牛顿场景）
            showScene(targetScene || 'newton');
            
            // 窗口大小调整
            window.addEventListener('resize', onWindowResize);
            
            // 隐藏加载动画（如果存在）
            setTimeout(() => {
                var loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.classList.add('hidden');
            }, 500);
        }
        
        function onWindowResize() {
            const container = document.getElementById('canvas-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
        
        
        // 牛顿粘性定律场景
        
        function initNewtonScene() {
            const group = new THREE.Group();
            group.name = 'newton-scene';
            
            // 创建底板（固定）
            const bottomPlateGeo = new THREE.BoxGeometry(6, 0.2, 4);
            const bottomPlateMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a3a5a,
                transparent: true,
                opacity: 0.9,
                metalness: 0.4,
                roughness: 0.2,
                clearcoat: 0.5,
                clearcoatRoughness: 0.1
            });
            const bottomPlate = new THREE.Mesh(bottomPlateGeo, bottomPlateMat);
            bottomPlate.position.y = -0.5;
            bottomPlate.receiveShadow = true;
            bottomPlate.castShadow = true;
            group.add(bottomPlate);
            
            // 创建顶板（可移动）
            const topPlateGeo = new THREE.BoxGeometry(6, 0.2, 4);
            const topPlateMat = new THREE.MeshPhysicalMaterial({
                color: 0x2a5a8a,
                metalness: 0.4,
                roughness: 0.2,
                clearcoat: 0.5,
                clearcoatRoughness: 0.1,
                side: THREE.DoubleSide
            });
            const topPlate = new THREE.Mesh(topPlateGeo, topPlateMat);
            topPlate.position.y = 0.5;
            topPlate.castShadow = true;
            topPlate.name = 'topPlate';
            group.add(topPlate);
            
            // 创建流体层
            const fluidLayers = [];
            const numLayers = 12;
            const layerHeight = 0.1;
            
            for (let i = 0; i < numLayers; i++) {
                const y = -0.39 + i * layerHeight;  // 从底板上方开始，避免重叠
                const velocity = (i / (numLayers - 1)) * physics.newton.velocity;
                
                // 颜色渐变：深蓝(低速区) -> 青色(过渡) -> 红色(高速区)
                // 低速区(0-40%): 蓝色系, 高速区(60-100%): 红色系
                let hue, saturation, lightness;
                if (i < numLayers * 0.4) {
                    // 低速区：深蓝到青蓝
                    hue = 0.55 + (i / (numLayers * 0.4)) * 0.1; // 0.55-0.65
                    saturation = 0.9;
                    lightness = 0.4 + (i / (numLayers * 0.4)) * 0.15;
                } else if (i > numLayers * 0.6) {
                    // 高速区：橙红到深红
                    const ratio = (i - numLayers * 0.6) / (numLayers * 0.4);
                    hue = 0.08 - ratio * 0.05; // 0.08-0.03 (橙红到红)
                    saturation = 0.95;
                    lightness = 0.5 + ratio * 0.1;
                } else {
                    // 过渡区：青绿到黄橙
                    const ratio = (i - numLayers * 0.4) / (numLayers * 0.2);
                    hue = 0.65 - ratio * 0.57; // 0.65->0.08
                    saturation = 0.85;
                    lightness = 0.55;
                }
                const color = new THREE.Color().setHSL(hue, saturation, lightness);
                
                const layerGeo = new THREE.BoxGeometry(5.5, layerHeight * 0.98, 3.5);  // 略微缩小避免重叠
                const layerMat = new THREE.MeshPhysicalMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.6,
                    metalness: 0.1,
                    roughness: 0.2,
                    transmission: 0.4,
                    thickness: 0.5,
                    ior: 1.33,
                    side: THREE.DoubleSide
                });
                
                const layer = new THREE.Mesh(layerGeo, layerMat);
                layer.position.y = y;
                layer.userData = { index: i, baseY: y, velocity: velocity };
                layer.castShadow = true;
                fluidLayers.push(layer);
                group.add(layer);
            }
            
            // 创建速度梯度箭头（表示各层位置处的速度梯度大小）
            const arrows = [];
            for (let i = 0; i < numLayers; i++) {
                const y = -0.4 + i * layerHeight + layerHeight / 2;
                // 箭头长度随层高增加，用于表现速度差的视觉累积；不表示物理速度梯度随高度改变。
                const baseGradient = physics.newton.velocity / physics.newton.gap;
                // 使用tanh软饱和：梯度越大整体箭头越长，但始终保持从短到长的渐变比例
                const ratio = i / (numLayers - 1);
                const maxLen = Math.tanh(baseGradient * 0.4) * 1.8;
                const minLen = 0.15; // 最小基准长度，确保底层箭头可见
                const arrowLength = maxLen <= minLen ? maxLen : minLen + ratio * (maxLen - minLen);
                
                const dir = new THREE.Vector3(1, 0, 0);
                const origin = new THREE.Vector3(-2.5, y, 2.1);
                const arrow = new THREE.ArrowHelper(dir, origin, arrowLength, 0x00ff88, 0.15, 0.1);
                arrow.userData = { index: i, gradient: baseGradient };
                arrows.push(arrow);
                group.add(arrow);
            }
            
            // 创建内摩擦力指示器（螺旋弹簧）
            const frictionIndicators = [];
            for (let i = 1; i < numLayers; i++) {
                const baseY = -0.4 + (i - 0.5) * layerHeight;

                // 螺旋形弹簧
                const spiralPoints = [];
                const turns = 4;
                const heightSpan = 0.12;
                const coilRadius = 0.06;
                const steps = 50;
                for (let j = 0; j <= steps; j++) {
                    const t = j / steps;
                    const angle = t * Math.PI * 2 * turns;
                    spiralPoints.push(new THREE.Vector3(
                        Math.cos(angle) * coilRadius,
                        baseY + t * heightSpan - heightSpan / 2,
                        Math.sin(angle) * coilRadius
                    ));
                }
                const curve = new THREE.CatmullRomCurve3(spiralPoints);

                const springGeo = new THREE.TubeGeometry(curve, 64, 0.025, 12, false);
                const springMat = new THREE.MeshPhysicalMaterial({
                    color: 0xff6600,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xff6600,
                    emissiveIntensity: 0.2
                });
                const spring = new THREE.Mesh(springGeo, springMat);
                spring.position.set(2.5, 0, 1.5);
                spring.userData = { index: i };
                frictionIndicators.push(spring);
                group.add(spring);
            }
            
            // 流动粒子 - 初始创建，后续会动态调整
            const flowParticles = [];
            const particleGeo = new THREE.SphereGeometry(0.04, 12, 12);
            // 初始粒子数量，会根据板间距动态调整
            const baseParticleCount = 120;
            for (let i = 0; i < baseParticleCount; i++) {
                const hue = Math.random() * 0.15 + 0.08;
                const particleColor = new THREE.Color().setHSL(hue, 0.9, 0.6);
                const particleMat = new THREE.MeshPhysicalMaterial({
                    color: particleColor,
                    metalness: 0.3,
                    roughness: 0.4,
                    emissive: new THREE.Color().setHSL(hue, 0.8, 0.15),
                    emissiveIntensity: 0.3
                });
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.set(
                    (Math.random() - 0.5) * 5 * Math.sqrt(physics.newton.area),
                    0, // Y坐标会在updateNewtonScene中动态设置
                    (Math.random() - 0.5) * 3 * Math.sqrt(physics.newton.area)
                );
                particle.userData = {
                    baseX: particle.position.x,
                    speed: Math.random() * 0.02 + 0.01,
                    layerRatio: Math.random(), // 使用比例而非固定层索引
                    active: true,
                    phase: Math.random() * Math.PI * 2
                };
                particle.visible = false;
                
                // 蝌蚪尾巴：每个粒子一条Line
                const tailMaxPts = 15;
                const tailPosArr = new Float32Array(tailMaxPts * 3);
                const tailColArr = new Float32Array(tailMaxPts * 3);
                const tailGeo = new THREE.BufferGeometry();
                tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPosArr, 3));
                tailGeo.setAttribute('color', new THREE.BufferAttribute(tailColArr, 3));
                const tailMat = new THREE.LineBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.9,
                    depthWrite: false,
                    blending: THREE.NormalBlending
                });
                const tailLine = new THREE.Line(tailGeo, tailMat);
                tailLine.frustumCulled = false;
                tailLine.visible = false;
                group.add(tailLine);
                particle.userData.tailLine = tailLine;
                particle.userData.tailGeo = tailGeo;
                particle.userData.trailPositions = [];
                
                flowParticles.push(particle);
                group.add(particle);
            }
            // 标签
            addLabel(group, '底板（固定）', new THREE.Vector3(0, -0.8, 2.2), 0x88aacc);
            addLabel(group, '顶板（可动）', new THREE.Vector3(0, 0.8, 2.2), 0x88aacc);
            addLabel(group, 'v', new THREE.Vector3(-2.5, 0.8, 2.1), 0x00ff88);
            
            sceneObjects.newton = {
                group: group,
                topPlate: topPlate,
                fluidLayers: fluidLayers,
                arrows: arrows,
                frictionIndicators: frictionIndicators,
                flowParticles: flowParticles
            };
            
            scene.add(group);
            group.visible = false;
        }
        
        function updateNewtonScene() {
            if (!sceneObjects.newton) return;
            
            const { topPlate, fluidLayers, arrows, frictionIndicators, flowParticles } = sceneObjects.newton;
            const { velocity, gap, viscosity, area } = physics.newton;
            
            // 更新顶板位置和面积（面积通过XZ缩放实现）
            topPlate.position.y = -0.5 + gap;
            const areaScale = Math.sqrt(area); // 面积比 → 线性缩放比
            topPlate.scale.x = areaScale;
            topPlate.scale.z = areaScale;
            
            // 更新流体层
            const numLayers = fluidLayers.length;
            const layerHeight = gap / numLayers;
            
            fluidLayers.forEach((layer, i) => {
                const y = -0.39 + i * layerHeight;  // 从底板上方开始
                layer.position.y = y;
                layer.scale.y = layerHeight / 0.1 * 0.98;  // 略微缩小避免重叠
                layer.scale.x = areaScale; // 与顶板面积同步
                layer.scale.z = areaScale;
                
                // 更新颜色 - 低速区(蓝色) / 高速区(红色) 明显区分
                let hue, saturation, lightness;
                if (i < numLayers * 0.4) {
                    // 低速区：深蓝到青蓝
                    hue = 0.55 + (i / (numLayers * 0.4)) * 0.1;
                    saturation = 0.9;
                    lightness = 0.4 + (i / (numLayers * 0.4)) * 0.15;
                } else if (i > numLayers * 0.6) {
                    // 高速区：橙红到深红
                    const ratio = (i - numLayers * 0.6) / (numLayers * 0.4);
                    hue = 0.08 - ratio * 0.05;
                    saturation = 0.95;
                    lightness = 0.5 + ratio * 0.1;
                } else {
                    // 过渡区：青绿到黄橙
                    const ratio = (i - numLayers * 0.4) / (numLayers * 0.2);
                    hue = 0.65 - ratio * 0.57;
                    saturation = 0.85;
                    lightness = 0.55;
                }
                layer.material.color.setHSL(hue, saturation, lightness);
            });
            
            // 更新速度梯度箭头
            arrows.forEach((arrow, i) => {
                const y = -0.4 + i * layerHeight + layerHeight / 2;
                // 箭头长度随层高增加，用于表现速度差的视觉累积；不表示物理速度梯度随高度改变。
                const baseGradient = velocity / gap;
                // 使用tanh软饱和：梯度越大整体箭头越长，但始终保持从短到长的渐变比例
                const ratio = i / (numLayers - 1);
                const maxLen = Math.tanh(baseGradient * 0.4) * 1.8;
                const minLen = 0.15; // 最小基准长度，确保底层箭头可见
                const arrowLength = maxLen <= minLen ? maxLen : minLen + ratio * (maxLen - minLen);
                arrow.position.y = y;
                arrow.setLength(Math.max(0.1, arrowLength), 0.15, 0.1);
                arrow.userData.gradient = baseGradient;
            });
            
            // 更新内摩擦力指示器
            frictionIndicators.forEach((indicator, i) => {
                const y = -0.4 + (i - 0.5) * layerHeight;
                indicator.position.y = y + 1.5;
                
                // 根据粘度调整大小
                const scale = 0.5 + viscosity * 0.1;
                indicator.scale.set(scale, scale, scale);
            });
            
            // 动态更新流动粒子的位置分布，约束在液体区域内
            const bottomY = -0.4;
            const topY = -0.4 + gap;
            const particleHalfX = 2.5 * areaScale;
            const particleHalfZ = 1.5 * areaScale;
            flowParticles.forEach(particle => {
                // 根据layerRatio计算新的Y坐标，使其分布在整个板间距空间
                particle.position.y = bottomY + particle.userData.layerRatio * gap;
                // 约束XZ坐标在液体范围内
                if (Math.abs(particle.position.x) > particleHalfX) {
                    particle.position.x = (Math.random() - 0.5) * 2 * particleHalfX;
                }
                if (Math.abs(particle.position.z) > particleHalfZ) {
                    particle.position.z = (Math.random() - 0.5) * 2 * particleHalfZ;
                }
            });
            
            // 更新显示数据
            const gradient = velocity / gap;
            const stress = viscosity * gradient;
            const force = stress * area; // F = τ × A
            
            document.getElementById('newton-gradient').textContent = gradient.toFixed(2);
            document.getElementById('newton-stress').textContent = stress.toFixed(2);
            document.getElementById('newton-force').textContent = force.toFixed(2);
        }
        
        
        // 泊肃叶定律场景
        
        function initPoiseuilleScene() {
            const group = new THREE.Group();
            group.name = 'poiseuille-scene';
            
            // 创建透明管道 - 横向放置
            // 视觉半径：最小值0.5mm对应R_visual=0.06，最大值5mm对应0.24
            const R_visual = 0.06 + (physics.poiseuille.radius - 0.5) * (0.18 / 4.5);
            // 视觉管道长度随参数变化：L=0.1m->0.5, L=1m->2.0, L=2m->4.0
            const L_param = physics.poiseuille.length;
            const pipeLength = 0.5 + (L_param - 0.1) * (3.5 / 1.9); // 0.5~4.0 线性映射
            
            // 外管道（透明玻璃效果）- 横向放置，绕Z轴旋转90度
            const outerPipeGeo = new THREE.CylinderGeometry(R_visual * 1.15, R_visual * 1.15, pipeLength, 64, 1, true);
            const outerPipeMat = new THREE.MeshPhysicalMaterial({
                color: 0xcceeff,
                transparent: true,
                opacity: 0.15,
                metalness: 0.1,
                roughness: 0.05,
                transmission: 0.8,
                thickness: 0.2,
                ior: 1.5,
                side: THREE.DoubleSide
            });
            const outerPipe = new THREE.Mesh(outerPipeGeo, outerPipeMat);
            outerPipe.rotation.z = Math.PI / 2; // 横向放置
            outerPipe.userData.lastLength = pipeLength; // 初始化管道长度记录
            group.add(outerPipe);

            // 入口（高压）标识 - 左端
            const inletGeo = new THREE.CylinderGeometry(R_visual * 0.5, R_visual * 0.5, 0.15, 32);
            const inletMat = new THREE.MeshPhysicalMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.3 });
            const inlet = new THREE.Mesh(inletGeo, inletMat);
            inlet.rotation.z = Math.PI / 2;
            inlet.position.x = -pipeLength / 2 - 0.1;
            group.add(inlet);
            
            // 出口（低压）标识 - 右端
            const outletGeo = new THREE.CylinderGeometry(R_visual * 0.5, R_visual * 0.5, 0.15, 32);
            const outletMat = new THREE.MeshPhysicalMaterial({ color: 0x3333ff, emissive: 0x0000ff, emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.3 });
            const outlet = new THREE.Mesh(outletGeo, outletMat);
            outlet.rotation.z = Math.PI / 2;
            outlet.position.x = pipeLength / 2 + 0.1;
            group.add(outlet);
            
            // 标签 - 存储引用以便动态更新
            const inletLabel = addLabel(group, '高压入口', new THREE.Vector3(-pipeLength / 2 - 0.6, R_visual + 0.3, 0), 0xff4444);
            const outletLabel = addLabel(group, '低压出口', new THREE.Vector3(pipeLength / 2 + 0.6, R_visual + 0.3, 0), 0x4444ff);
            
            // 创建抛物线速度分布的流体层 - 横向放置
            const fluidLayers = [];
            const numLayers = 15;
            
            for (let i = 0; i < numLayers; i++) {
                const r = R_visual * (1 - i / numLayers) * 0.95;
                
                // 颜色：蓝紫(边缘) -> 青色(中心)
                const hue = 0.8 - (i / numLayers) * 0.2;
                const color = new THREE.Color().setHSL(hue, 0.9, 0.5);
                
                const layerGeo = new THREE.CylinderGeometry(r, r, pipeLength * 0.95, 48, 1, true);
                const layerMat = new THREE.MeshPhysicalMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.5 - i * 0.02,
                    metalness: 0.1,
                    roughness: 0.3,
                    side: THREE.DoubleSide
                });
                
                const layer = new THREE.Mesh(layerGeo, layerMat);
                layer.rotation.z = Math.PI / 2; // 横向放置
                layer.userData = { radius: r };
                fluidLayers.push(layer);
                group.add(layer);
            }
            
            // 从高压入口生成流体粒子，并设置性能安全上限。
            // 横向管道：X轴为流动方向，Y-Z平面为管道截面
            const particles = [];
            const particleGeo = new THREE.SphereGeometry(0.006, 8, 8);
            const maxParticles = 1500; // 性能安全上限，防止内存溢出
            
            // 初始填充管道的粒子 - 根据径向位置(速度)和雷诺数状态着色
            // 计算初始雷诺数
            const R_init = physics.poiseuille.radius / 1000;
            const L_init = physics.poiseuille.length;
            const dP_init = physics.poiseuille.pressure;
            const eta_init = physics.poiseuille.viscosity / 1000;
            const vMax_init = (dP_init * Math.pow(R_init, 2)) / (4 * eta_init * L_init);
            const vAvg_init = vMax_init / 2;
            const Re_init = (1000 * vAvg_init * 2 * R_init) / eta_init;
            
            const initParticleCount = 800;
            for (let i = 0; i < initParticleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const rRatio = Math.sqrt(Math.random());
                const r = rRatio * R_visual * 0.95;
                const x = (Math.random() - 0.5) * pipeLength * 0.98;
                const y = r * Math.cos(angle);
                const z = r * Math.sin(angle);
                
                // 速度归一化：rRatio=0(中心) → speedNorm=1(最快), rRatio=1(管壁) → speedNorm=0(最慢)
                const speedNorm = 1 - rRatio * rRatio;
                // 根据雷诺数状态选择着色方案
                const particleMat = getParticleMaterialByReynolds(speedNorm, Re_init);
                
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.set(x, y, z);
                particle.userData = { 
                    angle: angle, 
                    r: r,
                    rRatio: rRatio,
                    speed: Math.pow(1 - Math.pow(rRatio, 2), 1),
                    baseR: r,
                    phase: Math.random() * Math.PI * 2
                };
                particles.push(particle);
                group.add(particle);
            }
            
            // 流阻网格已移除
            
            sceneObjects.poiseuille = {
                group: group,
                outerPipe: outerPipe,
                inlet: inlet,
                outlet: outlet,
                fluidLayers: fluidLayers,
                particles: particles,
                inletLabel: inletLabel,
                outletLabel: outletLabel,
                particleGeo: particleGeo,
                maxParticles: maxParticles
            };
            
            scene.add(group);
            group.visible = false;
        }
        
        function updatePoiseuilleScene() {
            if (!sceneObjects.poiseuille) return;
            
            const { outerPipe, inlet, outlet, fluidLayers, particles, inletLabel, outletLabel, particleGeo, group, maxParticles } = sceneObjects.poiseuille;
            const { radius, pressure, viscosity, length } = physics.poiseuille;

            // 视觉半径：最小值0.5mm对应R_visual=0.06，最大值5mm对应0.24
            const R_visual = 0.06 + (radius - 0.5) * (0.18 / 4.5);
            // 视觉管道长度随参数变化：L=0.1m->0.5, L=1m->2.0, L=2m->4.0
            const L_visual = 0.5 + (length - 0.1) * (3.5 / 1.9); // 0.5~4.0 线性映射
            const L = length;        // 物理计算使用真实长度（单位：m）
            const R = radius / 1000; // 物理计算使用真实半径（单位：m）
            const dP = pressure;
            const eta = viscosity / 1000;  // mPa·s 转 Pa·s

            // 获取之前的管道长度（用于判断是伸长还是缩短）
            // 使用 userData 存储上一次的管道长度，因为 geometry.parameters 可能不可用
            let prevL = outerPipe.userData.lastLength;
            if (!prevL || prevL <= 0) {
                prevL = L_visual; // 如果没有记录，使用当前值
            }

            // 计算流量和流速（使用真实物理参数）
            const Q = (Math.PI * Math.pow(R, 4) * dP) / (8 * eta * L);
            const vMax = (dP * Math.pow(R, 2)) / (4 * eta * L);
            const vAvg = Q / (Math.PI * R * R);

            // 更新管道几何 - 横向放置（使用固定视觉长度和动态视觉半径）
            outerPipe.geometry.dispose();
            outerPipe.geometry = new THREE.CylinderGeometry(R_visual * 1.15, R_visual * 1.15, L_visual, 64, 1, true);
            outerPipe.rotation.z = Math.PI / 2;

            // 更新流体层 - 横向放置
            fluidLayers.forEach((layer, i) => {
                const r = R_visual * (1 - i / fluidLayers.length) * 0.95;
                layer.geometry.dispose();
                layer.geometry = new THREE.CylinderGeometry(r, r, L_visual * 0.95, 48, 1, true);
                layer.rotation.z = Math.PI / 2;
                layer.userData = { radius: r };
            });

            // 根据管道长度变化调整粒子数量（只在长度真正变化时执行）
            // 通过比较 prevL（滑块事件保存的旧长度）和 L_visual（当前计算的新长度）
            const lengthChanged = Math.abs(L_visual - prevL) > 0.01;
            
            if (lengthChanged) {
                // 计算现有粒子密度（粒子数/当前管道长度），如果为空则使用默认密度
                const defaultDensity = 150; // 默认每单位长度150个粒子
                const currentDensity = particles.length > 0 ? particles.length / prevL : defaultDensity;
                const targetCount = Math.floor(currentDensity * L_visual);
                
                if (L_visual > prevL) {
                    // 管道变长：按现有密度填充新增的部分
                    const addedLength = L_visual - prevL;
                    const particlesToAdd = Math.max(1, Math.floor(currentDensity * addedLength));
                    const Re = parseFloat(document.getElementById('poiseuille-reynolds').textContent) || 100;
                    
                    for (let i = 0; i < particlesToAdd && particles.length < maxParticles; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const rRatio = Math.sqrt(Math.random());
                        const r = rRatio * R_visual * 0.95;
                        const y = r * Math.cos(angle);
                        const z = r * Math.sin(angle);
                        
                        // 只在新增的区域分布（原管道范围之外）
                        const side = Math.random() > 0.5 ? 1 : -1;
                        const start = prevL / 2;
                        const end = L_visual / 2;
                        const x = side * (start + Math.random() * (end - start)) * 0.98;
                        
                        const speedNorm = 1 - rRatio * rRatio;
                        const newMat = getParticleMaterialByReynolds(speedNorm, Re);
                        
                        const newParticle = new THREE.Mesh(particleGeo, newMat);
                        newParticle.position.set(x, y, z);
                        newParticle.userData = { 
                            angle: angle, r: r, rRatio: rRatio,
                            speed: Math.pow(1 - Math.pow(rRatio, 2), 1),
                            baseR: r, phase: Math.random() * Math.PI * 2
                        };
                        particles.push(newParticle);
                        group.add(newParticle);
                    }
                } else if (L_visual < prevL) {
                    // 管道变短：将超出范围的粒子重新映射到新管道内，而非直接销毁
                    const newHalf = L_visual / 2 * 0.98;
                    
                    particles.forEach(particle => {
                        if (Math.abs(particle.position.x) > newHalf) {
                            // 将超出范围的粒子映射回新管道内的随机位置
                            particle.position.x = (Math.random() - 0.5) * L_visual * 0.96;
                        }
                    });
                    
                    // 如果粒子数仍超过目标数量，随机移除多余粒子
                    while (particles.length > targetCount && particles.length > 0) {
                        const idx = Math.floor(Math.random() * particles.length);
                        const particle = particles[idx];
                        group.remove(particle);
                        particles.splice(idx, 1);
                    }
                }
            }

            // 更新现有粒子 - 保持相对径向位置，重新计算速度
            for (let pi = particles.length - 1; pi >= 0; pi--) {
                const particle = particles[pi];
                
                // 获取粒子当前径向位置
                const py = particle.position.y;
                const pz = particle.position.z;
                const distFromAxis = Math.sqrt(py * py + pz * pz);
                
                // 保持粒子的相对径向位置（rRatio）不变
                // 但将其缩放到新管道的对应位置
                // 新位置 = 原rRatio × 新管道半径
                let newDistFromAxis = particle.userData.rRatio * R_visual * 0.95;
                
                // 如果超出新管道范围，限制在范围内
                if (newDistFromAxis > R_visual * 0.95) {
                    newDistFromAxis = R_visual * 0.95;
                }
                
                // 更新粒子位置（保持角度不变）
                const angle = Math.atan2(pz, py);
                particle.position.y = newDistFromAxis * Math.cos(angle);
                particle.position.z = newDistFromAxis * Math.sin(angle);
                
                // 更新 r 和 rRatio
                particle.userData.r = newDistFromAxis;
                particle.userData.rRatio = newDistFromAxis / (R_visual * 0.95);
                
                // 根据新的流态立即重新计算速度因子
                particle.userData.speed = Math.pow(1 - Math.pow(particle.userData.rRatio, 2), 1);
            }

            // 动态更新入口/出口标识位置 - 横向放置
            inlet.position.x = -L_visual / 2 - 0.1;
            inlet.geometry.dispose();
            inlet.geometry = new THREE.CylinderGeometry(R_visual * 0.5, R_visual * 0.5, 0.15, 32);
            inlet.rotation.z = Math.PI / 2;

            outlet.position.x = L_visual / 2 + 0.1;
            outlet.geometry.dispose();
            outlet.geometry = new THREE.CylinderGeometry(R_visual * 0.5, R_visual * 0.5, 0.15, 32);
            outlet.rotation.z = Math.PI / 2;

            // 动态更新标签位置，始终保持在管道外部
            inletLabel.position.set(-L_visual / 2 - 0.6, R_visual + 0.3, 0);
            outletLabel.position.set(L_visual / 2 + 0.6, R_visual + 0.3, 0);
            
            // 注意：userData.lastLength 只在滑块事件中更新，避免竞争条件
            
            // 计算雷诺数
            const rho = 1000;
            const Re = (rho * vAvg * 2 * R) / eta;
            
            // 更新显示
            document.getElementById('poiseuille-flow').textContent = (Q * 1e6).toFixed(3);
            document.getElementById('poiseuille-vmax').textContent = (vMax * 100).toFixed(2);
            document.getElementById('poiseuille-vavg').textContent = (vAvg * 100).toFixed(2);
            document.getElementById('poiseuille-reynolds').textContent = Re.toFixed(0);
            
            // 更新雷诺数指示器
            const reynoldsPercent = Math.min(Re / 4000, 1) * 100;
            document.getElementById('reynolds-indicator').style.left = `${reynoldsPercent}%`;
            
            const statusEl = document.getElementById('flow-status');
            if (Re < 2000) {
                statusEl.textContent = '层流状态';
                statusEl.className = 'status-indicator status-laminar';
                statusEl.style.animation = 'none';
            } else if (Re < 4000) {
                statusEl.textContent = '过渡状态';
                statusEl.className = 'status-indicator status-turbulent';
                statusEl.style.background = 'rgba(255, 255, 0, 0.2)';
                statusEl.style.color = '#ffff00';
                statusEl.style.animation = 'none';
            } else {
                statusEl.textContent = '湍流警告';
                statusEl.className = 'status-indicator status-turbulent';
                statusEl.style.animation = 'none';
            }
            
            // 雷诺数 >= 2000 时显示明显警告
            let warningEl = document.getElementById('reynolds-warning');
            if (Re >= 2000) {
                if (!warningEl) {
                    warningEl = document.createElement('div');
                    warningEl.id = 'reynolds-warning';
                    warningEl.style.cssText = 'margin-top:10px;padding:10px;background:rgba(255,0,0,0.3);border:2px solid #ff0000;border-radius:6px;color:#ff4444;font-weight:bold;text-align:center;animation:warningPulse 1s infinite;';
                    warningEl.innerHTML = ' 警告：雷诺数 ≥ 2000，流动可能进入湍流状态，泊肃叶公式不再适用！';
                    statusEl.parentNode.appendChild(warningEl);
                }
            } else if (warningEl) {
                warningEl.remove();
            }
        }
        
        
        // 斯托克斯定律场景
        
        function initStokesScene() {
            const group = new THREE.Group();
            group.name = 'stokes-scene';
            
            // 场景A：重力沉降
            const gravityGroup = new THREE.Group();
            gravityGroup.name = 'gravity-scene';
            
            // 量筒
            const cylinderGeo = new THREE.CylinderGeometry(1.0, 1.0, 9, 32, 1, true);
            const cylinderMat = new THREE.MeshPhysicalMaterial({
                color: 0xaaddff,
                transparent: true,
                opacity: 0.15,
                metalness: 0.1,
                roughness: 0.1,
                transmission: 0.8,
                ior: 1.5,
                side: THREE.DoubleSide
            });
            const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
            cylinder.position.y = 0;
            gravityGroup.add(cylinder);
            
            // 流体
            const fluidGeo = new THREE.CylinderGeometry(0.96, 0.96, 8.5, 32);
            const fluidMat = new THREE.MeshPhysicalMaterial({
                color: 0x4488cc,
                transparent: true,
                opacity: 0.3,
                metalness: 0.1,
                roughness: 0.3,
                transmission: 0.5,
                ior: 1.33
            });
            const fluid = new THREE.Mesh(fluidGeo, fluidMat);
            fluid.position.y = -0.25;
            gravityGroup.add(fluid);
            
            // 小球
            const ballRadius = physics.stokes.radius / 1000; // mm -> m
            const ballGeo = new THREE.SphereGeometry(ballRadius * 80, 32, 32); // 放大80倍显示
            const ballMat = new THREE.MeshPhysicalMaterial({
                color: 0x00aaff,  // 初始蓝色（静止）
                metalness: 0.7,
                roughness: 0.2,
                clearcoat: 0.8,
                emissive: 0x0044aa,
                emissiveIntensity: 0.3,
                side: THREE.DoubleSide  // 确保球体完整渲染
            });
            const ball = new THREE.Mesh(ballGeo, ballMat);
            ball.position.y = 4.0;
            ball.castShadow = true;
            ball.receiveShadow = true;
            ball.userData = { isBall: true };  // 标记为小球
            ball.name = 'ball';
            gravityGroup.add(ball);
            
            // 匀速指示环（初始隐藏）- 使用发光材质增强可见性
            const ringGeo = new THREE.RingGeometry(1.1, 1.2, 64);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                transparent: true, 
                opacity: 0,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.name = 'steadyRing';
            ring.visible = false;
            ring.renderOrder = 999; // 确保在最上层渲染
            ball.add(ring);  // 作为子对象跟随小球
            
            // 添加发光外环
            const glowGeo = new THREE.RingGeometry(1.25, 1.35, 64);
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                transparent: true, 
                opacity: 0,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            });
            const glowRing = new THREE.Mesh(glowGeo, glowMat);
            glowRing.name = 'steadyGlow';
            glowRing.visible = false;
            glowRing.renderOrder = 998;
            ball.add(glowRing);
            
            // 力矢量箭头 - 使用更明显的颜色区分
            const gravityArrow = createForceArrow(0xff0000, 'gravity');    // 纯红色
            const buoyancyArrow = createForceArrow(0x00ff00, 'buoyancy');  // 纯绿色
            const dragArrow = createForceArrow(0xffaa00, 'drag');          // 橙黄色
            
            gravityGroup.add(gravityArrow);
            gravityGroup.add(buoyancyArrow);
            gravityGroup.add(dragArrow);
            
            group.add(gravityGroup);
            
            // 场景B：离心分离
            const centrifugeGroup = new THREE.Group();
            centrifugeGroup.name = 'centrifuge-scene';
            centrifugeGroup.visible = false;
            
            // 离心管阵列
            const numTubes = 6;
            const tubes = [];
            
            for (let i = 0; i < numTubes; i++) {
                const angle = (i / numTubes) * Math.PI * 2;
                const tubeGroup = new THREE.Group();
                
                // 离心管
                const tubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16, 1, true);
                const tubeMat = new THREE.MeshPhysicalMaterial({
                    color: 0xaaddff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                const tube = new THREE.Mesh(tubeGeo, tubeMat);
                tubeGroup.add(tube);
                
                // 流体
                const tubeFluidGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.4, 16);
                const tubeFluidMat = new THREE.MeshPhysicalMaterial({
                    color: 0x4488cc,
                    transparent: true,
                    opacity: 0.5
                });
                const tubeFluid = new THREE.Mesh(tubeFluidGeo, tubeFluidMat);
                tubeFluid.position.y = -0.05;
                tubeGroup.add(tubeFluid);
                
                // 小颗粒
                const particles = [];
                for (let j = 0; j < 25; j++) {
                    const pGeo = new THREE.SphereGeometry(0.025, 10, 10);
                    const pMat = new THREE.MeshPhysicalMaterial({
                        color: 0xffaa00,
                        metalness: 0.3,
                        roughness: 0.4,
                        emissive: 0x331100,
                        emissiveIntensity: 0.3
                    });
                    const particle = new THREE.Mesh(pGeo, pMat);
                    particle.position.set(
                        (Math.random() - 0.5) * 0.2,
                        (Math.random() - 0.5) * 1.2,
                        (Math.random() - 0.5) * 0.2
                    );
                    particle.userData = { basePos: particle.position.clone(), phase: Math.random() * Math.PI * 2 };
                    particles.push(particle);
                    tubeGroup.add(particle);
                }
                
                tubeGroup.position.set(
                    Math.cos(angle) * 1.5,
                    0,
                    Math.sin(angle) * 1.5
                );
                tubeGroup.rotation.z = -Math.PI / 6;
                tubeGroup.userData = { angle: angle, particles: particles };
                
                tubes.push(tubeGroup);
                centrifugeGroup.add(tubeGroup);
            }
            
            // 中心轴
            const axisGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
            const axisMat = new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
            const axis = new THREE.Mesh(axisGeo, axisMat);
            centrifugeGroup.add(axis);
            
            group.add(centrifugeGroup);
            
            sceneObjects.stokes = {
                group: group,
                gravityGroup: gravityGroup,
                centrifugeGroup: centrifugeGroup,
                ball: ball,
                fluid: fluid,
                gravityArrow: gravityArrow,
                buoyancyArrow: buoyancyArrow,
                dragArrow: dragArrow,
                tubes: tubes
            };
            
            scene.add(group);
            group.visible = false;
        }
        
        function createForceArrow(color, name) {
            // 创建只有锥形头部的力指示器（无杆）
            const coneGeo = new THREE.ConeGeometry(0.06, 0.15, 12);
            const coneMat = new THREE.MeshPhysicalMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3
            });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.name = name;
            return cone;
        }
        
        function updateStokesScene() {
            if (!sceneObjects.stokes) return;
            
            const st = sceneObjects.stokes;
            const { radius, viscosity } = physics.stokes;
            
            const R = radius / 1000; // mm -> m
            const eta = viscosity;   // Pa·s（直接使用）
            const rho_s = 7800;      // kg/m³（钢球密度，固定）
            const rho_f = 1000;      // kg/m³（水密度，固定）
            const g = 9.8;           // m/s²（固定）
            
            // 计算力
            const volume = (4 / 3) * Math.PI * Math.pow(R, 3);
            const mass = rho_s * volume;
            const gravity = mass * g;
            const buoyancy = rho_f * volume * g;
            const netGravity = gravity - buoyancy; // 重力 - 浮力
            
            const physical=PhysicsEngine.stokes(R,rho_s,rho_f,eta,g);
            const vTerminal=physical.vt, Re=physical.Re;

            // 更新小球大小 - 放大50倍便于观察
            const ballVisualRadius = R * 80;
            const sizeChanged=st.ball.userData.v72Radius!==ballVisualRadius;
            if(sizeChanged) {
              st.ball.geometry.dispose();
              st.ball.geometry = new THREE.SphereGeometry(ballVisualRadius, 32, 32);
              st.ball.userData.v72Radius=ballVisualRadius;
            }
            
            // 更新匀速指示环大小
            const ring = st.ball.getObjectByName('steadyRing');
            const glowRing = st.ball.getObjectByName('steadyGlow');
            if (ring && sizeChanged) {
                ring.geometry.dispose();
                const ringInner = ballVisualRadius * 1.05;
                const ringOuter = ballVisualRadius * 1.15;
                ring.geometry = new THREE.RingGeometry(ringInner, ringOuter, 64);
            }
            if (glowRing && sizeChanged) {
                glowRing.geometry.dispose();
                const glowInner = ballVisualRadius * 1.18;
                const glowOuter = ballVisualRadius * 1.35;
                glowRing.geometry = new THREE.RingGeometry(glowInner, glowOuter, 64);
            }
            
            // 更新力指示器（只有锥形头部，放在球体侧面）
            // 规则：箭头到小球表面距离恒定（0.3），箭头大小固定不变
            const surfaceDistance = 0.15; // 到小球表面的固定距离
            const fixedArrowScale = 0.6; // 固定箭头大小
            
            // 计算粘滞阻力（用于显示，4区自动选择公式）
            const currentV = animationStates.stokes.ballVelocity;
            const dragForce=PhysicsEngine.stokesDrag(eta,R,currentV,rho_f);
            st.dragArrow.visible=Math.abs(dragForce)>1e-12;

            // 重力（纯红色）- 左上方，指向下
            st.gravityArrow.scale.set(fixedArrowScale, fixedArrowScale, fixedArrowScale);
            st.gravityArrow.position.set(
                st.ball.position.x - (ballVisualRadius + surfaceDistance),
                st.ball.position.y + (ballVisualRadius + surfaceDistance) * 0.8,
                st.ball.position.z
            );
            st.gravityArrow.rotation.set(0, 0, 0);
            st.gravityArrow.rotation.x = Math.PI;
            
            // 浮力（纯绿色）- 左下方，指向上
            st.buoyancyArrow.scale.set(fixedArrowScale, fixedArrowScale, fixedArrowScale);
            st.buoyancyArrow.position.set(
                st.ball.position.x - (ballVisualRadius + surfaceDistance),
                st.ball.position.y - (ballVisualRadius + surfaceDistance) * 0.8,
                st.ball.position.z
            );
            st.buoyancyArrow.rotation.set(0, 0, 0);
            
            // 粘滞阻力（橙黄色）- 右上方，指向上
            st.dragArrow.scale.set(fixedArrowScale, fixedArrowScale, fixedArrowScale);
            st.dragArrow.position.set(
                st.ball.position.x + (ballVisualRadius + surfaceDistance),
                st.ball.position.y + (ballVisualRadius + surfaceDistance) * 0.8,
                st.ball.position.z
            );
            st.dragArrow.rotation.set(0, 0, 0);
            
            // 流体颜色随粘度变化：低粘度(水)→蓝色，高粘度(甘油)→琥珀色
            const viscosityNorm = Math.min(1, Math.max(0, (Math.log10(eta) + 3) / 4)); // 0.001~10 Pa·s → 0~1
            const fluidR = 0x44 + (0xcc - 0x44) * viscosityNorm;
            const fluidG = 0x88 + (0x88 - 0x88) * viscosityNorm;
            const fluidB = 0xcc + (0x22 - 0xcc) * viscosityNorm;
            st.fluid.material.color.setRGB(fluidR / 255, fluidG / 255, fluidB / 255);
            st.fluid.material.opacity = 0.3 + viscosityNorm * 0.3;
            
            // 更新显示
            document.getElementById('stokes-gravity-val').textContent = (gravity * 1000).toFixed(3);
            document.getElementById('stokes-buoyancy').textContent = (buoyancy * 1000).toFixed(3);
            document.getElementById('stokes-drag').textContent = (dragForce * 1000).toFixed(3);
            document.getElementById('stokes-velocity').textContent = (currentV * 1000).toFixed(2);
            document.getElementById('stokes-terminal').textContent = (vTerminal * 1000).toFixed(2);
            // 雷诺数显示
            if (Re < 1) {
                document.getElementById('stokes-reynolds').textContent = Re.toFixed(4);
            } else {
                document.getElementById('stokes-reynolds').textContent = Re.toFixed(2);
            }
            
            // 雷诺数检测和警示
            const warningEl = document.getElementById('stokes-warning');
            if (warningEl) {
                if (Re >= .1 || physical.blended) {
                    warningEl.style.display = 'block';
                } else {
                    warningEl.style.display = 'none';
                }
            }
            
            // 粘滞力过大警示：当收尾速度极小（接近0）时提示
            const nomoveEl = document.getElementById('stokes-nomove-warning');
            if (nomoveEl) {
                if (vTerminal < 1e-6) {
                    nomoveEl.style.display = 'block';
                } else {
                    nomoveEl.style.display = 'none';
                }
            }
        }
        
        
        // 场景切换
        
        let isSwitching = false;
        
        function showScene(sceneName, force) {
            // 防止重复切换；force=true 供页面导航强制切换，绕过节流，确保目标场景必达
            if (isSwitching && !force) return;
            isSwitching = true;

            // 先注册节流复位定时器：即使下方切换逻辑抛异常，节流状态也必然解除，不会永久卡死
            setTimeout(() => {
                isSwitching = false;
            }, 300);

            try {
            // 停止所有场景的动画，确保干净切换
            Object.keys(animationStates).forEach(key => {
                animationStates[key].running = false;
            });
            updateControlButtons();
            
            // 隐藏所有场景
            Object.keys(sceneObjects).forEach(key => {
                if (sceneObjects[key] && sceneObjects[key].group) {
                    sceneObjects[key].group.visible = false;
                }
            });
            
            // 隐藏所有控制面板
            document.querySelectorAll('.scene-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // 显示选中场景
            if (sceneObjects[sceneName] && sceneObjects[sceneName].group) {
                sceneObjects[sceneName].group.visible = true;
            }
            const panelEl = document.getElementById(`panel-${sceneName}`);
            if (panelEl) {
                panelEl.classList.add('active');
            }
            
            // 更新标签按钮状态
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.scene === sceneName) {
                    btn.classList.add('active');
                }
            });
            
            currentScene = sceneName;
            
            // 重置相机位置
            resetCamera(sceneName);
            
            // 强制更新一次场景状态，确保显示正确
            if (sceneName === 'newton') {
                updateNewtonScene();
            } else if (sceneName === 'poiseuille') {
                updatePoiseuilleScene();
            } else if (sceneName === 'stokes') {
                updateStokesScene();
            }
            } catch (err) {
                // 切换失败时记录并保持状态一致，节流已提前注册复位，不会卡死
                console.error('[3D] 场景切换异常:', sceneName, err);
            }
        }
        
        function resetCamera(sceneName) {
            switch (sceneName) {
                case 'newton':
                    camera.position.set(8, 5, 10);
                    break;
                case 'poiseuille':
                    camera.position.set(4, 3, 5);
                    break;
                case 'stokes':
                    camera.position.set(6, 4, 8);
                    break;
            }
            controls.target.set(0, 0, 0);
            controls.update();
        }
        
        function updateControlButtons() {
            // 牛顿粘性定律
            const newtonStart = document.getElementById('newton-start');
            const newtonStop = document.getElementById('newton-stop');
            newtonStart.disabled = animationStates.newton.running;
            newtonStop.disabled = !animationStates.newton.running;
            
            // 泊肃叶定律
            const poiseuilleStart = document.getElementById('poiseuille-start');
            const poiseuilleStop = document.getElementById('poiseuille-stop');
            poiseuilleStart.disabled = animationStates.poiseuille.running;
            poiseuilleStop.disabled = !animationStates.poiseuille.running;
            
            // 斯托克斯定律
            const stokesStart = document.getElementById('stokes-start');
            const stokesStop = document.getElementById('stokes-stop');
            stokesStart.disabled = animationStates.stokes.running;
            stokesStop.disabled = !animationStates.stokes.running;
        }
        
        
        // 辅助函数
        
        function addLabel(group, text, position, color) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            context.fillStyle = 'transparent';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.font = 'bold 24px Microsoft YaHei';
            context.fillStyle = '#' + new THREE.Color(color).getHexString();
            context.textAlign = 'center';
            context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.copy(position);
            sprite.scale.set(1, 0.25, 1);
            
            group.add(sprite);
            return sprite;
        }
        
        
        // 动画循环
        
        let lastAnimationTs = null;
        function animate(ts) {
            const now=typeof ts==='number'?ts:performance.now();
            const frameDt=lastAnimationTs==null?0:Math.min(.05,Math.max(0,(now-lastAnimationTs)/1000));
            lastAnimationTs=now;
            const frameScale=frameDt*60;
            // 仅在3dSimPage可见时执行3D渲染；不可见时不排下一帧，避免空转
            var _3dSimPage = document.getElementById('3dSimPage');
            if (!_3dSimPage || !_3dSimPage.classList.contains('active')) {
                animationId = null;
                return;
            }
            animationId = requestAnimationFrame(animate);

            const time = performance.now() * 0.001;
            
            // 牛顿粘性定律动画
            if (currentScene === 'newton' && sceneObjects.newton && animationStates.newton.running) {
                const { fluidLayers, flowParticles, frictionIndicators, arrows } = sceneObjects.newton;
                const { velocity, gap, viscosity, area } = physics.newton;
                
                // 粘滞系数影响：高粘度时流动更困难，层间摩擦更明显
                const viscosityFactor = 1 / (1 + viscosity * 0.3); // 粘度越高，流动越慢
                const frictionIntensity = viscosity * 0.1; // 粘度越高，摩擦指示器越明显
                const areaScale = Math.sqrt(area);
                
                // 流体层剪切流动效果 - 受粘度影响
                fluidLayers.forEach((layer, i) => {
                    const layerVelocity = (i / (fluidLayers.length - 1)) * velocity * viscosityFactor;
                    const offset = Math.sin(time * 3 + i * 0.3) * 0.05 * layerVelocity;
                    layer.position.z = offset;
                    
                    // 高粘度时层颜色变暗，表示流动困难
                    // 保持低速区(蓝)和高速区(红)的区分
                    const numL = fluidLayers.length;
                    let hue, saturation, lightness;
                    if (i < numL * 0.4) {
                        // 低速区：深蓝到青蓝
                        hue = 0.55 + (i / (numL * 0.4)) * 0.1;
                        saturation = 0.9;
                        lightness = Math.max(0.3, 0.4 + (i / (numL * 0.4)) * 0.15 - viscosity * 0.03);
                    } else if (i > numL * 0.6) {
                        // 高速区：橙红到深红
                        const ratio = (i - numL * 0.6) / (numL * 0.4);
                        hue = 0.08 - ratio * 0.05;
                        saturation = 0.95;
                        lightness = Math.max(0.35, 0.5 + ratio * 0.1 - viscosity * 0.03);
                    } else {
                        // 过渡区：青绿到黄橙
                        const ratio = (i - numL * 0.4) / (numL * 0.2);
                        hue = 0.65 - ratio * 0.57;
                        saturation = 0.85;
                        lightness = Math.max(0.35, 0.55 - viscosity * 0.03);
                    }
                    layer.material.color.setHSL(hue, saturation, lightness);
                });
                
                // 速度梯度箭头随参数变化 - 呈现从短到长的渐变效果
                arrows.forEach((arrow, i) => {
                    const y = -0.4 + i * (gap / 12) + (gap / 12) / 2;
                    // 箭头长度随层高增加，用于表现速度差的视觉累积；不表示物理速度梯度随高度改变。
                    const baseGradient = velocity / gap;
                    // 使用tanh软饱和：梯度越大整体箭头越长，但始终保持从短到长的渐变比例
                    const ratio = i / 11;
                    const maxLen = Math.tanh(baseGradient * 0.4) * 1.8;
                    const minLen = 0.15; // 最小基准长度，确保底层箭头可见
                    const arrowLength = maxLen <= minLen ? maxLen : minLen + ratio * (maxLen - minLen);
                    arrow.position.y = y;
                    arrow.setLength(Math.max(0.05, arrowLength), 0.15, 0.1);
                    // 箭头保持绿色
                    arrow.setColor(new THREE.Color(0x00ff88));
                });
                
                // 内摩擦力指示器随粘度变化
                frictionIndicators.forEach((indicator, i) => {
                    const y = -0.4 + (i - 0.5) * (gap / 10);
                    indicator.position.y = y + 1.5;
                    // 粘度越高，弹簧越密集（缩放越小）；viscosity 范围 0.00005~2.0，归一化到 [0,1]
                    var viscNorm = Math.min(Math.max(viscosity / 2.0, 0), 1);
                    var scale = 1.0 - viscNorm * 0.5;  // 1.0 → 0.5
                    indicator.scale.set(Math.max(0.3, scale), Math.max(0.3, scale), Math.max(0.3, scale));
                    // 高粘度（≥1.5 Pa·s）时弹簧变红，否则保持橙红
                    var springHue = viscNorm > 0.75 ? 0.0 : 0.1;
                    indicator.material.color.setHSL(springHue, 1.0, 0.5);
                });
                
                // 流动粒子动画：速度按层高分布，黏度影响外观。
                const bottomY = -0.4;
                const halfX = 2.5 * areaScale; // 液体X方向半宽
                const halfZ = 1.5 * areaScale; // 液体Z方向半宽
                flowParticles.forEach(particle => {
                    particle.visible = true;
                    const layerRatio = particle.userData.layerRatio;
                    // 粒子速度不随粘度改变
                    const layerVelocity = layerRatio * velocity;
                    
                    // 水平流动
                    const flowSpeed = particle.userData.speed * layerVelocity * 0.5;
                    
                    // 【蝌蚪尾巴】记录位置
                    const trailPositions = particle.userData.trailPositions;
                    trailPositions.unshift({
                        x: particle.position.x,
                        y: particle.position.y,
                        z: particle.position.z
                    });
                    if (trailPositions.length > 15) trailPositions.pop();
                    
                    // 更新蝌蚪尾巴Line
                    const tailLine = particle.userData.tailLine;
                    const tailGeo = particle.userData.tailGeo;
                    const viscosityFactor = Math.max(0, (viscosity - 0.1) / (10 - 0.1));
                    const maxLen = Math.floor(5 + viscosityFactor * 10);  // 5-15个点，更长
                    const len = Math.min(trailPositions.length, maxLen);
                    
                    if (len >= 2) {
                        const posArr = tailGeo.attributes.position.array;
                        const colArr = tailGeo.attributes.color.array;
                        const pColor = particle.material.color;
                        
                        for (let i = 0; i < len; i++) {
                            const t = trailPositions[i];
                            posArr[i * 3] = t.x;
                            posArr[i * 3 + 1] = t.y;
                            posArr[i * 3 + 2] = t.z;
                            // 头部亮，尾部暗
                            const fade = Math.pow(1 - i / len, 0.8);  // 衰减更慢，更亮
                            colArr[i * 3] = pColor.r * fade;
                            colArr[i * 3 + 1] = pColor.g * fade;
                            colArr[i * 3 + 2] = pColor.b * fade;
                        }
                        tailGeo.attributes.position.needsUpdate = true;
                        tailGeo.attributes.color.needsUpdate = true;
                        tailGeo.setDrawRange(0, len);
                        tailLine.visible = true;
                    } else {
                        tailLine.visible = false;
                    }
                    
                    particle.position.x += flowSpeed * frameScale;
                    if (particle.position.x > halfX) {
                        particle.position.x = -halfX;
                        trailPositions.length = 0;
                        tailLine.visible = false;
                    }
                    
                    // 约束粒子Z坐标在液体范围内
                    if (Math.abs(particle.position.z) > halfZ) {
                        particle.position.z = (Math.random() - 0.5) * 2 * halfZ;
                    }
                    
                    // 粒子颜色随粘度变化：低粘度亮绿，高粘度暗红
                    const speedRatio = flowSpeed / (particle.userData.speed * velocity * 0.5);
                    const particleHue = viscosity > 5 ? 0.0 : 0.35 - viscosity * 0.05;
                    const particleLight = 0.3 + speedRatio * 0.4;
                    particle.material.color.setHSL(particleHue, 0.9, particleLight);
                    
                    // 高粘度时粒子有滞后感（运动不流畅）
                    const lagFactor = viscosity * 0.02;
                    const baseY = bottomY + layerRatio * gap;
                    particle.position.y = baseY + Math.sin(time * (5 - lagFactor) + particle.position.x) * 0.02;
                });
            } else if (currentScene === 'newton' && sceneObjects.newton && !animationStates.newton.running) {
                // 停止时隐藏粒子
                sceneObjects.newton.flowParticles.forEach(p => p.visible = false);
            }
            
            // 泊肃叶定律动画
            if (currentScene === 'poiseuille' && sceneObjects.poiseuille && animationStates.poiseuille.running) {
                const { particles, fluidLayers, particleGeo, maxParticles, group } = sceneObjects.poiseuille;
                const { radius, pressure, viscosity, length } = physics.poiseuille;

                // 视觉半径：最小值0.5mm对应R_visual=0.06，最大值5mm对应0.24
                const R_visual = 0.06 + (radius - 0.5) * (0.18 / 4.5);
                // 视觉管道长度随参数变化：L=0.1m->0.5, L=1m->2.0, L=2m->4.0
                const L_visual = 0.5 + (length - 0.1) * (3.5 / 1.9);
                const L = length;        // 物理计算使用真实长度（单位：m）
                const R = radius / 1000; // 物理计算使用真实半径（单位：m）
                const dP = pressure;
                const eta = viscosity / 1000;  // mPa·s 转 Pa·s
                const vMax = (dP * Math.pow(R, 2)) / (4 * eta * L);

                // 获取当前雷诺数
                const Re = parseFloat(document.getElementById('poiseuille-reynolds').textContent);

                // 从高压入口持续生成新粒子（每帧生成若干个）
                // 层流状态：均匀分布，让轴向速度梯度自然形成视觉效果
                const baseSpawnRate = Re < 2000 ? 3 : 2; // 层流时适当增加生成率
                if (particles.length < maxParticles) {
                    for (let s = 0; s < baseSpawnRate && particles.length < maxParticles; s++) {
                        const angle = Math.random() * Math.PI * 2;
                        // 均匀分布在管道截面上
                        const rRatio = Math.sqrt(Math.random());
                        const r = rRatio * R_visual * 0.95;
                        const y = r * Math.cos(angle);
                        const z = r * Math.sin(angle);

                        // 根据径向位置(速度)和雷诺数状态着色
                        const speedNorm = 1 - rRatio * rRatio;
                        const newMat = getParticleMaterialByReynolds(speedNorm, Re);

                        const newParticle = new THREE.Mesh(particleGeo, newMat);
                        newParticle.position.set(-L_visual / 2, y, z);
                        newParticle.userData = { 
                            angle: angle, 
                            r: r,
                            rRatio: rRatio,
                            speed: Math.pow(1 - Math.pow(rRatio, 2), 1),
                            baseR: r,
                            phase: Math.random() * Math.PI * 2
                        };
                        particles.push(newParticle);
                        group.add(newParticle);
                    }
                }
                
                // 粒子沿X轴横向流动 - 三种状态明显区分
                // 使用倒序遍历，方便安全删除到达出口的粒子
                for (let pi = particles.length - 1; pi >= 0; pi--) {
                    const particle = particles[pi];
                    const rRatio = particle.userData.rRatio; // 0=中心, 1=边缘
                    let speed;
                    
                    if (Re < 2000) {
                        // 层流：泊肃叶抛物线分布 v(r) = vMax × (1 - (r/R)²)
                        // 中心最快，管壁处为零，速度梯度大
                        const radialFactor = Math.pow(1 - rRatio * rRatio, 1);
                        speed = vMax * radialFactor * 3.0;
                        speed = Math.max(speed, 0.002);
                        
                    } else if (Re < 4000) {
                        // 过渡状态：抛物线分布逐渐平坦化，介于层流与湍流之间
                        // 混合因子：Re=2000时接近层流，Re=4000时接近湍流
                        const blendFactor = (Re - 2000) / 2000; // 0~1
                        // 层流因子：抛物线 (1 - r²)
                        const laminarProfile = Math.pow(1 - rRatio * rRatio, 1);
                        // 湍流因子：1/7幂律 (1 - r)^(1/7)
                        const turbulentProfile = Math.pow(Math.max(1 - rRatio, 0.001), 1.0 / 7.0);
                        // 混合两种分布
                        const profile = laminarProfile * (1 - blendFactor) + turbulentProfile * blendFactor;
                        speed = vMax * profile * 3.0;
                        
                        // 轻微径向扰动 - 横向管道，Y-Z平面
                        const angle = particle.userData.angle + time * 0.5;
                        const rVariation = Math.sin(time * 2 + particle.position.x * 3) * 0.003 * blendFactor;
                        particle.position.y += Math.cos(angle) * rVariation;
                        particle.position.z += Math.sin(angle) * rVariation;
                        
                    } else {
                        // 湍流：1/7幂律分布 v(r) = vMax × (1 - r/R)^(1/7)
                        // 速度趋于均匀，中心与边缘差异小，但有剧烈随机脉动
                        const turbulentProfile = Math.pow(Math.max(1 - rRatio, 0.001), 1.0 / 7.0);
                        speed = vMax * turbulentProfile * 3.0;
                        
                        // 剧烈湍流扰动 - 随机速度和方向（Y-Z平面）
                        particle.position.y += (Math.random() - 0.5) * 0.008;
                        particle.position.z += (Math.random() - 0.5) * 0.008;
                    }
                    
                    // 确保最小流速，防止粒子静止
                    const minSpeed = 0.005;
                    speed = Math.max(speed, minSpeed);
                    
                    // 横向流动：沿X轴移动
                    particle.position.x += speed * frameDt;
                    
                    // 【实时速度着色】根据绝对速度映射颜色
                    // 调整速度参考范围，让颜色分布更均匀
                    // vRef_slow = 0.001 m/s (蓝色), vRef_fast = 0.5 m/s (红色)
                    const vRef_slow = 0.001;
                    const vRef_fast = 0.5;
                    const actualSpeed = speed / 3.0;  // 还原真实速度（之前乘了3.0）
                    // 归一化到 0~1 范围，使用平方根让低速区间更明显
                    const rawNorm = Math.max(0, Math.min(1, (actualSpeed - vRef_slow) / (vRef_fast - vRef_slow)));
                    const speedNorm = Math.sqrt(rawNorm);  // 平方根变换，让低速区颜色变化更明显
                    const newColor = getParticleColorBySpeed(speedNorm);
                    particle.material.color.copy(newColor);
                    particle.material.emissive.copy(newColor).multiplyScalar(0.3);
                    
                    // 到达右端出口后销毁粒子（不再回收）
                    if (particle.position.x > L_visual / 2) {
                        group.remove(particle);
                        // 注意：不销毁共享材质，只移除粒子
                        particles.splice(pi, 1);
                        continue;
                    }
                    
                    // 约束粒子在管壁内 - 横向管道，Y-Z平面为截面
                    const py = particle.position.y;
                    const pz = particle.position.z;
                    const distFromAxis = Math.sqrt(py * py + pz * pz);
                    if (distFromAxis > R_visual * 0.9) {
                        const scale = (R_visual * 0.85) / distFromAxis;
                        particle.position.y *= scale;
                        particle.position.z *= scale;
                    }
                }
                
                // 流体层颜色效果（无脉动）
                fluidLayers.forEach((layer, i) => {
                    const rRatio = i / fluidLayers.length;
                    
                    if (Re < 2000) {
                        // 层流：蓝绿色
                        const hue = 0.65 + rRatio * 0.15; // 青绿 -> 蓝绿
                        layer.material.opacity = 0.5;
                        layer.material.color.setHSL(hue, 0.8, 0.5);
                    } else {
                        // 过渡和湍流：蓝绿色
                        const hue = 0.45 + rRatio * 0.15;
                        layer.material.opacity = 0.5;
                        layer.material.color.setHSL(hue, 0.8, 0.5);
                    }
                    layer.scale.set(1, 1, 1);
                });
            }
            
            // 斯托克斯定律动画
            if (currentScene === 'stokes' && sceneObjects.stokes && animationStates.stokes.running) {
                const st = sceneObjects.stokes;
                
                if (st.gravityGroup.visible) {
                    // 小球下落物理模拟
                    const { radius, viscosity } = physics.stokes;
                    const R = radius / 1000; // mm -> m
                    const eta = viscosity;   // Pa·s
                    const rho_s = 7800;      // kg/m³（钢球密度，固定）
                    const rho_f = 1000;      // kg/m³（水密度，固定）
                    const g = 9.8;
                    
                    const volume = (4 / 3) * Math.PI * Math.pow(R, 3);
                    const mass = rho_s * volume;
                    const gravity = mass * g;
                    const buoyancy = rho_f * volume * g;
                    const netGravity = gravity - buoyancy;
                    const vTerminal=PhysicsEngine.stokes(R,rho_s,rho_f,eta,g).vt;

                    // 判断：如果收尾速度极小（粘滞力足以平衡净重力），小球保持不动
                    if (vTerminal < 1e-6) {
                        animationStates.stokes.ballVelocity = 0;
                        animationStates.stokes.visualVelocity = 0;
                    } else {
                        // 物理模拟：使用时间缩放让加速过程肉眼可见
                        // 时间缩放用于放慢加速过程；实际松弛时间由当前参数和阻力模型决定。
                        // 使用时间缩放因子让过程变慢，但保持正确的物理关系
                        
                        // frameDt comes from the shared RAF timestamp.
                        const timeScale = 0.003;  // 物理时间步长按 timeScale = 0.003 缩放。
                        const physDt = frameDt * timeScale;  // 物理模拟时间步长
                        
                        // 受力关系：
                        // 低雷诺数下阻力为 6πηRv；实际积分调用主引擎的分区阻力模型。
                        // 2. 初始时 v=0，所以 <i>F</i><sub>drag</sub>=0，加速度最大
                        // 3. 速度增加，<i>F</i><sub>drag</sub> 增加，加速度减小
                        // 4. 当 <i>F</i><sub>drag</sub> = 净重力 时，加速度=0，达到匀速
                        const step=PhysicsEngine.advanceSphere(animationStates.stokes.ballVelocity,physDt,R,rho_s,rho_f,eta,g);
                        animationStates.stokes.ballVelocity=step.v;

                        // 视觉速度映射：根据收尾速度动态调整，让不同速度差别更明显
                        // 实际收尾速度范围：0.00027 ~ 0.059 m/s，映射到视觉下落时间 12~30秒
                        const minTime = 12.0;  // 最快速度下落时间（秒）
                        const maxTime = 30.0;  // 最慢速度下落时间（秒）
                        const vMin = 0.000272; // 最小收尾速度 (R=0.5mm, η=3Pa·s)
                        const vMax = 0.0588;   // 最大收尾速度 (R=3mm, η=0.5Pa·s)
                        const clampedV = Math.max(vMin, Math.min(vMax, vTerminal));
                        // 收尾速度越大，下落时间越短（线性映射）
                        const t = (clampedV - vMin) / (vMax - vMin); // 0~1
                        const visualTravelTime = maxTime - (maxTime - minTime) * t;
                        const visualTerminalSpeed = 8.0 / visualTravelTime;
                        
                        // 当前物理速度占收尾速度的比例 → 映射到视觉速度
                        const ratio = animationStates.stokes.ballVelocity / vTerminal;
                        const visualRatio = Math.sqrt(ratio); // 平方根变换，加速初期变化更明显
                        animationStates.stokes.visualVelocity = visualRatio * visualTerminalSpeed;
                        
                        // 【速度颜色指示】根据当前速度比例显示颜色
                        // ratio: 0=静止(蓝色), 1=匀速(红色)
                        // 颜色渐变：蓝→青→绿→黄→橙→红
                        const hue = 0.6 * (1 - ratio);  // 0.6(蓝) → 0(红)
                        const saturation = 0.9;
                        const lightness = 0.4 + ratio * 0.15;
                        st.ball.material.color.setHSL(hue, saturation, lightness);
                        st.ball.material.emissive.setHSL(hue, 0.8, 0.25 + ratio * 0.2);
                        
                        // 【匀速闪烁环】当达到匀速时闪烁两次
                        const ring = st.ball.getObjectByName('steadyRing');
                        const glowRing = st.ball.getObjectByName('steadyGlow');
                        if (ring && ratio > 0.95 && !animationStates.stokes.hasFlashed) {
                            animationStates.stokes.hasFlashed = true;
                            // 闪烁两次，每次0.3秒
                            let flashCount = 0;
                            const flashInterval = setInterval(() => {
                                flashCount++;
                                const isOn = flashCount % 2 === 1;
                                // 主环
                                ring.visible = true;
                                ring.material.opacity = isOn ? 1.0 : 0;
                                // 发光外环
                                if (glowRing) {
                                    glowRing.visible = true;
                                    glowRing.material.opacity = isOn ? 0.5 : 0;
                                }
                                if (flashCount >= 4) { // 亮-暗-亮-暗
                                    clearInterval(flashInterval);
                                    ring.visible = false;
                                    ring.material.opacity = 0;
                                    if (glowRing) {
                                        glowRing.visible = false;
                                        glowRing.material.opacity = 0;
                                    }
                                }
                            }, 300); // 每300ms切换一次
                        }
                        
                        // 用视觉速度更新位置
                        animationStates.stokes.ballPosition -= animationStates.stokes.visualVelocity * frameDt;
                    }
                    
                    // 到达底部后重置到顶部继续下落
                    if (animationStates.stokes.ballPosition < -4.0) {
                        animationStates.stokes.ballPosition = 4.0;
                        animationStates.stokes.ballVelocity = 0;
                        animationStates.stokes.visualVelocity = 0;
                        animationStates.stokes.hasFlashed = false; // 重置闪烁标记
                        // 【重置颜色】恢复小球初始颜色（蓝色）
                        st.ball.material.color.setHSL(0.6, 0.9, 0.4);
                        st.ball.material.emissive.setHSL(0.6, 0.8, 0.3);
                    }
                    
                    st.ball.position.y = animationStates.stokes.ballPosition;
                    updateStokesScene();
                }
                
                if (st.centrifugeGroup.visible) {
                    // 离心旋转
                    const omega = physics.stokes.omega;
                    st.centrifugeGroup.rotation.y += omega * 0.0001 * frameScale;
                    
                    // 颗粒向外移动
                    st.tubes.forEach(tube => {
                        tube.userData.particles.forEach(particle => {
                            const outwardSpeed = omega * 0.000005;
                            particle.position.x += outwardSpeed * frameScale;
                            if (particle.position.x > 0.12) {
                                particle.position.x = 0.12;
                            }
                        });
                    });
                }
            }
            
            // 批量更新牛顿粘性实验的拖尾Points系统（蝌蚪尾巴）
            if (currentScene === 'newton' && sceneObjects.newton && sceneObjects.newton.trailPoints) {
                const { flowParticles, trailGeo, trailPoints, maxTrailPoints } = sceneObjects.newton;
                const { viscosity } = physics.newton;
                const viscosityFactor = Math.max(0, (viscosity - 0.1) / (10 - 0.1));
                const maxTrailLen = Math.floor(3 + viscosityFactor * 9);  // 3-12个点
                
                const posArr = trailGeo.attributes.position.array;
                const colArr = trailGeo.attributes.color.array;
                const sizeArr = trailGeo.attributes.size.array;
                let idx = 0;
                
                for (let p = 0; p < flowParticles.length && idx < maxTrailPoints; p++) {
                    const particle = flowParticles[p];
                    if (!particle.visible) continue;
                    const trail = particle.userData.trailPositions;
                    if (!trail || trail.length < 2) continue;
                    
                    const pColor = particle.material.color;
                    const len = Math.min(trail.length, maxTrailLen);
                    for (let i = 0; i < len && idx < maxTrailPoints; i++) {
                        const t = trail[i];
                        posArr[idx * 3] = t.x;
                        posArr[idx * 3 + 1] = t.y;
                        posArr[idx * 3 + 2] = t.z;
                        // 颜色与粒子一致，尾部逐渐变淡
                        const fade = Math.pow(1 - i / len, 0.8);  // 衰减更慢，更亮
                        colArr[idx * 3] = pColor.r * fade;
                        colArr[idx * 3 + 1] = pColor.g * fade;
                        colArr[idx * 3 + 2] = pColor.b * fade;
                        // 蝌蚪尾巴：头部大，尾部快速变细
                        sizeArr[idx] = 0.25 * Math.pow(1 - i / len, 2) * (0.6 + viscosityFactor * 2.0);
                        idx++;
                    }
                }
                
                for (let i = idx; i < maxTrailPoints; i++) {
                    posArr[i * 3] = 0;
                    posArr[i * 3 + 1] = -9999;
                    posArr[i * 3 + 2] = 0;
                    sizeArr[i] = 0;
                }
                
                trailGeo.attributes.position.needsUpdate = true;
                trailGeo.attributes.color.needsUpdate = true;
                trailGeo.attributes.size.needsUpdate = true;
                trailGeo.setDrawRange(0, idx);
            }
            
            controls.update();
            renderer.render(scene, camera);
        }
        
        
        // 事件绑定
        
        function bindEvents() {
            // 场景切换 - 为每个按钮单独绑定事件
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sceneName = btn.dataset.scene;
                    if (sceneName && sceneName !== currentScene) {
                        showScene(sceneName);
                    }
                });
            });
            
            // 牛顿粘性定律控制
            document.getElementById('newton-start').addEventListener('click', () => {
                animationStates.newton.running = true;
                updateControlButtons();
            });
            
            document.getElementById('newton-stop').addEventListener('click', () => {
                animationStates.newton.running = false;
                updateControlButtons();
            });
            
            document.getElementById('newton-viscosity').addEventListener('input', (e) => {
                physics.newton.viscosity = parseFloat(e.target.value);
                document.getElementById('newton-viscosity-val').textContent = `${physics.newton.viscosity.toFixed(1)} Pa·s`;
                updateNewtonScene();
            });
            
            document.getElementById('newton-velocity').addEventListener('input', (e) => {
                physics.newton.velocity = parseFloat(e.target.value);
                document.getElementById('newton-velocity-val').textContent = `${physics.newton.velocity.toFixed(1)} m/s`;
                updateNewtonScene();
            });
            
            document.getElementById('newton-gap').addEventListener('input', (e) => {
                physics.newton.gap = parseFloat(e.target.value);
                document.getElementById('newton-gap-val').textContent = `${physics.newton.gap.toFixed(1)} m`;
                updateNewtonScene();
            });
            
            document.getElementById('newton-area').addEventListener('input', (e) => {
                physics.newton.area = parseFloat(e.target.value);
                document.getElementById('newton-area-val').textContent = `${physics.newton.area.toFixed(2)} m²`;
                updateNewtonScene();
            });
            
            document.getElementById('newton-reset').addEventListener('click', () => {
                animationStates.newton.running = false;
                physics.newton = { viscosity: 1, velocity: 2, gap: 1, area: 1 };
                document.getElementById('newton-viscosity').value = 1;
                document.getElementById('newton-velocity').value = 2;
                document.getElementById('newton-gap').value = 1;
                document.getElementById('newton-area').value = 1;
                document.getElementById('newton-viscosity-val').textContent = '1.0 Pa·s';
                document.getElementById('newton-velocity-val').textContent = '2.0 m/s';
                document.getElementById('newton-gap-val').textContent = '1.0 m';
                document.getElementById('newton-area-val').textContent = '1.0 m²';
                updateNewtonScene();
                updateControlButtons();
            });
            
            // 泊肃叶定律控制
            document.getElementById('poiseuille-start').addEventListener('click', () => {
                animationStates.poiseuille.running = true;
                updateControlButtons();
            });
            
            document.getElementById('poiseuille-stop').addEventListener('click', () => {
                animationStates.poiseuille.running = false;
                updateControlButtons();
            });
            
            document.getElementById('poiseuille-radius').addEventListener('input', (e) => {
                physics.poiseuille.radius = parseFloat(e.target.value);
                document.getElementById('poiseuille-radius-val').textContent = `${physics.poiseuille.radius.toFixed(1)} mm`;
                updatePoiseuilleScene();
            });
            
            document.getElementById('poiseuille-pressure').addEventListener('input', (e) => {
                physics.poiseuille.pressure = parseFloat(e.target.value);
                document.getElementById('poiseuille-pressure-val').textContent = `${physics.poiseuille.pressure.toFixed(0)} Pa`;
                updatePoiseuilleScene();
            });
            
            document.getElementById('poiseuille-viscosity').addEventListener('input', (e) => {
                physics.poiseuille.viscosity = parseFloat(e.target.value);
                document.getElementById('poiseuille-viscosity-val').textContent = `${physics.poiseuille.viscosity.toFixed(1)} mPa·s`;
                updatePoiseuilleScene();
            });
            
            document.getElementById('poiseuille-length').addEventListener('input', (e) => {
                const newLength = parseFloat(e.target.value);
                const oldVisualLength = 0.5 + (physics.poiseuille.length - 0.1) * (3.5 / 1.9);
                
                // 更新物理参数前先保存旧的视觉长度
                // 这样 updatePoiseuilleScene 中的 prevL 会获取到这个值
                if (sceneObjects.poiseuille && sceneObjects.poiseuille.outerPipe) {
                    sceneObjects.poiseuille.outerPipe.userData.lastLength = oldVisualLength;
                }
                
                physics.poiseuille.length = newLength;
                document.getElementById('poiseuille-length-val').textContent = `${physics.poiseuille.length} m`;
                updatePoiseuilleScene();
            });
            
            document.getElementById('poiseuille-reset').addEventListener('click', () => {
                animationStates.poiseuille.running = false;
                physics.poiseuille = { radius: 2.5, pressure: 100, viscosity: 2, length: 1 };
                document.getElementById('poiseuille-radius').value = 2.5;
                document.getElementById('poiseuille-pressure').value = 100;
                document.getElementById('poiseuille-viscosity').value = 2;
                document.getElementById('poiseuille-length').value = 1;
                document.getElementById('poiseuille-radius-val').textContent = '2.5 mm';
                document.getElementById('poiseuille-pressure-val').textContent = '100 Pa';
                document.getElementById('poiseuille-viscosity-val').textContent = '2.0 mPa·s';
                document.getElementById('poiseuille-length-val').textContent = '1.0 m';
                
                // 重置时恢复初始管道长度记录
                if (sceneObjects.poiseuille && sceneObjects.poiseuille.outerPipe) {
                    const initialVisualLength = 0.5 + (1 - 0.1) * (3.5 / 1.9);
                    sceneObjects.poiseuille.outerPipe.userData.lastLength = initialVisualLength;
                }
                
                updatePoiseuilleScene();
                updateControlButtons();
            });
            
            // 斯托克斯定律控制
            document.getElementById('stokes-start').addEventListener('click', () => {
                animationStates.stokes.running = true;
                if (sceneObjects.stokes.gravityGroup.visible) {
                    animationStates.stokes.ballPosition = 4.0;
                    animationStates.stokes.ballVelocity = 0;
                    animationStates.stokes.visualVelocity = 0;
                    animationStates.stokes.hasFlashed = false;
                }
                updateControlButtons();
            });
            
            document.getElementById('stokes-stop').addEventListener('click', () => {
                animationStates.stokes.running = false;
                updateControlButtons();
            });
            
            document.getElementById('stokes-radius').addEventListener('input', (e) => {
                physics.stokes.radius = parseFloat(e.target.value);
                document.getElementById('stokes-radius-val').textContent = `${physics.stokes.radius.toFixed(1)} mm`;
                updateStokesScene();
            });
            
            document.getElementById('stokes-viscosity').addEventListener('input', (e) => {
                physics.stokes.viscosity = parseFloat(e.target.value);
                document.getElementById('stokes-viscosity-val').textContent = `${physics.stokes.viscosity.toFixed(1)} Pa·s`;
                updateStokesScene();
            });
            
            document.getElementById('stokes-reset').addEventListener('click', () => {
                animationStates.stokes.running = false;
                animationStates.stokes.ballPosition = 4.0;
                animationStates.stokes.ballVelocity = 0;
                animationStates.stokes.visualVelocity = 0;
                animationStates.stokes.hasFlashed = false;
                // 【重置颜色】恢复小球初始颜色（蓝色）
                if (sceneObjects.stokes && sceneObjects.stokes.ball) {
                    sceneObjects.stokes.ball.material.color.setHSL(0.6, 0.9, 0.4);
                    sceneObjects.stokes.ball.material.emissive.setHSL(0.6, 0.8, 0.3);
                }
                
                // 重置小球位置到液体顶部
                if (sceneObjects.stokes.ball) {
                    sceneObjects.stokes.ball.position.y = 4.0;
                }
                
                physics.stokes = { radius: 2.0, viscosity: 1.0, omega: 1000, mode: 'gravity' };
                document.getElementById('stokes-radius').value = 2.0;
                document.getElementById('stokes-viscosity').value = 1.0;
                document.getElementById('stokes-radius-val').textContent = '2.0 mm';
                document.getElementById('stokes-viscosity-val').textContent = '1.0 Pa·s';
                
                updateStokesScene();
                updateControlButtons();
            });
        }
        


// 暴露公共API给外部使用

var _initialized = false;

window.ThreeDSimulation = {
    init: function(targetScene) {
        if (_initialized) {
            // 已初始化：立即强制同步到目标场景（清除上次浏览残留画面），再重启渲染循环
            if (targetScene) {
                showScene(targetScene, true);
            }
            if (!animationId && typeof THREE !== 'undefined') {
                animationId = requestAnimationFrame(animate);
            }
            return;
        }
        if (typeof THREE === 'undefined') {
            console.warn('Three.js not loaded yet, cannot init 3D simulation');
            return;
        }
        var container = document.getElementById('canvas-container');
        if (!container) {
            console.warn('canvas-container not found, cannot init 3D simulation');
            return;
        }
        _initialized = true;
        initThree(targetScene);
        bindEvents();
        updateNewtonScene();
        updatePoiseuilleScene();
        updateStokesScene();
        updateControlButtons();
        animate();
    },
    switchScene: function(name) {
        showScene(name);
    },
    resize: function() {
        onWindowResize();
    },
    updateTheme: function(isDark) {
        if (typeof scene !== 'undefined' && scene) {
            scene.background = new THREE.Color(isDark ? 0x0a0a1a : 0xe8f0ff);
            if (typeof scene.fog !== 'undefined' && scene.fog) {
                scene.fog = new THREE.FogExp2(isDark ? 0x0a0a1a : 0xe8f0ff, isDark ? 0.03 : 0.02);
            }
        }
    }
};

})();

