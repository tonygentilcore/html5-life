const boardSize = 400
const cellSize = 2
const stepIntervalMs = 75

class Board {
  constructor () {
    this.data = new Array(boardSize * boardSize)
    this.generation = 0
  }

  _countNeighbors (x, y) {
    const up = (y || boardSize) - 1
    const down = (y + 1) % boardSize
    const left = (x || boardSize) - 1
    const right = (x + 1) % boardSize
    return (this.data[x + up * boardSize] +
            this.data[right + up * boardSize] +
            this.data[right + y * boardSize] +
            this.data[right + down * boardSize] +
            this.data[x + down * boardSize] +
            this.data[left + down * boardSize] +
            this.data[left + y * boardSize] +
            this.data[left + up * boardSize])
  }

  step () {
    const newBoard = new Array(boardSize * boardSize)
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        const numNeighbors = this._countNeighbors(x, y)
        const index = x + y * boardSize
        if (numNeighbors < 2 || numNeighbors > 3) {
          newBoard[index] = 0
        } else if (numNeighbors === 3) {
          newBoard[index] = 1
        } else {
          newBoard[index] = this.data[index]
        }
      }
    }
    this.data = newBoard
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
    return canvas.getContext('2d', { alpha: false })
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
      console.log(this.averageTime) // 0.278
    }, stepIntervalMs)
  }

  stop () {
    clearInterval(this.timer)
    this.timer = null
  }

  render () {
    this.context.fillStyle = '#ccc'
    this.context.fillRect(0, 0, boardSize * cellSize, boardSize * cellSize)
    this.context.fillStyle = '#222'
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        if (this.board.data[x + y * boardSize]) {
          this.context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
  }
}
