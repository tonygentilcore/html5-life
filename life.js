const boardSize = 400
const cellSize = 2
const stepIntervalMs = 25

class Board {
  constructor () {
    this.data = new Uint8Array(new ArrayBuffer(boardSize * boardSize))
    this.lastData = new Uint8Array(new ArrayBuffer(boardSize * boardSize))
    this.generation = 0
  }

  step () {
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const up = ((y || boardSize) - 1) * boardSize
        const middle = y * boardSize
        const down = ((y + 1) % boardSize) * boardSize
        const left = (x || boardSize) - 1
        const right = (x + 1) % boardSize
        const numNeighbors = (this.data[x + up] +
                              this.data[right + up] +
                              this.data[right + middle] +
                              this.data[right + down] +
                              this.data[x + down] +
                              this.data[left + down] +
                              this.data[left + middle] +
                              this.data[left + up])
        const index = x + middle
        switch (numNeighbors) {
          case 2:
            this.lastData[index] = this.data[index]
            break
          case 3:
            this.lastData[index] = 1
            break
          default:
            this.lastData[index] = 0
        }
      }
    }

    const swap = this.data
    this.data = this.lastData
    this.lastData = swap

    this.generation++
  }

  randomize () {
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        this.data[x + y * boardSize] = Math.random() > 0.75 ? 1 : 0
      }
    }
  }
}

class Game {
  constructor (container) {
    this.board = new Board()
    this.timer = null
    this.averageTime = 0
    this.context = this._createContext(container)
    this.board.randomize()
    this.render()
  }

  _createContext (container) {
    const canvas = document.createElement('CANVAS')
    canvas.width = boardSize * cellSize
    canvas.height = boardSize * cellSize
    container.appendChild(canvas)
    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = '#ccc'
    context.fillRect(0, 0, boardSize * cellSize, boardSize * cellSize)
    return context
  }

  start () {
    if (this.timer) return
    this.timer = setInterval(() => {
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
    }, stepIntervalMs)
  }

  stop () {
    clearInterval(this.timer)
    this.timer = null
  }

  render () {
    const { data, lastData } = this.board
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const index = x + y * boardSize
        if (data[index] !== lastData[index]) {
          this.context.fillStyle = data[index] ? '#222' : '#ccc'
          this.context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
  }
}
