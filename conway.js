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

    var resume = function() {
        start = new Date();
        timerId = window.setTimeout(function() {
            remaining = delay;
            resume();
            callback();
        }, remaining);
    };

    this.resume = resume;
}


// ---
//  Game code
// ---

class Game {
	constructor(width, height) {
		this.startBtn = document.getElementById("start");
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
		}, 50);
	}

	stop() {
		if (this.timer) {
			this.timer.pause();
		}
		this.isResuming = false;
		startBtn.innerText = 'start';
	}

	resume() {
		if (this.timer) {
			this.timer.resume();
		}
		this.isResuming = true;
		startBtn.innerText = 'stop';
	}

	tick() {
		grid.tick();
		this.generation++;
		this.updateTitle();
	}

	reset() {
		this.stop();
		grid.clear();
		this.generation = 0;
		this.showIntermediateState = false;		
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

	step() {
		this.stop();
		this.tick();
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

	tick(showSteps) {
		this.applyRules();
		this.transition();
		this.refresh();
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