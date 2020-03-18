const CELL_WIDTH   = 8
const CELL_HEIGHT  = 8
const CELL_PADDING = 0.9

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


class Game {
	constructor(width, height) {
		this.grid = new Grid(width, height);
		this.grid.refresh();
		this.generation = 0;

		this.isResuming = false;
		this.isShowing = false;
	}

	randomizeLivingCells() {
		for (let i = 0; i<this.grid.cols; i++) {
			for (let j = 0; j<this.grid.rows; j++) {
				parseInt(Math.random() * 100) % 3 == 0 ? this.grid.markAlive(i, j) : this.grid.markDead(i, j);
			}
		}
	}

	start() {
		this.randomizeLivingCells();
		this.timer = new RecurringTimer(() => {
			this.tick();
		}, 50)
	}

	tick() {
		this.grid.tick();
		document.getElementById('track').innerText = this.grid.track.size;
		document.getElementById('generation').innerText = ++this.generation;
		this.isShowing = false;
	}

	toggleResume() {
		this.isResuming ? this.timer.pause() : this.timer.resume();
		this.isResuming = !this.isResuming
		this.isShowing = false;
	}

	toggleMark() {
		this.isShowing ?  this.grid.refresh() : this.grid.applyRules();
		this.isShowing = !this.isShowing;
	}

	seed() {
		this.generation = 0;
		this.grid.track.clear();
		document.getElementById('track').innerText = this.grid.track.size;
		document.getElementById('generation').innerText = this.generation;
		this.randomizeLivingCells();
	}
}


class Grid {
	constructor(cols, rows) {
		this.cols = cols;
		this.rows = rows;
		this.track = new Set();
		this.grid = new Array(this.cols)
		for (let i = 0; i < this.cols; i++) {
			this.grid[i] = new Array(this.rows);
			for (let j = 0; j < this.rows; j++) {
				let cell = new Cell(this, i, j);
				this.grid[i][j] = cell;
				this.track.add(cell);
			}
		}
		new Graphics(this).draw();
	}

	tick() {
		this.applyRules();
		this.transition();
	}

	applyRules() {
		this.track.forEach(living => {
			living.applyRules();
		});
	}

	transition() {
		this.track.forEach(next => {
			next.transition();
		});
		this.refresh();
	}	

	refresh() {
		this.track.forEach(cell => {
			cell.visualize()
			if ((!cell.alive) && cell.neighbours.size < 3) {
				this.track.delete(cell);
			}
		})
	}

	get(x, y) {
		return this.grid[x][y];
	}

	addToTracking(cell) {
		this.track.add(cell);
	}

	markAlive(x, y) {
		this.track.add(this.grid[x][y].markAlive().visualize());
	}

	markDead(x, y) {
		this.track.add(this.grid[x][y].markDead().visualize());
	}

	toggleAlive(x, y) {
		let cell = this.grid[x][y]
		cell.toggleAlive().visualize();
		return cell;
	}
}


class Cell {
	constructor(grid, x, y) {
		this.grid = grid;
		this.id = `cell-${x}-${y}`
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
				d3.select(`#${this.id}`).attr('class', `cell killing`)
				this.killing = true;
			}
		} else {
			if (this.neighbours.size == 3) {
				d3.select(`#${this.id}`).attr('class', `cell reviving`)
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
		this.updateNeighbours();
	}

	updateNeighbours() {
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				let x = this.wrapX(this.x + i);
				let y = this.wrapY(this.y + j);
				let neighbour = this.grid.get(x, y);
				this.grid.addToTracking(neighbour);
				if (neighbour != this) {
					if (this.alive) {
						neighbour.neighbours.add(this);
					} else {
						neighbour.neighbours.delete(this);
					}
				}
			}
		}
	}

	wrapX(x) {
		if (x < 0) {
			x = this.grid.cols - 1;
		} else if (x > this.grid.cols - 1) {
			x = 0;
		}
		return x;
	}

	wrapY(y) {
		if (y < 0) {
			y = this.grid.rows - 1;
		} else if (y > this.grid.rows - 1) {
			y = 0;
		}
		return y;
	}

	markAlive() {
		this.alive = true;
		this.updateNeighbours();
		return this;
	}

	markDead() {
		this.alive = false;
		this.updateNeighbours();
		return this;
	}

	toggleAlive() {
		this.alive = !this.alive;
		this.updateNeighbours();
		return this;
	}

	visualize() {
		d3.select(`#${this.id}`).attr('class', `cell ${this.alive ? 'alive' : 'dead'}`)
		return this;
	}
}


class Graphics {
	constructor(grid) {
		this.grid = grid
		this.svg = d3.select("svg")
			.attr("width", `${this.grid.cols * (CELL_WIDTH + CELL_PADDING * 2)}`)
			.attr("height", `${this.grid.rows * (CELL_HEIGHT + CELL_PADDING * 2)}`);
	}


	draw() {
		for (let i = 0; i < this.grid.cols; i++) {
			for (let j = 0; j < this.grid.rows; j++) {
				this.drawCell(this.grid.grid[i][j]);
			}
		}		
	}

	drawCell(cell) {
		let clazz = this;
		const rect = this.svg.append("rect")
			.attr("id", cell.id)
			.attr("x", cell.x * (CELL_WIDTH + CELL_PADDING * 2) + 1)
			.attr("y", cell.y * (CELL_HEIGHT + CELL_PADDING * 2)  + 1)
			.attr("width", CELL_WIDTH)
			.attr("height", CELL_HEIGHT)
			.attr("class", `cell ${this.alive ? 'alive' : 'dead'}`)
			.classed("alive", cell.alive)
			.text("&nbsp;");
		rect.on("click", () => rect.classed("alive", clazz.grid.toggleAlive(cell.x, cell.y).alive) )
	}
}
