
(function () {
  function redraw() {
    // 原理页中的画布尚未初始化；首次绘制会使用已加载的字体。
    const canvas = document.getElementById('simCanvas');
    if (typeof canvasCtx !== 'undefined' && canvasCtx && canvasCtx.canvas === canvas &&
        canvas.isConnected && typeof drawSimulationCanvas === 'function') {
      drawSimulationCanvas();
    }
    try {
      if (window.AppState && AppState.chartInstance && AppState.chartInstance.update) {
        AppState.chartInstance.update();
      }
    } catch (e) {}
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('16px SourceHanSerifEmbedded'),
      document.fonts.load('bold 16px SourceHanSerifEmbedded')
    ]).then(function () { redraw(); setTimeout(redraw, 400); }).catch(function () {});
  }
})();
