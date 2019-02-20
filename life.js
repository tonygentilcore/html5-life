const boardSize = 300
const cellSize = 2

class Board {
  constructor () {
    this.data = new Uint8ClampedArray(new ArrayBuffer(boardSize * boardSize))
    this.lastData = new Uint8ClampedArray(new ArrayBuffer(boardSize * boardSize))
    this.generation = 0
  }

  step () {
    const { data, lastData } = this
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const up = ((y || boardSize) - 1) * boardSize
        const middle = y * boardSize
        const down = ((y + 1) % boardSize) * boardSize
        const left = (x || boardSize) - 1
        const right = (x + 1) % boardSize
        const numNeighbors = (!!data[x + up] +
                              !!data[right + up] +
                              !!data[right + middle] +
                              !!data[right + down] +
                              !!data[x + down] +
                              !!data[left + down] +
                              !!data[left + middle] +
                              !!data[left + up])
        const index = x + middle
        switch (numNeighbors) {
          case 2:
            lastData[index] = data[index] + !!data[index]
            break
          case 3:
            lastData[index] = data[index] + 1
            break
          default:
            lastData[index] = 0
        }
      }
    }

    const swap = data
    this.data = lastData
    this.lastData = swap
    this.generation++
  }

  randomize () {
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        this.data[x + y * boardSize] = Math.random() > 0.85 ? 1 : 0
      }
    }
  }
}

class Game {
  constructor (container) {
    this.animate = this.animate.bind(this)
    this.board = new Board()
    this.running = false
    this.averageTime = 0
    this.deadCellColor = '#FFEBCD'
    this.context = this._createContext(container)
    this.palette = window.chroma.scale(['#32CD32', '#8B4513']).mode('lch').colors(256)
    this.palette[0] = this.deadCellColor
    this.board.randomize()
    this.render()
  }

  _createContext (container) {
    const canvas = document.createElement('CANVAS')
    canvas.width = boardSize * cellSize
    canvas.height = boardSize * cellSize
    container.appendChild(canvas)
    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = this.deadCellColor
    context.fillRect(0, 0, boardSize * cellSize, boardSize * cellSize)
    return context
  }

  start () {
    if (this.running) return
    this.running = true
    window.requestAnimationFrame(this.animate)
  }

  stop () {
    this.running = false
  }

  animate () {
    const start = window.performance.now()
    this.board.step()
    this.render()
    const durationMs = window.performance.now() - start
    if (this.averageTime) {
      this.averageTime = ((this.averageTime * (this.board.generation - 1)) + durationMs) / this.board.generation
    } else {
      this.averageTime = durationMs
    }
    console.log(this.averageTime) // 5.95
    if (this.running) window.requestAnimationFrame(this.animate)
  }

  render () {
    const { context, palette } = this
    const { data, lastData } = this.board
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const index = x + y * boardSize
        if (data[index] !== lastData[index]) {
          context.fillStyle = palette[data[index]]
          context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
  }
}
