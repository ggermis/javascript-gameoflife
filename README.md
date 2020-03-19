# Game of Life

Reference: https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life

## Demo

You can find a working example [here](http://game-of-life.codenut.org)

## Implementation

* Uses `SVG` as the canvas (manipulated through [d3](https://d3js.org/))
* Randomizes the initial state
* Ability to step through each tick manually
* Ability to show cells which would be `killed` or `revived` in the next tick
* The grid automatically resizes to the viewpane

## Features

> Reseed

Re-initialize the grid with random dead and alive cells

> Pause / resume

Toggle resuming and pausing the game. By default the game is paused as to avoid
using too much CPU

> Step

Manually perform a single step

> Toggle inspector

Show what would happen on the next step. `red` cells mean the existing `alive` cells will `die`. While `green` cells mean that a previously `dead` cell wil be `revived`


## Screenshots

### Normal view

![1](https://user-images.githubusercontent.com/2149528/77009522-58780f80-6968-11ea-96af-e9748dca8874.png)

### Showing markers

![2](https://user-images.githubusercontent.com/2149528/77009588-734a8400-6968-11ea-8ebd-d8d9cf1f1a23.png)

