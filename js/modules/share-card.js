// share-card.js — canvas 分享卡生成
// 把"本命嘉豪 + 豪意值 + 豪型代码 + 骚话"画成一张可保存发朋友圈的图
const ShareCard = (function () {

  // 加载图片，失败 reject（用于分享卡回退 emoji）
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * @param {Object} result evaluate() 的结果 { label, haoyi, code, tierKey }
   * @param {Object} opts { nickname }
   * @returns {Promise<HTMLCanvasElement>}
   */
  async function generate(result, opts) {
    opts = opts || {};
    const W = 750, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const tier = window.Labels.tier(result.tierKey);
    const label = result.label;

    // 背景：糖果渐变 + 稀有度色调
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FFF5F7');
    grad.addColorStop(1, '#FFE8F0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 顶部装饰圆
    ctx.fillStyle = (tier.color || '#FFB400') + '22';
    ctx.beginPath(); ctx.arc(W / 2, 180, 320, 0, Math.PI * 2); ctx.fill();

    // 标题
    drawText(ctx, '我的本命嘉豪', W / 2, 90, { font: 'bold 40px "ZCOOL KuaiLe",sans-serif', color: '#7C3AED', align: 'center' });

    // 稀有度星
    drawText(ctx, tier.stars || '', W / 2, 150, { font: '30px sans-serif', color: tier.color || '#FFB400', align: 'center' });

    // 标签 emoji 大圆
    ctx.save();
    ctx.fillStyle = '#fff';
    roundedRect(ctx, W / 2 - 200, 200, 400, 400, 40);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    ctx.strokeStyle = tier.color || '#FFB400'; ctx.lineWidth = 6;
    roundedRect(ctx, W / 2 - 200, 200, 400, 400, 40); ctx.stroke();
    ctx.restore();
    // 标签图：有图异步加载后绘制（cover 适配），失败/无图回退 emoji
    const useImg = label.img && label.img !== 'emoji';
    if (useImg) {
      try {
        const img = await loadImage('img/labels/' + label.img);
        // cover 方式绘制到 360x360 圆心区域（白底圆角框内）
        const bx = W / 2 - 180, by = 220, bw = 360, bh = 360;
        const scale = Math.max(bw / img.width, bh / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.save();
        ctx.beginPath();
        roundedRect(ctx, bx, by, bw, bh, 32);
        ctx.clip();
        ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
        ctx.restore();
      } catch (e) {
        drawText(ctx, label.emoji || '😎', W / 2, 440, { font: '180px sans-serif', align: 'center' });
      }
    } else {
      drawText(ctx, label.emoji || '😎', W / 2, 440, { font: '180px sans-serif', align: 'center' });
    }

    // 标签名
    drawText(ctx, label.name, W / 2, 660, { font: 'bold 56px "ZCOOL KuaiLe",sans-serif', color: '#222', align: 'center' });

    // 豪意值大数字（保留 3 位小数，字号随位数自适应避免溢出）
    const haoyiStr = Number(result.haoyi.value).toFixed(3);
    const fontSize = haoyiStr.length > 5 ? 72 : 90;  // 带小数时缩小字号
    drawText(ctx, '豪意值', W / 2, 740, { font: '28px sans-serif', color: '#888', align: 'center' });
    drawText(ctx, haoyiStr, W / 2, 820, { font: 'bold ' + fontSize + 'px "ZCOOL KuaiLe",sans-serif', color: tier.color || '#FFB400', align: 'center' });

    // 豪型代码
    drawText(ctx, '豪型 ' + result.code, W / 2, 890, { font: 'bold 32px monospace', color: '#7C3AED', align: 'center' });

    // 底部水印
    drawText(ctx, '测测你的本命嘉豪 →', W / 2, 1000, { font: '26px sans-serif', color: '#aaa', align: 'center' });

    return canvas;
  }

  function drawText(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.font = opts.font || '24px sans-serif';
    ctx.fillStyle = opts.color || '#333';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'middle';
    ctx.fillText(text, x, y);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** 下载 canvas 为 png */
  function download(canvas, filename) {
    const a = document.createElement('a');
    a.download = filename || 'wo-de-ben-ming-jiahao.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  return { generate, download };
})();
window.ShareCard = ShareCard;
