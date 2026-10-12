/**
 * Cyber Tetris - Core Game Engine
 * Features: 7-bag randomizer, Ghost piece, Hold system, Particle FX,
 * SRS Wall Kicks, Screen Shake, DAS input handling, High score.
 */

// --- Constants & Configurations ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 300x600 canvas

// Standard Tetromino definitions (matrices)
const PIECES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.7)'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0066ff',
    glow: 'rgba(0, 102, 255, 0.7)'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#ff7700',
    glow: 'rgba(255, 119, 0, 0.7)'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#ffe600',
    glow: 'rgba(255, 230, 0, 0.7)'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#39ff14',
    glow: 'rgba(57, 255, 20, 0.7)'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#b026ff',
    glow: 'rgba(176, 38, 255, 0.7)'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#ff2a85',
    glow: 'rgba(255, 42, 133, 0.7)'
  }
};

const PIECE_KEYS = Object.keys(PIECES);

// --- Particle System for Line Clears ---
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 4 + 3;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.02;
    this.gravity = 0.25;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

// --- Game Engine Class ---
class TetrisGame {
  constructor() {
    // Canvas contexts
    this.canvas = document.getElementById('tetris-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.boardFrame = document.getElementById('board-frame');

    // UI elements
    this.scoreEl = document.getElementById('current-score');
    this.highScoreEl = document.getElementById('high-score');
    this.linesEl = document.getElementById('lines-count');
    this.levelEl = document.getElementById('level-count');
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalLinesEl = document.getElementById('final-lines');
    this.finalLevelEl = document.getElementById('final-level');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.soundBtn = document.getElementById('btn-sound');
    this.musicBtn = document.getElementById('btn-music');

    // Game states
    this.grid = this.createGrid();
    this.bag = [];
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextPieces = [];

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.highScore = parseInt(localStorage.getItem('cyber_tetris_highscore') || '0', 10);
    this.highScoreEl.innerText = this.highScore.toLocaleString();

    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;

    this.dropCounter = 0;
    this.dropInterval = 1000;
    this.lastTime = 0;
    this.particles = [];

    // DAS (Delayed Auto Shift) key states
    this.keys = {};
    this.dasTimers = {};

    this.initEvents();
    this.drawInitialScreen();
  }

  createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  // 7-Bag Randomizer
  refillBag() {
    const bag = [...PIECE_KEYS];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.bag.push(...bag);
  }

  getNextPieceKey() {
    if (this.bag.length < 5) {
      this.refillBag();
    }
    return this.bag.shift();
  }

  createPiece(type) {
    const proto = PIECES[type];
    return {
      type: type,
      shape: proto.shape.map(row => [...row]),
      color: proto.color,
      glow: proto.glow,
      x: Math.floor(COLS / 2) - Math.ceil(proto.shape[0].length / 2),
      y: 0
    };
  }

  // --- Start & Reset ---
  startGame() {
    soundEngine.ensureContext();
    this.grid = this.createGrid();
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropCounter = 0;
    this.particles = [];
    this.holdPiece = null;
    this.canHold = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.isPlaying = true;

    // Fill next queue with 3 pieces
    this.nextPieces = [
      this.getNextPieceKey(),
      this.getNextPieceKey(),
      this.getNextPieceKey()
    ];
    this.spawnPiece();

    this.updateUI();
    this.startOverlay.classList.remove('active');
    this.pauseOverlay.classList.remove('active');
    this.gameoverOverlay.classList.remove('active');
    this.newRecordBadge.classList.remove('show');

    if (soundEngine.musicEnabled) {
      soundEngine.startMusic();
    }

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  spawnPiece() {
    const nextKey = this.nextPieces.shift();
    this.nextPieces.push(this.getNextPieceKey());
    this.currentPiece = this.createPiece(nextKey);
    this.canHold = true;

    // Check immediate collision -> Game Over
    if (this.collide(this.currentPiece)) {
      this.gameOver();
    }

    this.drawHold();
    this.drawNext();
  }

  // --- Collision Detection ---
  collide(piece, offsetX = 0, offsetY = 0) {
    const { shape, x, y } = piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const newX = x + c + offsetX;
          const newY = y + r + offsetY;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && this.grid[newY][newX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Movement & Wall Kicks ---
  move(dir) {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;
    if (!this.collide(this.currentPiece, dir, 0)) {
      this.currentPiece.x += dir;
      soundEngine.playMove();
    }
  }

  softDrop() {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;
    if (!this.collide(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      this.score += 1;
      this.updateUI();
      this.dropCounter = 0;
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;
    let dropDistance = 0;
    while (!this.collide(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      dropDistance++;
    }
    this.score += dropDistance * 2;
    this.updateUI();
    soundEngine.playHardDrop();
    this.triggerShake(false);
    this.lockPiece();
  }

  rotate(clockwise = true) {
    if (!this.isPlaying || this.isPaused || this.isGameOver) return;
    const matrix = this.currentPiece.shape;
    const N = matrix.length;
    const rotated = matrix.map((row, i) =>
      row.map((val, j) => (clockwise ? matrix[N - 1 - j][i] : matrix[j][N - 1 - i]))
    );

    const prevShape = this.currentPiece.shape;
    this.currentPiece.shape = rotated;

    // Wall Kick Offsets test: [0, +1, -1, +2, -2]
    const kicks = [0, 1, -1, 2, -2];
    let success = false;

    for (let kick of kicks) {
      if (!this.collide(this.currentPiece, kick, 0)) {
        this.currentPiece.x += kick;
        success = true;
        break;
      }
    }

    if (!success) {
      // Revert if cannot rotate
      this.currentPiece.shape = prevShape;
    } else {
      soundEngine.playRotate();
    }
  }

  hold() {
    if (!this.isPlaying || this.isPaused || this.isGameOver || !this.canHold) return;

    soundEngine.playHold();
    const currentType = this.currentPiece.type;

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      this.currentPiece = this.createPiece(temp);
    }

    this.canHold = false;
    this.drawHold();
  }

  // --- Lock Piece & Clear Lines ---
  lockPiece() {
    const { shape, x, y, color } = this.currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const gridY = y + r;
          const gridX = x + c;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            this.grid[gridY][gridX] = color;
          }
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let clearedCount = 0;
    const clearedRows = [];

    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== 0)) {
        clearedRows.push(r);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      // Spawn particles
      clearedRows.forEach(rowY => {
        for (let colX = 0; colX < COLS; colX++) {
          const color = this.grid[rowY][colX];
          for (let p = 0; p < 4; p++) {
            this.particles.push(
              new Particle(
                colX * BLOCK_SIZE + BLOCK_SIZE / 2,
                rowY * BLOCK_SIZE + BLOCK_SIZE / 2,
                color
              )
            );
          }
        }
      });

      // Remove lines
      for (let i = 0; i < clearedRows.length; i++) {
        const rowIndex = clearedRows[i] + i; // Offset because rows shift
        this.grid.splice(rowIndex, 1);
        this.grid.unshift(Array(COLS).fill(0));
      }

      // Calculate score
      const lineScores = [0, 100, 300, 500, 800];
      const points = (lineScores[clearedCount] || 1000) * this.level;
      this.score += points;
      this.lines += clearedCount;

      // Level up every 10 lines
      const prevLevel = this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(90, 1000 - (this.level - 1) * 85);

      if (clearedCount === 4) {
        soundEngine.playTetrisClear();
        this.triggerShake(true);
      } else {
        soundEngine.playClear();
      }

      this.updateUI();
    }
  }

  // --- Ghost Piece Calculation ---
  getGhostPiece() {
    if (!this.currentPiece) return null;
    const ghost = {
      shape: this.currentPiece.shape,
      color: this.currentPiece.color,
      x: this.currentPiece.x,
      y: this.currentPiece.y
    };

    while (!this.collide(ghost, 0, 1)) {
      ghost.y += 1;
    }
    return ghost;
  }

  // --- Visual Shake ---
  triggerShake(isTetris = false) {
    this.boardFrame.classList.remove('shake');
    void this.boardFrame.offsetWidth; // Reflow
    this.boardFrame.classList.add('shake');
    setTimeout(() => {
      this.boardFrame.classList.remove('shake');
    }, 280);
  }

  // --- Game Over & Pause ---
  pauseGame() {
    if (!this.isPlaying || this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.pauseOverlay.classList.add('active');
      soundEngine.stopMusic();
    } else {
      this.pauseOverlay.classList.remove('active');
      this.lastTime = performance.now();
      if (soundEngine.musicEnabled) {
        soundEngine.startMusic();
      }
      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.isPlaying = false;
    soundEngine.stopMusic();
    soundEngine.playGameOver();

    // Check High Score
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('cyber_tetris_highscore', this.highScore.toString());
      this.highScoreEl.innerText = this.highScore.toLocaleString();
      this.newRecordBadge.classList.add('show');
    } else {
      this.newRecordBadge.classList.remove('show');
    }

    this.finalScoreEl.innerText = this.score.toLocaleString();
    this.finalLinesEl.innerText = this.lines;
    this.finalLevelEl.innerText = this.level;
    this.gameoverOverlay.classList.add('active');
  }

  // --- Game Loop ---
  gameLoop(time = 0) {
    if (!this.isPlaying || this.isPaused) return;

    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    this.dropCounter += deltaTime;
    if (this.dropCounter > this.dropInterval) {
      if (!this.collide(this.currentPiece, 0, 1)) {
        this.currentPiece.y += 1;
      } else {
        this.lockPiece();
      }
      this.dropCounter = 0;
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // --- Rendering ---
  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#05060b';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle background grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * BLOCK_SIZE, 0);
      this.ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * BLOCK_SIZE);
      this.ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
      this.ctx.stroke();
    }

    // Draw Locked Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] !== 0) {
          this.drawBlock(this.ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, this.grid[r][c]);
        }
      }
    }

