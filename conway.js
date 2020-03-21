const CELL_WIDTH   = 8
const CELL_HEIGHT  = 8
const CELL_PADDING = 0.9

// ---
//  Helper
// ---

const RecurringTimer = function(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date() - start;
    };

    var resume = function(ms) {
        start = new Date();
        timerId = window.setTimeout(function() {
            remaining = delay;
            resume(ms);
            callback();
        }, ms);
    };

    this.resume = resume;
}


// ---
//  Game code
// ---

class Game {
	static INTERVAL_NORMAL = 50;
	static INTERVAL_DEBUG = 500;

	static MODE_APPLY = 0;
	static MODE_TRANSITION = 1;
	static MODE_SINGLE = -1;

	constructor(width, height) {
		this.startBtn = document.getElementById("start");
		this.debugBtn = document.getElementById("debug");
		grid.initializeGrid(width, height);
		this.reset();
	}

	randomizeCellStates() {
		for (let i = 0; i<grid.cols; i++) {
			for (let j = 0; j<grid.rows; j++) {
				parseInt(Math.random() * 100) % 5 == 0 ? grid.markAlive(i, j) : grid.markDead(i, j);
			}
		}
		this.updateTitle();
	}

	updateTitle() {
		document.getElementById('track').innerText = grid.track.size;
		document.getElementById('generation').innerText = this.generation;		
	}

	start() {
		this.timer = new RecurringTimer(() => {
			this.tick();
		}, this.interval);
	}

	stop() {
		if (this.timer) {
			this.timer.pause();
		}
		this.isResuming = false;
		this.startBtn.innerText = 'start';
	}

	resume() {
		this.timer.resume(this.interval);
		this.isResuming = true;
		this.startBtn.innerText = 'stop';
	}

	tick() {
		this.generation = grid.tick(this.generation, this.mode);
		if (this.mode != Game.MODE_SINGLE) {
			this.mode = this.mode == Game.MODE_APPLY ? Game.MODE_TRANSITION : Game.MODE_APPLY;
		}
		this.updateTitle();
	}

	reset() {
		this.stop();
		grid.clear();
		this.interval = Game.INTERVAL_NORMAL;
		this.mode = Game.MODE_SINGLE;
		this.generation = 0;
		this.showIntermediateState = false;
		this.debugBtn.classList.remove('active');
		this.updateTitle();
		this.randomizeCellStates();
	}

	toggleResume() {
		this.showIntermediateState = false;
		this.isResuming ? this.stop() : this.resume();
	}

	toggleInspect() {
		this.stop();
		this.showIntermediateState ?  grid.refresh() : grid.applyRules();
		this.showIntermediateState = !this.showIntermediateState;
	}

	toggleDebugMode(el) {
		if (this.mode == Game.MODE_SINGLE) {
			this.mode = Game.MODE_APPLY;
			this.stop();
			this.interval = Game.INTERVAL_DEBUG;
			this.resume();
		} else {
			this.mode = Game.MODE_SINGLE;
			this.stop();
			this.interval = Game.INTERVAL_NORMAL;
			this.resume();
		}
		el.classList.toggle('active');
	}

	step() {		
		this.stop();
		this.tick(Game.MODE_SINGLE);
		this.showIntermediateState = false;
	}

	seed() {
		this.reset();
	}
}


class Grid {
	initializeGrid(cols, rows) {
		this.cols = cols;
		this.rows = rows;
		this.track = new Set(); // only track relevant cells
		this.cells = new Array(this.cols);
		for (let i = 0; i < this.cols; i++) {
			this.cells[i] = new Array(this.rows);
			for (let j = 0; j < this.rows; j++) {
				this.cells[i][j] = this.addToTracking(new Cell(i, j));
			}
		}
		graphics.drawGrid();
		this.refresh();		
	}

	tick(generation, mode) {
		switch(mode) {
			case Game.MODE_SINGLE:
				this.applyRules();
				this.transition();
				this.refresh();
				generation++;
				break;
			case Game.MODE_APPLY:
				this.applyRules();	
				break;
			case Game.MODE_TRANSITION:
				this.transition();
				this.refresh();
				generation++;
				break;
		}
		return generation;
	}

