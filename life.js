const boardSize = 2048
const boardArea = boardSize * boardSize
const cellSize = 1
const numWorkers = navigator.hardwareConcurrency

const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length

class Board {
  constructor () {
    this.data = new Uint8ClampedArray(new SharedArrayBuffer(boardArea))
    this.lastData = new Uint8ClampedArray(new SharedArrayBuffer(boardArea))
    this.generation = 0
    this.workers = new Array(numWorkers).fill(null).map(() => new Worker('stepper.js'))
    this.promises = new Array(numWorkers)
  }

  async step () {
    const { data, lastData, promises, workers } = this

    for (let i = 0; i < numWorkers; i++) {
      const chunkSize = (boardArea / numWorkers)
      const rowStart = i * chunkSize
      const rowEnd = rowStart + chunkSize
      promises[i] = new Promise(resolve => { workers[i].onmessage = resolve })
      workers[i].postMessage({ data, lastData, boardSize, boardArea, rowStart, rowEnd })
    }
    await Promise.all(promises)

    const swap = data
    this.data = lastData
    this.lastData = swap
    this.generation++
  }

  randomize () {
    for (let i = 0; i < boardArea; ++i) {
      this.data[i] = Math.random() > 0.5 ? 1 : 0
      this.lastData[i] = this.data[i]
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
    this.randomize()
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

  randomize () {
    this.stop()
    window.requestAnimationFrame(() => {
      this.board.randomize()
      this.render()
    })
  }

  async animate () {
    const start = window.performance.now()
    await this.board.step()
    this.render()
    const durationMs = window.performance.now() - start
    this.frameTimes.push(durationMs)
    this.frameTimes.shift()
    console.log(average(this.frameTimes)) // 42
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
