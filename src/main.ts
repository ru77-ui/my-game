// HTMLから画用紙（Canvas）を取得する
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

// 試しに、Canvasの中に赤い四角形（ブロック）を1つ描いてみる
if (ctx) {
  ctx.fillStyle = 'red';
  // fillRect(X座標, Y座標, 横幅, 縦幅)
  ctx.fillRect(30, 30, 30, 30);
}