	applyRules() {
		this.track.forEach(cell => {
			cell.applyRules();
		});
	}

	transition() {
		this.track.forEach(cell => {
			cell.transition();
		});
	}	

	refresh() {
		this.track.forEach(cell => {
			cell.visualize();
			if ((!cell.alive) && cell.neighbours.size < 3) {
				this.track.delete(cell);
			}
		})
	}

	addToTracking(cell) {
		this.track.add(cell);
		return cell;
	}

	markAlive(x, y) {
		this.addToTracking(this.cells[x][y].markAlive());
	}

	markDead(x, y) {
		this.addToTracking(this.cells[x][y].markDead());
	}

	toggleAlive(x, y) {
		return this.cells[x][y].toggleAlive();
	}

	clear() {
		this.track.clear();
	}

	withAllNeighbours(cell, cb) {
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				let x = this.wrap(cell.x + i, this.cols);
				let y = this.wrap(cell.y + j, this.rows);
				let neighbour = this.cells[x][y];
				if (cell != neighbour) {
					this.addToTracking(neighbour);
					cb(neighbour);
				}
			}
		}
	}

	wrap(n, max) {
		if (n < 0) {
			n = max - 1;
		} else if (n > max - 1) {
			n = 0
		}
		return n;
	}
}


class Cell {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.alive = false;
		this.reviving = false;
		this.killing = false;
		this.neighbours = new Set();
	}

	applyRules() {
		if (this.alive) {
			if (this.neighbours.size < 2 || this.neighbours.size > 3) {
				graphics.markCell(this, 'killing');
				this.killing = true;
			}
		} else {
			if (this.neighbours.size == 3) {
				graphics.markCell(this, 'reviving');
				this.reviving = true;
			}
		}
	}

	transition() {
		if (this.reviving) {
			this.alive = true;
			this.reviving = false;
		} else if (this.killing) {
			this.alive = false;
			this.killing = false;				
		}
		this.notifyNeighbours();
	}

	notifyNeighbours() {
		grid.withAllNeighbours(this, (neighbour) => {
			if (this.alive) {
				neighbour.neighbours.add(this);
			} else {
				neighbour.neighbours.delete(this);
			}
		})
	}


	setAlive(state) {
		this.alive = state;
		this.notifyNeighbours();
		this.visualize();
		return this;		
	}

	markAlive() {
		return this.setAlive(true);
	}

	markDead() {
		return this.setAlive(false);
	}

	toggleAlive() {
		return this.setAlive(!this.alive);
	}

	visualize() {
		graphics.markCell(this, this.alive ? 'alive' : 'dead');
		return this;
	}
}


// ---
//  Graphical representation
// ---

class Graphics {
	reset() {
		this.svg = d3.select("svg")
			.attr("width", `${grid.cols * (CELL_WIDTH + CELL_PADDING * 2)}`)
			.attr("height", `${grid.rows * (CELL_HEIGHT + CELL_PADDING * 2)}`);
		this.svg.selectAll("rect").remove();
	}

	cellId(cell) {
		return `cell-${cell.x}-${cell.y}`
	}

	drawGrid() {
		this.reset();
		for (let i = 0; i < grid.cols; i++) {
			for (let j = 0; j < grid.rows; j++) {
				this.drawCell(grid.cells[i][j]);
			}
		}
		return this;	
	}

	drawCell(cell) {
		let clazz = this;
		const rect = this.svg.append("rect")
			.attr("id", this.cellId(cell))
			.attr("x", cell.x * (CELL_WIDTH + CELL_PADDING * 2) + 1)
			.attr("y", cell.y * (CELL_HEIGHT + CELL_PADDING * 2)  + 1)
			.attr("width", CELL_WIDTH)
			.attr("height", CELL_HEIGHT)
			.attr("class", `cell ${this.alive ? 'alive' : 'dead'}`)
			.classed("alive", cell.alive)
			.text("&nbsp;");
		rect.on("click", () => rect.classed("alive", grid.toggleAlive(cell.x, cell.y).alive) )
		return cell;
	}

	markCell(cell, name) {
		d3.select(`#${this.cellId(cell)}`).attr('class', `cell ${name}`)
		return cell;
	}
}

const graphics = new Graphics();
const grid = new Grid();