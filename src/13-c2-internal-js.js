
/* 原理页接入层：在主脚本后加载，重排原理内容、装置卡和现象观察；提供工作区主题判定接口。 */
(function () {
  'use strict';

  /* 工作区主题接口当前固定返回 false；调用方据此采用浅色工作区。 */
  window.c2WorkDark = function () {
    return false;
  };

  var ASSETS = window.C2_ASSETS || { hero: {}, rig: [] };

  /* 三个实验各四张装置卡：文案取自各自旧版「实验装置」小节里的部件清单 */
  var RIG_SETS = {
    newton: [
      { title: '上下平行刚性平板',
        desc: '两块平行放置的刚性平板，可调节两板间距 <i>z</i> 及平板接触面积 <i>A</i>。' },
      { title: '动力驱动装置',
        desc: '驱动上板以速度 <i>u</i> 匀速运动，下板固定不动。' },
      { title: '待测试流体',
        desc: '填充于两平板之间，其动力黏度 <i>η</i> 可更换或调节。' },
      { title: '测量与记录装置',
        desc: '捕捉流体层位移轨迹，绘制位移–板间距曲线。' }
    ],
    poiseuille: [
      { title: '刚性圆管',
        desc: '不同半径 <i>r</i> 与不同长度 <i>L</i> 的刚性圆管，可自主更换调节。' },
      { title: '流体存储与输送装置',
        desc: '稳定输送待测黏性流体（动力黏度 <i>η</i> 可更换或调节），保证进入圆管的流量连续、平稳。' },
      { title: '压强调节装置',
        desc: '调节圆管两端的压强差 <i>ΔP</i>，并使之保持稳定。' },
      { title: '测量与记录装置',
        desc: '称量单位时间内流出的流体体积，换算体积流量 <i>Q</i>。' }
    ],
    stokes: [
      { title: '透明沉降柱',
        desc: '盛装待测黏性流体，便于观察颗粒的沉降轨迹。' },
      { title: '均匀球形颗粒',
        desc: '粒径 <i>r</i> 均匀的球形颗粒，可按需更换不同粒径。' },
      { title: '待测黏性流体',
        desc: '动力黏度 <i>η</i> 与流体密度 <i>ρ</i> 均可更换或调节，用于对比不同黏度、密度下的沉降。' },
      { title: '测量与记录装置',
        desc: '记录颗粒经过刻度线的时间，换算沉降速度 <i>v</i>。' }
    ]
  };

  /* 配图署名 RIG_CREDIT：图片均来自 Wikimedia Commons，逐项作者与许可见下方署名。 */
  var RIG_CREDIT =
    '配图 = 真实测量仪器 / 实验室实拍（Wikimedia Commons）。' +
    '牛顿：TA AR1000 流变仪特写 / Nick Birse / CC BY-SA 4.0；' +
    'Brookfield 旋转黏度计 / Diego E HF / CC BY-SA 4.0；' +
    'Pouring Honey / Alabama Extension / CC0；' +
    'Machine traction gunt wp300 / Cdang / Public domain。' +
    '泊肃叶：乌氏黏度计 / 玻璃毛细管（Ubbelohde viscometer prepared）/ Vis M / CC BY-SA 4.0；' +
    '蠕动泵 / Bin im Garten / CC BY 4.0；' +
    '压力计（Manometer）/ Hannes Grobe / CC BY-SA 4.0；' +
    '分析天平 Kern ADB 200-4 / PaulT / CC BY-SA 4.0。' +
    '斯托克斯：沉降柱（Drops of fluorescein in water）/ Alessandro e Damiano / CC BY 4.0；' +
    '钢珠（Ball bearings）/ Gpkp / CC BY-SA 4.0；' +
    '标准黏度硅油 / Retired electrician / CC0；' +
    '机械秒表 / R. Henrik Nilsson / CC BY 4.0。';

  /* 头图署名与许可信息。 */
  var HERO_CREDIT = {
    newton: '牛顿像 · Sir Godfrey Kneller 1689 年油画像（公有领域）/ Wikimedia Commons',
    poiseuille: '泊肃叶像 · Jean-Léonard-Marie Poiseuille 照片，作者不详（公有领域）/ Wikimedia Commons',
    stokes: '斯托克斯像 · Sir George Gabriel Stokes / Teresa Stokes（Flickr）/ CC BY-SA 2.0 / Wikimedia Commons'
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 按去除空白的公式键查询 C2_MATH 中的原生 MathML 字典；未匹配的公式保留原文。 */
  function squashMathKey(s) {
    return String(s).replace(/\s+/g, '');
  }

  function mathItems() {
    var M = window.C2_MATH;
    return (M && M.items) || null;
  }

  /* 把一段文字里的行内公式换成 原生MathML（只在文字节点里替换，不碰标签） */
  function replaceInlineMath(root, plain, html) {
    if (!plain) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf(plain) >= 0) nodes.push(node);
    }
    nodes.forEach(function (textNode) {
      var host = textNode.parentElement;
      if (host && host.closest && host.closest('.formula-box, .c2-math-inline')) return;
      var parts = textNode.nodeValue.split(plain);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part, i) {
        if (i) {
          var span = document.createElement('span');
          span.className = 'c2-math-inline';
          span.innerHTML = html;
          frag.appendChild(span);
        }
        if (part) frag.appendChild(document.createTextNode(part));
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  /* 原理页渲染完之后调一次：块级公式（.formula-box）+ 正文里的行内公式 */
  function typesetMath(root) {
    var items = mathItems();
    if (!items || !root) return;
    [].slice.call(root.querySelectorAll('.formula-box')).forEach(function (el) {
      var item = items[squashMathKey(el.textContent)];
      if (!item || !item.display) return;
      el.innerHTML = item.display;
      el.classList.add('c2-math-block');
    });
    /* 长的先替：不然 "du/dz" 会先把 "τ = η · (du/dz)" 里的内层吃掉 */
    ((window.C2_MATH && window.C2_MATH.inline) || [])
      .slice()
      .sort(function (a, b) { return (b.text || '').length - (a.text || '').length; })
      .forEach(function (it) {
        if (it.html) replaceInlineMath(root, it.text, it.html);
      });
  }

  /* 把「一、实验简介」「 现象观察…」这类标题清成干净的标题 + tab 文本 */
  function cleanTitle(raw) {
    var t = String(raw || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^[0-9０-９一二三四五六七八九十]+\s*[、.．]\s*/, '');
    /* 去掉标题开头可能带的 emoji / 符号（只保留中文、英文、数字开头） */
    t = t.replace(/^[^\u4e00-\u9fa5A-Za-z0-9（(]+/, '');
    return t.trim();
  }

  function rigImages(expType) {
    var rig = ASSETS.rig;
    if (rig && rig[expType]) return rig[expType];          /* 新结构：按实验分组 */
    if (Object.prototype.toString.call(rig) === '[object Array]') return rig;  /* 旧结构 */
    return [];
  }

  function buildRigCards(expType) {
    var cards = RIG_SETS[expType] || RIG_SETS.newton;
    var imgs = rigImages(expType);
    var html = '<!-- ' + RIG_CREDIT + ' --><div class="c2-rig-grid">';
    cards.forEach(function (c, i) {
      var src = imgs[i] || '';
      html += '<article class="c2-rig">' +
        '<div class="c2-rig-media"><img src="' + src + '" alt="' + esc(c.title) + '实拍参考图"></div>' +
        '<span class="c2-rig-tag">0' + (i + 1) + '</span>' +
        '<h4 class="c2-rig-title">' + esc(c.title) + '</h4>' +
        '<p class="c2-rig-desc">' + c.desc + '</p>' +
      '</article>';
    });
    html += '</div>';
    return html;
  }

  /* ================= 现象观察：滚轮 ================= */

  var GREEK = 'ηρμΔσλω';

  /* 一个「现象观察：<变量> 变化（其余不变）」小节 → 结构化数据 */
  function parseObsSection(sec, title) {
    var body = title.replace(/^现象观察\s*[:：]\s*/, '').trim();
    var cond = '';
    var m = body.match(/[（(]([^）)]*)[）)]/);
    if (m) {
      cond = m[1].trim();
      body = body.replace(m[0], '').trim();
    }
    var name = body.replace(/\s*变化\s*$/, '').trim();
    var parts = name.split(/\s+/);
    var last = parts.length > 1 ? parts[parts.length - 1] : '';
    /* 变量符号：u / z / A / r / L / ΔP / η 这类（含希腊字母与 Δ） */
    var isSym = /^[A-Za-z\u0391-\u03c9][A-Za-z0-9]*$/.test(last) ||
      (last.length === 1 && GREEK.indexOf(last) >= 0);
    var symbol = isSym ? last : '';
    var label = symbol ? parts.slice(0, -1).join(' ') : name;

    var blocks = [];
    [].slice.call(sec.querySelectorAll('div')).forEach(function (el) {
      var p = el.querySelector(':scope > p');
      var ol = el.querySelector(':scope > ol');
      if (!p || !ol) return;
      var lis = [].slice.call(ol.querySelectorAll('li'))
        .map(function (li) { return li.textContent.replace(/\s+/g, ' ').trim(); })
        .filter(Boolean);
      if (!lis.length) return;
      var raw = p.textContent.replace(/\s+/g, ' ').trim();
      var dir = /[▲↑]/.test(raw) || /增大/.test(raw) ? 'up'
        : (/[▼↓]/.test(raw) || /减小/.test(raw) ? 'down' : '');
      if (!dir) return;
      blocks.push({ dir: dir, label: raw.replace(/^[▲▼↑↓]\s*/, '').trim(), items: lis });
    });
    if (!blocks.length) return null;
    return { title: title, name: name, symbol: symbol, label: label, cond: cond, blocks: blocks };
  }

  /* 扇形表盘使用同一圆心；当前变量所在扇面填充浅蓝色。 */
  var FAN = {
    w: 300, h: 186, cx: 150, cy: 176,
    rWedge: 132, rLab: 98, span: 55, gap: 1.8
  };

  function fanStep(n) {
    var span = n <= 2 ? 24 : FAN.span;
    return { span: span, step: n > 1 ? (2 * span) / (n - 1) : 0 };
  }

  function fanAngle(i, n) {
    var g = fanStep(n);
    return -g.span + i * g.step;
  }

  function fanXY(deg, r) {
    var t = deg * Math.PI / 180;
    return { x: FAN.cx + r * Math.sin(t), y: FAN.cy - r * Math.cos(t) };
  }

  function buildFanHTML(items) {
    var n = items.length;
    var g = fanStep(n);
    var half = g.step / 2 - FAN.gap;

    var wedges = items.map(function (it, i) {
      var a = fanAngle(i, n);
      var p0 = fanXY(a - half, FAN.rWedge);
      var p1 = fanXY(a + half, FAN.rWedge);
      var d = 'M' + FAN.cx + ' ' + FAN.cy +
        ' L' + p0.x.toFixed(1) + ' ' + p0.y.toFixed(1) +
        ' A' + FAN.rWedge + ' ' + FAN.rWedge + ' 0 0 1 ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + ' Z';
      return '<path class="c2-fan-wedge' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" d="' + d + '"></path>';
    }).join('');

    var labels = items.map(function (it, i) {
      var p = fanXY(fanAngle(i, n), FAN.rLab);
      return '<span class="c2-fan-item' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" role="option" ' +
        'data-sym="' + esc(it.symbol || '') + '" data-name="' + esc(it.label || it.name) + '" ' +
        'aria-selected="' + (i === 0 ? 'true' : 'false') + '" ' +
        'style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px">' +
        '<b>' + esc(it.symbol || String(i + 1)) + '</b></span>';
    }).join('');

    return '<div class="c2-fan-dial">' +
        '<svg class="c2-fan-scale" viewBox="0 0 ' + FAN.w + ' ' + FAN.h + '" aria-hidden="true">' +
          wedges +
        '</svg>' +
        labels +
      '</div>' +
      '<p class="c2-fan-name"></p>';
  }

  function buildObsHTML(items) {
    var slides = items.map(function (it, i) {
      var cols = it.blocks.map(function (b) {
        return '<div class="c2-obs-col ' + b.dir + '">' +
          '<p class="c2-obs-label">' + (b.dir === 'up' ? '▲ ' : '▼ ') + esc(b.label) + '</p>' +
          '<ol>' + b.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        '</div>';
      }).join('');
      return '<article class="c2-obs-slide' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' +
        '<header class="c2-obs-head">' +
          '<h4>' + esc(it.label || it.name) + (it.symbol ? ' <i>' + esc(it.symbol) + '</i>' : '') + ' 变化</h4>' +
          (it.cond ? '<span class="c2-obs-cond">（' + esc(it.cond) + '）</span>' : '') +
        '</header>' +
        '<div class="c2-obs-cols">' + cols + '</div>' +
      '</article>';
    }).join('');

    return '<div class="c2-obs">' +
      '<aside class="c2-fan" tabindex="0" role="listbox" aria-label="现象观察变量">' +
        buildFanHTML(items) +
      '</aside>' +
      '<div class="c2-obs-stage"><div class="c2-obs-slides">' + slides + '</div></div>' +
    '</div>';
  }

  /* 扇形交互：拖动指针 / 滚轮 / 点击符号 / 方向键，松手吸附到最近的变量 */
  function wireFan(host) {
    var root = host.querySelector('.c2-obs');
    if (!root) return;
    var fan = root.querySelector('.c2-fan');
    var dial = root.querySelector('.c2-fan-dial');
    var items = [].slice.call(root.querySelectorAll('.c2-fan-item'));
    var wedges = [].slice.call(root.querySelectorAll('.c2-fan-wedge'));
    var nameEl = root.querySelector('.c2-fan-name');
    var slides = [].slice.call(root.querySelectorAll('.c2-obs-slide'));
    var n = items.length;
    if (!dial || n < 2) return;

    var g = fanStep(n);
    var cur = -1;
    var dragging = false;
    var moved = 0;

    function paint(active) {
      if (active === cur) return;
      cur = active;
      slides.forEach(function (s, j) {
        s.classList.toggle('on', j === active);
        s.setAttribute('aria-hidden', j === active ? 'false' : 'true');
      });
      items.forEach(function (el, j) {
        var on = j === active;
        el.classList.toggle('on', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      wedges.forEach(function (el, j) { el.classList.toggle('on', j === active); });
      var it = items[active];
      nameEl.innerHTML = '<b>' + esc(it.getAttribute('data-sym') || '') + '</b>' +
        esc(it.getAttribute('data-name') || '');
      root.setAttribute('data-active', String(active));
    }

    function goTo(target) {
      var to = Math.max(0, Math.min(n - 1, target));
      paint(to);
    }

    /* 指针相对圆心（表盘转轴）的角度：正上方 0°，向右为正 */
    function angleAt(ev) {
      var r = dial.getBoundingClientRect();
      if (!r.width) return 0;
      var px = r.left + FAN.cx * (r.width / FAN.w);
      var py = r.top + FAN.cy * (r.height / FAN.h);
      var deg = Math.atan2(ev.clientX - px, -(ev.clientY - py)) * 180 / Math.PI;
      return Math.max(-g.span - 12, Math.min(g.span + 12, deg));
    }

    function nearest(deg) {
      return Math.max(0, Math.min(n - 1, Math.round((deg + g.span) / g.step)));
    }

    dial.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = 0;
      try { dial.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var deg = angleAt(e);
      paint(nearest(deg));
      if (e.cancelable) e.preventDefault();
    });

    dial.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved += 1;
      var deg = angleAt(e);
      paint(nearest(deg));
      if (e.cancelable) e.preventDefault();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      goTo(cur < 0 ? 0 : cur);          /* 松手吸附到最近的档 */
    }

    dial.addEventListener('pointerup', endDrag);
    dial.addEventListener('pointercancel', endDrag);
    dial.addEventListener('lostpointercapture', endDrag);

    dial.addEventListener('click', function (e) {
      if (moved > 2) return;
      var it = e.target.closest ? e.target.closest('.c2-fan-item, .c2-fan-wedge') : null;
      if (it) goTo(parseInt(it.getAttribute('data-i'), 10));
    });

    fan.addEventListener('wheel', function (e) {
      var d = e.deltaY || e.deltaX;
      if (Math.abs(d) < 3) return;
      e.preventDefault();
      goTo((cur < 0 ? 0 : cur) + (d > 0 ? 1 : -1));
    }, { passive: false });

    fan.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goTo((cur < 0 ? 0 : cur) + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo((cur < 0 ? 0 : cur) - 1);
      }
    });

    paint(0);
  }

  /* 组装 C 方案原理页 */
  function buildPrinciplePage(expType, exp, legacyHTML) {
    var doc = new DOMParser().parseFromString('<div>' + legacyHTML + '</div>', 'text/html');
    var wrap = doc.body.firstElementChild;

    /* 移除原内容中以横轴、纵轴说明开头的段落。 */
    [].slice.call(wrap.querySelectorAll('[style*="dashed"]')).forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    var sections = [].slice.call(wrap.querySelectorAll('.principle-section'));

    var tabs = [];
    var parts = [];
    var obs = [];        /* 现象观察小节先攒着，最后合成一个滚轮 */
    sections.forEach(function (sec, i) {
      var h = sec.querySelector('h2, h3, h4');
      var title = cleanTitle(h ? h.textContent : '小节 ' + (i + 1));

      if (/^现象观察/.test(title)) {
        var parsed = parseObsSection(sec, title);
        if (parsed) { obs.push(parsed); return; }
      }

      if (i === 2 && RIG_SETS[expType]) {
        /* 「实验装置」整段换成四张卡片（三个实验各自一套） */
        sec.innerHTML = '<h3>' + esc(title) + '</h3>' + buildRigCards(expType);
      } else {
        if (h) h.textContent = title;
      }
      sec.classList.add('c2-sec');
      sec.id = 's' + (i + 1);
      parts.push(sec.outerHTML);
      if (parts.length <= 4) {
        tabs.push({ href: '#' + sec.id, label: title });
      }
    });

    if (obs.length >= 2) {
      var sec5 = doc.createElement('div');
      sec5.className = 'principle-section c2-sec';
      sec5.id = 's5';
      sec5.innerHTML = '<h3>现象观察</h3>' + buildObsHTML(obs);
      parts.push(sec5.outerHTML);
      tabs.push({ href: '#s5', label: '现象观察' });
    }

    var hero = (ASSETS.hero && ASSETS.hero[expType]) || '';
    var tabsHTML = tabs.map(function (t, i) {
      return '<a class="c2-tab' + (i === 0 ? ' active' : '') + '" href="' + t.href + '">' + esc(t.label) + '</a>';
    }).join('');

    return '' +
      '<!-- hero 头图：' + (HERO_CREDIT[expType] || '') + ' -->' +
      '<header class="c2-hero" style="background-image:url(' + hero + ');background-size:cover;background-position:center 42%">' +
        '<div class="c2-hero-veil"></div>' +
        '<div class="c2-hero-inner">' +
          '<h1 class="c2-hero-title">' + esc(exp && exp.name ? exp.name : '') + '</h1>' +
          '<p class="c2-hero-sub">' + esc(exp && exp.description ? exp.description : '') + '</p>' +
        '</div>' +
        '<nav class="c2-tabs">' + tabsHTML + '</nav>' +
      '</header>' +
      '<div class="c2-doc c2-legacy">' + parts.join('') + '</div>';
  }

  /* tab 点击跳转 + 滚动高亮 */
  function wireTabs(host) {
    var tabs = [].slice.call(host.querySelectorAll('.c2-tab'));
    if (!tabs.length) return;
    var scroller = host.closest('.sub-page') || host;
    var secs = tabs.map(function (t) {
      return document.getElementById(t.getAttribute('href').slice(1));
    });

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(tab.getAttribute('href').slice(1));
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(sync, 420);
      });
    });

    function sync() {
      var top = scroller.getBoundingClientRect().top;
      var current = 0;
      secs.forEach(function (sec, i) {
        if (sec && sec.getBoundingClientRect().top - top <= 130) current = i;
      });
      tabs.forEach(function (t, i) { t.classList.toggle('active', i === current); });
    }
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---- 接管 renderPrinciplePage ---- */
  var legacyRender = (typeof renderPrinciplePage === 'function') ? renderPrinciplePage : null;

  /* 页面控件：导航栏操作指引、随滚动显示的返回顶端按钮与品牌图标。 */

  var topBtn = null;
  var scroller = null;

  /* 首页顶栏放置品牌图标；实验页图标复用侧栏折叠按钮。 */
  var BRAND_ALT = '黏性现象仿真实验教学软件';

  function ensureBrand() {
    var logo = ASSETS.logo;
    if (!logo) return;

    /* 首页顶栏：插在最前面 */
    [].slice.call(document.querySelectorAll('.home-nav-bar')).forEach(function (nav) {
      if (nav.querySelector('.c2-brand')) return;      /* 已经有了就不动它 */
      var brand = document.createElement('div');
      brand.className = 'c2-brand';
      brand.innerHTML = '<img src="' + logo + '" alt="' + BRAND_ALT + '" title="' + BRAND_ALT + '">';
      nav.insertBefore(brand, nav.firstChild);         /* 顶栏最左 */
    });

    /* 实验页：把 logo 放进左侧栏那个折叠按钮里（点击行为沿用原按钮，不用另接事件） */
    [].slice.call(document.querySelectorAll('#experimentPage .sidebar .toggle-btn, .sidebar .toggle-btn'))
      .forEach(function (btn) {
        if (btn.querySelector('img.c2-brand-logo')) return;
        btn.textContent = '';                            /* 丢掉原来的 ◀ */
        var img = document.createElement('img');
        img.className = 'c2-brand-logo';
        img.src = logo;
        img.alt = BRAND_ALT;
        img.title = '收起 / 展开左侧导航';
        btn.appendChild(img);
        btn.setAttribute('aria-label', '收起或展开左侧导航');
      });
  }

  function moveGuide() {
    var g = document.getElementById('operationGuide');
    var nav = document.querySelector('#experimentPage .experiment-nav .nav-right');
    if (!g || !nav || g.parentElement === nav) return;
    nav.appendChild(g);
  }

  /* 找原理页真正在滚的那个容器（不是 window） */
  function resolveScroller() {
    var host = document.getElementById('principlePage');
    if (!host) return null;
    var el = host.querySelector('.c2-doc') || host;
    while (el && el !== document.body) {
      var cs = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY || '')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function refreshTopBtn(ev) {
    if (!topBtn) return;
    var host = document.getElementById('principlePage');
    /* 在 document 捕获后代容器的 scroll 事件，以确定当前滚动容器。 */
    var t = ev && ev.target;
    if (t && t.nodeType === 1 && typeof t.scrollTop === 'number' && host &&
        (t === host || host.contains(t) || t.contains(host)) &&
        t.scrollHeight > t.clientHeight + 4) {
      scroller = t;
    }
    if (!scroller) attachScroller();
    var onPrinciple = !!(host && host.classList.contains('active'));
    var st = scroller ? scroller.scrollTop : (window.pageYOffset || 0);
    topBtn.classList.toggle('show', onPrinciple && st > 240);
  }

  /* 原理页在内部容器滚动；重新识别容器并避免重复绑定监听器。 */
  function attachScroller() {
    var sc = resolveScroller();
    if (!sc || sc === scroller) return scroller;
    if (scroller) scroller.removeEventListener('scroll', refreshTopBtn);
    scroller = sc;
    scroller.addEventListener('scroll', refreshTopBtn, { passive: true });
    return scroller;
  }

  function ensureTopBtn() {
    if (topBtn && document.body.contains(topBtn)) return topBtn;
    topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'c2-top';
    topBtn.setAttribute('aria-label', '返回顶端');
    topBtn.title = '返回顶端';
    topBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19.5V5"></path><path d="M5.5 11.5 12 5l6.5 6.5"></path></svg>';
    topBtn.addEventListener('click', function () {
      if (scroller && scroller.scrollTop > 0) {
        scroller.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    document.body.appendChild(topBtn);

    attachScroller();
    document.addEventListener('scroll', refreshTopBtn, { capture: true, passive: true });
    window.addEventListener('scroll', refreshTopBtn, { passive: true });
    window.addEventListener('resize', function () {
      attachScroller();
      refreshTopBtn();
    });
    var host = document.getElementById('principlePage');
    if (host && window.MutationObserver) {
      new MutationObserver(refreshTopBtn).observe(host, { attributes: true, attributeFilter: ['class'] });
    }
    /* 兜底：滚动事件在个别环境（无头/降频）不一定会及时派发，低频轮询只做一个 class 开关 */
    setInterval(refreshTopBtn, 260);
    /* 定时检查顶栏图标，容器重建后补回缺失节点。 */
    setInterval(ensureBrand, 600);
    return topBtn;
  }

  function initChrome() {
    ensureBrand();
    moveGuide();
    ensureTopBtn();
    refreshTopBtn();
  }

  window.renderPrinciplePage = function () {
    var host = document.getElementById('principlePage');
    if (!host) return;
    var expType = (typeof AppState !== 'undefined' && AppState.currentExperiment) || 'newton';
    var exp = (typeof EXPERIMENTS !== 'undefined' && EXPERIMENTS[expType]) || {};

    /* 保留原理页原始渲染函数于 __c2Legacy，供内容重排使用。 */
    var legacyHTML = '';
    try {
      if (legacyRender) { legacyRender(); legacyHTML = window.__c2Legacy || ''; }
    } catch (e) { console.warn('[C2] legacy principle render failed', e); }
    if (!legacyHTML) {
      legacyHTML = '<div class="principle-content"><div class="principle-section"><h3>实验简介</h3>' +
        '<p>' + esc(exp.description || '') + '</p></div></div>';
    }

    try {
      host.innerHTML = buildPrinciplePage(expType, exp, legacyHTML);
      typesetMath(host);
      wireTabs(host);
      wireFan(host);
      attachScroller();
      initChrome();
    } catch (e) {
      console.warn('[C2] 新版原理页渲染失败，回退旧版内容', e);
      host.innerHTML = legacyHTML;
      try { typesetMath(host); } catch (e2) { /* 公式排版失败时保留已有内容。 */ }
    }
  };

  if (document.readyState === 'complete') initChrome();
  else window.addEventListener('load', initChrome);
})();