    // Draw Ghost Piece
    const ghost = this.getGhostPiece();
    if (ghost && this.currentPiece) {
      const { shape, x, y, color } = ghost;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            this.drawGhostBlock(this.ctx, (x + c) * BLOCK_SIZE, (y + r) * BLOCK_SIZE, color);
          }
        }
      }
    }

    // Draw Active Piece
    if (this.currentPiece) {
      const { shape, x, y, color } = this.currentPiece;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            this.drawBlock(this.ctx, (x + c) * BLOCK_SIZE, (y + r) * BLOCK_SIZE, color);
          }
        }
      }
    }

    // Draw Particles
    this.particles.forEach(p => p.draw(this.ctx));
  }

  drawBlock(ctx, px, py, color, size = BLOCK_SIZE) {
    const radius = 3;
    ctx.save();

    // Block Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    this.roundRect(ctx, px + 1, py + 1, size - 2, size - 2, radius);
    ctx.fill();

    // Inner Bevel Highlight (top & left)
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(px + 2, py + 2, size - 4, 3);
    ctx.fillRect(px + 2, py + 2, 3, size - 4);

    // Inner Shadow (bottom & right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(px + 2, py + size - 5, size - 4, 3);
    ctx.fillRect(px + size - 5, py + 2, 3, size - 4);

    // Outer border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, px + 1, py + 1, size - 2, size - 2, radius);
    ctx.stroke();

    ctx.restore();
  }

  drawGhostBlock(ctx, px, py, color, size = BLOCK_SIZE) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    this.roundRect(ctx, px + 2, py + 2, size - 4, size - 4, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // --- Side Panels (Hold & Next) ---
  drawHold() {
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (!this.holdPiece) return;

    const piece = PIECES[this.holdPiece];
    const size = 20;
    const shape = piece.shape;
    const w = shape[0].length * size;
    const h = shape.length * size;
    const offsetX = (this.holdCanvas.width - w) / 2;
    const offsetY = (this.holdCanvas.height - h) / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          this.drawBlock(this.holdCtx, offsetX + c * size, offsetY + r * size, piece.color, size);
        }
      }
    }
  }

  drawNext() {
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const size = 18;

    this.nextPieces.forEach((type, index) => {
      const piece = PIECES[type];
      const shape = piece.shape;
      const w = shape[0].length * size;
      const offsetX = (this.nextCanvas.width - w) / 2;
      const offsetY = 20 + index * 85;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            this.drawBlock(this.nextCtx, offsetX + c * size, offsetY + r * size, piece.color, size);
          }
        }
      }
    });
  }

  drawInitialScreen() {
    this.ctx.fillStyle = '#05060b';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateUI() {
    this.scoreEl.innerText = this.score.toLocaleString();
    this.linesEl.innerText = this.lines;
    this.levelEl.innerText = this.level;
  }

  // --- Controls & Event Listeners ---
  initEvents() {
    // Keyboard DAS (Delayed Auto Shift)
    window.addEventListener('keydown', (e) => {
      // Audio resume on first key
      soundEngine.ensureContext();

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.repeat) return; // Prevent raw OS repeat, we use custom DAS
      this.keys[e.code] = true;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.move(-1);
          this.startDAS('left', () => this.move(-1));
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.move(1);
          this.startDAS('right', () => this.move(1));
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.softDrop();
          this.startDAS('down', () => this.softDrop(), 60, 45);
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.rotate(true);
          break;
        case 'KeyZ':
          this.rotate(false);
          break;
        case 'Space':
          this.hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          this.hold();
          break;
        case 'KeyP':
        case 'Escape':
          this.pauseGame();
          break;
        case 'KeyM':
          this.toggleSoundUI();
          break;
        case 'KeyR':
          this.startGame();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.stopDAS('left');
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.stopDAS('right');
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.stopDAS('down');
    });

    // Button Listeners
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-play-again').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.pauseGame());
    document.getElementById('btn-restart-pause').addEventListener('click', () => this.startGame());
    document.getElementById('btn-quick-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-pause-header').addEventListener('click', () => this.pauseGame());

    this.soundBtn.addEventListener('click', () => this.toggleSoundUI());
    this.musicBtn.addEventListener('click', () => this.toggleMusicUI());

    // Virtual On-Screen Controls
    const addHoldAction = (id, action) => {
      const el = document.getElementById(id);
      let timer = null;
      let interval = null;

      const start = (e) => {
        e.preventDefault();
        soundEngine.ensureContext();
        action();
        timer = setTimeout(() => {
          interval = setInterval(action, 60);
        }, 180);
      };

      const stop = () => {
        clearTimeout(timer);
        clearInterval(interval);
      };

      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', stop);
      el.addEventListener('mouseleave', stop);
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', stop);
    };

    addHoldAction('v-left', () => this.move(-1));
    addHoldAction('v-right', () => this.move(1));
    addHoldAction('v-down', () => this.softDrop());

    document.getElementById('v-rotate').addEventListener('click', () => {
      soundEngine.ensureContext();
      this.rotate(true);
    });

    document.getElementById('v-hard-drop').addEventListener('click', () => {
      soundEngine.ensureContext();
      this.hardDrop();
    });

    document.getElementById('v-hold').addEventListener('click', () => {
      soundEngine.ensureContext();
      this.hold();
    });
  }

  startDAS(name, action, initialDelay = 160, repeatRate = 45) {
    this.stopDAS(name);
    this.dasTimers[name] = setTimeout(() => {
      this.dasTimers[name] = setInterval(action, repeatRate);
    }, initialDelay);
  }

  stopDAS(name) {
    if (this.dasTimers[name]) {
      clearTimeout(this.dasTimers[name]);
      clearInterval(this.dasTimers[name]);
      delete this.dasTimers[name];
    }
  }

  toggleSoundUI() {
    const isEnabled = soundEngine.toggleSound();
    this.soundBtn.classList.toggle('muted', !isEnabled);
    this.soundBtn.querySelector('.icon').innerText = isEnabled ? '🔊' : '🔇';
  }

  toggleMusicUI() {
    const isEnabled = soundEngine.toggleMusic();
    this.musicBtn.classList.toggle('muted', !isEnabled);
    this.musicBtn.querySelector('.icon').innerText = isEnabled ? '🎵' : '🎶';
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new TetrisGame();
});
