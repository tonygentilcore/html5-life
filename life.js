const boardSize = 1600
const boardArea = boardSize * boardSize
const cellSize = 1
const numWorkers = Math.max(navigator.hardwareConcurrency - 1, 1)

const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length

class Board {
  constructor () {
    this.data = new Uint8ClampedArray(new SharedArrayBuffer(boardArea))
    this.lastData = new Uint8ClampedArray(new SharedArrayBuffer(boardArea))
    this.generation = 0
    this.workers = new Array(numWorkers).fill(null).map(() => new Worker('stepper.js'))
    this.promises = new Array(numWorkers)
  }

  stepAsync () {
    const { data, lastData, promises, workers } = this

    for (let i = 0; i < numWorkers; ++i) {
      const chunkSize = Math.ceil(boardArea / numWorkers)
      const rowStart = i * chunkSize
      const rowEnd = rowStart + chunkSize
      promises[i] = new Promise(resolve => { workers[i].onmessage = resolve })
      workers[i].postMessage({ data, lastData, boardSize, boardArea, rowStart, rowEnd })
    }
    return Promise.all(promises)
  }

  swap () {
    const { data, lastData } = this
    const swap = data
    this.data = lastData
    this.lastData = swap
    this.generation++
  }

  randomize (noiseFunction) {
    if (noiseFunction) {
      window.noise.seed(Math.random())
    } else {
      noiseFunction = () => 0.5
    }
    for (let y = 0; y < boardSize; ++y) {
      for (let x = 0; x < boardSize; ++x) {
        const index = x + y * boardSize
        const value = Math.abs(noiseFunction(x / 200, y / 200))
        this.data[index] = Math.random() > value ? 1 : 0
        this.lastData[index] = this.data[index]
      }
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
    this.randomize(window.noise.perlin2)
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

  randomize (noiseFunction) {
    this.stop()
    window.requestAnimationFrame(() => {
      this.board.randomize(noiseFunction)
      this.render()
    })
  }

  async animate () {
    const start = window.performance.now()
    const promise = this.board.stepAsync()
    this.render()
    await promise
    this.board.swap()
    const durationMs = window.performance.now() - start
    this.frameTimes.push(durationMs)
    this.frameTimes.shift()
    console.log(average(this.frameTimes)) // 31
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
