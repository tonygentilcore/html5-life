const boardSize = 400
const boardArea = boardSize * boardSize
const cellSize = 2

const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length

class Board {
  constructor () {
    this.data = new Uint8ClampedArray(new ArrayBuffer(boardSize * boardSize))
    this.lastData = new Uint8ClampedArray(new ArrayBuffer(boardSize * boardSize))
    this.generation = 0
  }

  step () {
    const { data, lastData } = this
    for (let x = 0; x < boardSize; ++x) {
      for (let y = 0; y < boardArea; y += boardSize) {
        const up = ((y || boardArea) - boardSize)
        const down = ((y + boardSize) % boardArea)
        const left = (x || boardSize) - 1
        const right = (x + 1) % boardSize
        const numNeighbors = (!!data[x + up] +
                              !!data[right + up] +
                              !!data[right + y] +
                              !!data[right + down] +
                              !!data[x + down] +
                              !!data[left + down] +
                              !!data[left + y] +
                              !!data[left + up])
        const index = x + y
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
    for (let i = 0; i < boardArea; ++i) {
      this.data[i] = Math.random() > 0.9 ? 1 : 0
    }
  }
}

class Game {
  constructor (container) {
    this.animate = this.animate.bind(this)
    this.board = new Board()
    this.imageData = new window.ImageData(boardSize, boardSize)
    this.abgrImageData = new Uint32Array(this.imageData.data.buffer) // TODO: Handle big endian
    this.running = false
    this.frameTimes = new Array(50)
    this.deadCellColor = '#FFEBCD'
    this.context = this._createContext(container)
    this.palette = window.chroma.scale(['#32CD32', '#8B4513']).mode('lch').colors(256)
    this.palette[0] = this.deadCellColor
    this.palette = this.palette.map(c => {
      const [r, g, b] = window.chroma(c).rgb()
      return 0xff000000 | (b << 16) | (g << 8) | r
    })
    this.board.randomize()
    this.render()
  }

  _createContext (container) {
    const canvas = document.createElement('CANVAS')
    canvas.width = boardSize
    canvas.height = boardSize
    canvas.style.imageRendering = 'pixelated'
    canvas.style.width = `${boardSize * cellSize}px`
    canvas.style.height = `${boardSize * cellSize}px`
    container.appendChild(canvas)
    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = this.deadCellColor
    context.fillRect(0, 0, boardSize, boardSize)
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
    this.frameTimes.push(durationMs)
    this.frameTimes.shift()
    console.log(average(this.frameTimes)) // 5.0
    if (this.running) window.requestAnimationFrame(this.animate)
  }

  render () {
    const { board, context, imageData, palette, abgrImageData } = this
    const { data } = board
    for (let i = 0; i < boardArea; ++i) {
      abgrImageData[i] = palette[data[i]]
    }
    context.putImageData(imageData, 0, 0)
  }
}
