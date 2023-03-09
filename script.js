const placeSound = new Howl({
  src: ['assets/place.wav']
});

let destroySound = new Howl({
  src: ['assets/destroy.wav']
});

let startSound = new Howl({
  src: ['assets/start.wav']
});

let winSound = new Howl({
  src: ['assets/win.wav']
});

let gameOverSound = new Howl({
  src: ['assets/game_over.wav']
});

let waterSound = new Howl({
  src: ['assets/water.wav']
});



const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
}

const reset = () => {
  board = null;
  timeRemaining = 5;
  score = 0;
  title.innerText = "Pipe Dream";
  scoreEle.innerText = "Score: 0";
  timeEle.innerText = "Time: 0";
  let queue = document.getElementById("queue");
  let grid = document.getElementById("grid");
  while (queue.lastChild) queue.removeChild(queue.lastChild);
  while (grid.lastChild) grid.removeChild(grid.lastChild);
  document.getElementById("start_button").hidden = false;
  clearInterval(secondInterval);
}

const win = () => {
  clearInterval(secondInterval);
  let title = document.getElementById("title");
  title.innerText = "You win!";
  winSound.play();
  document.getElementById("start_button").hidden = false;
}

const gameOver = () => {
  let title = document.getElementById("title");
  clearInterval(secondInterval);
  timeRemaining = 5;
  score = 0;
  title.innerText = "Game Over!";
  gameOverSound.play()
  setTimeout(() => {
    reset()
  }, 1000);
}

const randomPipe = (list) => {
  const r = Math.floor(Math.random() * list.length);
  return list[r];
}

class Board {
  constructor(n) {
    this.n = n;
    this.blocks = []

    for (let i = 0; i < n; i++) {
      this.blocks.push([])
      for (let j = 0; j < n; j++) {
        this.blocks[i].push(null);
      }
    }

    const pos_start = [rand(1, n - 1), rand(1, n - 1)];
    let pos_end = [rand(1, n - 1), rand(1, n - 1)];
    while (Math.abs(pos_start[0] - pos_end[0]) + Math.abs(pos_start[1] - pos_end[1]) < 2) {
      pos_end = [rand(1, n - 1), rand(1, n - 1)];
    }
    for (let i = 0; i < n; i++) {
      console.log(JSON.stringify(this.blocks));
      for (let j = 0; j < n; j++) {
        if (i == pos_start[0] && j == pos_start[1]) {
          this.blocks[i][j] = new Block(i, j, true, randomPipe(knubs), "grid", true, false);
          this.start = this.blocks[i][j];
        } else if (i == pos_end[0] && j == pos_end[1]) {
          this.blocks[i][j] = new Block(i, j, true, randomPipe(knubs), "grid", false, true);
          this.end = this.blocks[i][j];
        } else {
          this.blocks[i][j] = new Block(i, j, true);
        }
      }
    }

    this.queue = [];
    for (let i = 0; i < 5; i++) {
      this.queue.unshift(new Block(i, 0, false, randomPipe(pipes), "queue"));
    }

  }

  queuePop() {
    const ele = this.queue.pop();
    const Q = document.getElementById("queue");
    Q.removeChild(Q.children[Q.children.length - 1]);
    this.queue.unshift(new Block(0, 0, false, randomPipe(pipes), "queue"));
    return ele;
  }

  get(row, col) {
    if (row < 0 || row >= this.n || col < 0 || col >= this.n) return null;
    return this.blocks[row][col];
  }
}

class Pipe {
  constructor(name, pairs) {
    this.name = name;
    this.pairs = pairs
    this.start = false;
    this.end = false;
  }
}


