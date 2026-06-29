const GRID_SIZE = 16;
const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const statusEl = document.getElementById("status");
const startButton = document.getElementById("startButton");

let cells = [];
let snake = [];
let apple = { x: 0, y: 0 };
let currentPineapple = null;
const obstacles = [
  { x: 3, y: 3 },
  { x: 5, y: 5 },
  { x: 10, y: 8 },
  { x: 12, y: 4 },
  { x: 7, y: 11 },
  { x: 2, y: 10 },
  { x: 13, y: 12 },
  { x: 9, y: 2 },
  { x: 6, y: 7 },
  { x: 11, y: 11 },
];
let currentDirection = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let gameInterval = null;
let pineappleTimeout = null;
let score = 0;
let gameOver = false;
let currentIntervalDelay = 220;
let highScore = Number(localStorage.getItem("snake-high-score") || 0);

function buildBoard() {
  board.innerHTML = "";
  cells = [];

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    board.appendChild(cell);
    cells.push(cell);
  }
}

function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snake-high-score", String(highScore));
  }
  highScoreEl.textContent = String(highScore);
}

function isObstacle(position) {
  return obstacles.some((obstacle) => obstacle.x === position.x && obstacle.y === position.y);
}

function getRandomEmptyPosition() {
  let candidate = null;

  do {
    candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (
    snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y) ||
    (apple.x === candidate.x && apple.y === candidate.y) ||
    (currentPineapple && currentPineapple.x === candidate.x && currentPineapple.y === candidate.y) ||
    isObstacle(candidate)
  );

  return candidate;
}

function spawnApple() {
  apple = getRandomEmptyPosition();
}

function clearPineapple() {
  if (pineappleTimeout) {
    clearTimeout(pineappleTimeout);
    pineappleTimeout = null;
  }
  currentPineapple = null;
}

function spawnPineapple() {
  if (currentPineapple || score % 10 !== 0) {
    return;
  }

  currentPineapple = getRandomEmptyPosition();
  pineappleTimeout = window.setTimeout(() => {
    currentPineapple = null;
    renderBoard();
  }, 15000);
}

function shrinkSnake(amount) {
  if (snake.length > amount) {
    snake.splice(snake.length - amount, amount);
  } else {
    snake = [snake[0]];
  }
}

function getDirectionClass() {
  if (currentDirection.x === 1) {
    return "right";
  }
  if (currentDirection.x === -1) {
    return "left";
  }
  if (currentDirection.y === 1) {
    return "down";
  }
  return "up";
}

function renderBoard() {
  cells.forEach((cell) => {
    cell.className = "cell";
    cell.innerHTML = "";
    // clear inline background so we can reapply current color on render
    cell.style.background = "";
  });

  snake.forEach((segment, index) => {
    const cell = cells[segment.y * GRID_SIZE + segment.x];
    cell.classList.add("snake");
    if (index === 0) {
      cell.classList.add("snake-head");
      const tongue = document.createElement("span");
      tongue.className = `tongue ${getDirectionClass()}`;
      const leftEye = document.createElement("span");
      leftEye.className = "eye eye-left";
      const rightEye = document.createElement("span");
      rightEye.className = "eye eye-right";
      cell.appendChild(tongue);
      cell.appendChild(leftEye);
      cell.appendChild(rightEye);
    }
    // Apply the blue snake gradient directly so the render is consistent across reloads.
    try {
      cell.style.background = index === 0 ? 'var(--snake-head)' : 'var(--snake-body)';
    } catch (e) {
      // ignore
    }
  });

  obstacles.forEach((obstacle) => {
    const obstacleCell = cells[obstacle.y * GRID_SIZE + obstacle.x];
    obstacleCell.classList.add("obstacle");
  });

  const appleCell = cells[apple.y * GRID_SIZE + apple.x];
  appleCell.classList.add("apple");

  if (currentPineapple) {
    const pineappleCell = cells[currentPineapple.y * GRID_SIZE + currentPineapple.x];
    pineappleCell.classList.add("pineapple");
  }
}

function step() {
  if (gameOver) {
    return;
  }

  currentDirection = nextDirection;
  const head = snake[0];
  const nextHead = wrapPosition({
    x: head.x + currentDirection.x,
    y: head.y + currentDirection.y,
  });

  const hitObstacle = isObstacle(nextHead);

  if (collidesWithBody(nextHead) || hitObstacle) {
    gameOver = true;
    statusEl.textContent = hitObstacle ? "You got out!" : "Game Over";
    clearInterval(gameInterval);
    renderBoard();
    return;
  }

  snake.unshift(nextHead);

  const ateApple = nextHead.x === apple.x && nextHead.y === apple.y;
  const atePineapple = currentPineapple && nextHead.x === currentPineapple.x && nextHead.y === currentPineapple.y;

  if (ateApple) {
    score += 1;
    scoreEl.textContent = String(score);
    updateHighScore();
    spawnApple();

    if (score % 3 === 0 && currentIntervalDelay > 70) {
      currentIntervalDelay -= 15;
      restartGameLoop();
    }

    if (score % 10 === 0) {
      spawnPineapple();
    }
  } else if (atePineapple) {
    clearPineapple();
    shrinkSnake(2);
  } else {
    snake.pop();
  }

  renderBoard();
}

function isOutOfBounds(position) {
  return position.x < 0 || position.x >= GRID_SIZE || position.y < 0 || position.y >= GRID_SIZE;
}

function wrapPosition(position) {
  return {
    x: (position.x + GRID_SIZE) % GRID_SIZE,
    y: (position.y + GRID_SIZE) % GRID_SIZE,
  };
}

function collidesWithBody(nextHead) {
  const bodyWithoutTail = snake.slice(0, -1);
  return bodyWithoutTail.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
}

function setDirection(newDirection) {
  if (gameOver) {
    return;
  }

  const isOpposite =
    newDirection.x === -currentDirection.x && newDirection.y === -currentDirection.y;

  if (!isOpposite) {
    nextDirection = newDirection;
  }
}

function restartGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
  }

  gameInterval = setInterval(step, currentIntervalDelay);
}

function startGame() {
  if (gameInterval) {
    clearInterval(gameInterval);
  }

  snake = [
    { x: 1, y: 8 },
    { x: 0, y: 8 },
    { x: 15, y: 8 },
  ];
  currentDirection = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  currentIntervalDelay = 220;
  scoreEl.textContent = "0";
  updateHighScore();
  statusEl.textContent = "Playing";
  clearPineapple();
  spawnApple();
  renderBoard();
  restartGameLoop();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowup", "w"].includes(key)) {
    event.preventDefault();
    setDirection({ x: 0, y: -1 });
  } else if (["arrowdown", "s"].includes(key)) {
    event.preventDefault();
    setDirection({ x: 0, y: 1 });
  } else if (["arrowleft", "a"].includes(key)) {
    event.preventDefault();
    setDirection({ x: -1, y: 0 });
  } else if (["arrowright", "d"].includes(key)) {
    event.preventDefault();
    setDirection({ x: 1, y: 0 });
  }
});

startButton.addEventListener("click", startGame);

buildBoard();
startGame();
