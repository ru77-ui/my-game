const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
// HTMLのスコア数字部分を取得
const scoreVal = document.getElementById('score-val') as HTMLSpanElement;

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let isPlaying = false;
let score = 0; // 💡 スコアを記録する変数

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}
let particles: Particle[] = [];

// サウンドシステム
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let bgmInterval: any;
let noteIndex = 0;

const melody = [
  659, 494, 523, 587, 523, 494, 440, 440, 523, 659, 587, 523, 494, 523, 587, 659,
  523, 440, 440, 0, 587, 698, 880, 784, 698, 659, 523, 659, 587, 523, 494, 494, 523, 587, 659, 523, 440, 440
];

function playClearSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playGameOverSound() {
  const gameOverMelody = [392, 349, 311, 294, 261, 0];
  let goIndex = 0;
  const goInterval = setInterval(() => {
    if (goIndex >= gameOverMelody.length) {
      clearInterval(goInterval);
      return;
    }
    const freq = gameOverMelody[goIndex];
    if (freq > 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
    goIndex++;
  }, 300);
}

function startBGM() {
  if (bgmInterval) return;
  bgmInterval = setInterval(() => {
    if (!isPlaying) return;
    const freq = melody[noteIndex % melody.length];
    if (freq > 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
    noteIndex++;
  }, 220);
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function createExplosion(row: number, color: string) {
  for (let c = 0; c < COLS; c++) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: c * BLOCK_SIZE + BLOCK_SIZE / 2,
        y: row * BLOCK_SIZE + BLOCK_SIZE / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        size: Math.random() * 5 + 3,
        color: color,
        alpha: 1
      });
    }
  }
}

const SHAPES = [
  [[1, 1, 1, 1]], [[1, 1, 1], [0, 1, 0]], [[1, 1], [1, 1]],
  [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]]
];
const COLORS = ['#4fd1c5', '#b794f4', '#f6e05e', '#e53e3e', '#48bb78', '#ed8936', '#3182ce'];
const board: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let currentPiece = getRandomPiece();
let pieceX = 3;
let pieceY = 0;

function getRandomPiece() {
  const id = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[id], color: COLORS[id] };
}

function canMove(nextX: number, nextY: number, pieceShape: number[][]): boolean {
  for (let r = 0; r < pieceShape.length; r++) {
    for (let c = 0; c < pieceShape[r].length; c++) {
      if (pieceShape[r][c] === 1) {
        const targetX = nextX + c;
        const targetY = nextY + r;
        if (targetX < 0 || targetX >= COLS || targetY >= ROWS) return false;
        if (targetY >= 0 && board[targetY][targetX] !== 0) return false;
      }
    }
  }
  return true;
}

// 💡 スコア計算付きのライン消去関数
function clearLines() {
  let clearedCount = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(value => value !== 0)) {
      const sampleColor = board[r][0] !== 0 ? (board[r][0] as any) : '#ffffff';
      createExplosion(r, sampleColor);
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      clearedCount++;
      r++;
    }
  }
  
  if (clearedCount > 0) {
    playClearSound();

    // 消したスコアの計算（まとめて消すほど高得点！）
    if (clearedCount === 1) score += 100;
    else if (clearedCount === 2) score += 300;
    else if (clearedCount === 3) score += 500;
    else if (clearedCount === 4) score += 800; // テトリス！

    // HTMLの数字を最新のスコアに書き換える
    scoreVal.textContent = score.toString();
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) {
        ctx.fillStyle = board[r][c] as any;
        ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
      } else {
        ctx.strokeStyle = '#252525';
        ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }

  if (isPlaying) {
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c] === 1) {
          ctx.fillStyle = currentPiece.color;
          ctx.fillRect((pieceX + c) * BLOCK_SIZE, (pieceY + r) * BLOCK_SIZE, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        }
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (isPlaying) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.alpha -= 0.02;
    }
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  if (!isPlaying && startBtn.textContent === '再開') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSE', canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(update);
}

startBtn.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  isPlaying = true;
  startBGM();
  startBtn.disabled = true;
  pauseBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
  isPlaying = false;
  stopBGM();
  startBtn.textContent = '再開';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
});

window.addEventListener('keydown', (event) => {
  if (!isPlaying) return;

  if (event.key === 'ArrowLeft' && canMove(pieceX - 1, pieceY, currentPiece.shape)) {
    pieceX--;
  } else if (event.key === 'ArrowRight' && canMove(pieceX + 1, pieceY, currentPiece.shape)) {
    pieceX++;
  } else if (event.key === 'ArrowDown' && canMove(pieceX, pieceY + 1, currentPiece.shape)) {
    pieceY++;
  } else if (event.key === 'ArrowUp') {
    const rotated = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map(row => row[index]).reverse()
    );
    if (canMove(pieceX, pieceY, rotated)) currentPiece.shape = rotated;
  }
});

setInterval(() => {
  if (!isPlaying) return;

  if (canMove(pieceX, pieceY + 1, currentPiece.shape)) {
    pieceY++;
  } else {
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c] === 1) {
          board[pieceY + r][pieceX + c] = currentPiece.color as any;
        }
      }
    }
    clearLines();
    currentPiece = getRandomPiece();
    pieceX = 3;
    pieceY = 0;

    if (!canMove(pieceX, pieceY, currentPiece.shape)) {
      isPlaying = false;
      stopBGM();
      playGameOverSound();
      alert('ゲームオーバー！');
      
      // 💡 ゲームオーバー時にスコアもゼロにリセット
      score = 0;
      scoreVal.textContent = '0';

      for (let r = 0; r < ROWS; r++) board[r].fill(0);
      startBtn.textContent = 'スタート';
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    }
  }
}, 1000);

update();