class Block {
  constructor(row, column, clickable, pipeType = null, locationId = "grid", isStart = false, isEnd = false) {
    this.row = row;
    this.col = column;
    this.pipeType = pipeType;
    this.waterLevel = 0.0;
    this.flow = null;
    this.isStart = isStart;
    this.isEnd = isEnd;

    this.ele = document.createElement("div");
    this.ele.id = `${this.row},${this.col}`;
    this.img = document.createElement("img");
    if (this.pipeType)
      this.img.src = `assets/${this.pipeType.name}.png`
    this.ele.appendChild(this.img);
    if (clickable) {
      this.ele.onclick = () => this.click();
      this.ele.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.rightClick();
        return false;
      }, false);
    }
    const location = document.getElementById(locationId);
    if (locationId == "grid") {
      location.appendChild(this.ele);
    } else {
      location.insertBefore(this.ele, location.firstChild)
    }
  }

  click() {
    if (!this.pipeType) this.changePipe(board.queuePop().pipeType);
  }

  rightClick() {
    if (!this.pipeType || this.pipeType.name[0] == "k") return;
    if (this.score < 50) return;
    if (this.waterLevel > 0) return;
    destroySound.play()
    this.pipeType = null;
    const grid = document.getElementById("grid");
    for (let child of grid.children) {
      if (child.id == `${this.row},${this.col}`) {
        child.children[0].src = "";
      }
    }
  }

  changePipe(pipeType) {
    placeSound.play();
    this.pipeType = pipeType;
    const grid = document.getElementById("grid");
    for (let child of grid.children) {
      if (child.id == `${this.row},${this.col}`) {
        child.children[0].src = `assets/${this.pipeType.name}.png`;
      }
    }
  }

  enter(dir = this.pipeType.pairs[0][0]) {
    this.waterLevel = 0;
    for (let i in this.pipeType.pairs) {
      for (let j = 0; j < 2; j++) {
        if (this.pipeType.pairs[i][j][0] == dir[0] && this.pipeType.pairs[i][j][1] == dir[1])
          this.flow = [this.pipeType.pairs[i][j], this.pipeType.pairs[i][1 - j]];
      }
    }
    if (!this.flow) {
      gameOver();
      return;
    }
    let interval = setInterval(() => {
      this.waterLevel += 0.1;
      this.ele.style.backgroundColor = "blue";
      if (this.waterLevel >= 1.0) {
        this.exit()
        clearInterval(interval);
      }
    }, 200);
  }

  exit() {
    if (this.isEnd) {
      win()
      return;
    }
    const newBlock = board.get(this.row + this.flow[1][1], this.col + this.flow[1][0]);
    if (!newBlock || !newBlock.pipeType) {
      gameOver();
      return;
    }
    const exitReversed = [-this.flow[1][0], -this.flow[1][1]];
    newBlock.enter(exitReversed);
  }
}

const SIZE = 11;

const knubs = [
  new Pipe('knub-left', [[[1, 0], [-1, 0]]]),
  new Pipe('knub-right', [[[-1, 0], [1, 0]]]),
  new Pipe('knub-top', [[[0, 1], [0, -1]]]),
  new Pipe('knub-bottom', [[[0, -1], [0, 1]]]),
]

const pipes = [
  new Pipe('pipe-x', [[[-1, 0], [1, 0]]]),
  new Pipe('pipe-y', [[[0, -1], [0, 1]]]),
  new Pipe('pipe-x-y', [[[-1, 0], [1, 0]], [[0, -1], [0, 1]]]),
  new Pipe('pipe-top-left', [[[0, -1], [-1, 0]]]),
  new Pipe('pipe-top-right', [[[0, -1], [1, 0]]]),
  new Pipe('pipe-bottom-left', [[[0, 1], [-1, 0]]]),
  new Pipe('pipe-bottom-right', [[[0, 1], [1, 0]]]),
]

let board;

let score = 0;
const scoreEle = document.getElementById("score");

let secondInterval;
let timeRemaining = 5;
const timeEle = document.getElementById("time");
timeEle.innerText = `Time: ${timeRemaining}`;

const titleEle = document.getElementById("title");


const startGame = () => {
  reset()
  startSound.play()
  board = new Board(SIZE);
  document.getElementById("start_button").hidden = true;
  titleEle.innerText = "Pipe Dream";

  secondInterval = setInterval(() => {
    timeRemaining -= 1;
    if (timeRemaining >= 0) {
      timeEle.innerText = `Time: ${timeRemaining}`;
    }
    if (timeRemaining == 0) {
      waterSound.play();
      board.start.enter();
    } else if (timeRemaining < 0) {
      score += 50;
      scoreEle.innerText = `Score: ${score}`;
    }
  }, 1000);
}

