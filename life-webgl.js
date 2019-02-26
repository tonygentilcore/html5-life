const { chroma, noise, performance, requestAnimationFrame, twgl } = window

class GameWebGL {
  constructor (container) {
    this.animate = this.animate.bind(this)
    this.generation = 0
    this.running = false
    this.frameTimes = []
    this.lastFrameTime = 0
    this.gl = this._createContext(container)
    this.stepProgramInfo = twgl.createProgramInfo(this.gl, ['quad-vertex-shader', 'game-of-life-fragment-shader'])
    this.displayProgramInfo = twgl.createProgramInfo(this.gl, ['quad-vertex-shader', 'display-fragment-shader'])
    this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, {
      a_quad: {
        numComponents: 2,
        data: [
          1.0, 1.0,
          -1.0, 1.0,
          1.0, -1.0,
          -1.0, -1.0
        ]
      }
    })
    const board = this._createRandomBoard(noise.perlin2)
    this.textures = twgl.createTextures(this.gl, {
      u_back: {
        mag: this.gl.NEAREST,
        min: this.gl.LINEAR,
        internalFormat: this.gl.R8,
        src: board,
        width: boardSize,
        height: boardSize,
        depth: 1
      },
      u_front: {
        mag: this.gl.NEAREST,
        min: this.gl.LINEAR,
        internalFormat: this.gl.R8,
        src: board,
        width: boardSize,
        height: boardSize,
        depth: 1
      },
      u_colorMap: {
        mag: this.gl.NEAREST,
        min: this.gl.LINEAR,
        format: this.gl.RGBA,
        src: this._createPalette(),
        width: 256,
        height: 1,
        wrap: this.gl.CLAMP_TO_EDGE
      }
    })
    this.uniforms = {
      u_scale: [boardSize, boardSize]
    }
    twgl.resizeCanvasToDisplaySize(this.gl.canvas)
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    twgl.setBuffersAndAttributes(this.gl, this.stepProgramInfo, this.bufferInfo)
    twgl.setBuffersAndAttributes(this.gl, this.displayProgramInfo, this.bufferInfo)

    this.render()
  }

  _createContext (container) {
    while (container.firstChild) container.removeChild(container.firstChild)
    const canvas = document.createElement('CANVAS')
    canvas.width = boardSize
    canvas.height = boardSize
    canvas.style.imageRendering = 'pixelated'
    canvas.style.width = `${boardSize * cellSize}px`
    canvas.style.height = `${boardSize * cellSize}px`
    container.appendChild(canvas)
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false
    })
    return context
  }

  _createPalette () {
    let palette = chroma.scale(['#32CD32', '#8B4513']).mode('lch').colors(256)
    palette[0] = '#FFEBCD'
    palette = palette.reduce((accumulator, color) => {
      return accumulator.concat(chroma(color).rgba())
    }, [])
    return palette
  }

  _createRandomBoard (noiseFunction) {
    const stride = 1
    const data = new Uint8Array(new ArrayBuffer(boardArea * stride))
    if (noiseFunction) {
      noise.seed(Math.random())
    } else {
      noiseFunction = () => 0.5
    }
    const noiseWidth = 200 * stride
    const boardLength = boardSize * stride
    for (let y = 0; y < boardLength; y += stride) {
      for (let x = 0; x < boardLength; x += stride) {
        const index = x + y * boardSize
        const value = Math.abs(noiseFunction(x / noiseWidth, y / noiseWidth))
        data[index] = Math.random() > value ? 1 : 0
      }
    }
    return data
  }

  start () {
    if (this.running) return
    this.running = true
    requestAnimationFrame(this.animate)
  }

  stop () {
    this.running = false
  }

  randomize (noiseFunction) {
    this.stop()
    requestAnimationFrame(() => {
      const board = this._createRandomBoard(noiseFunction)
      this.textures.u_back = twgl.createTexture(this.gl, {
        mag: this.gl.NEAREST,
        min: this.gl.LINEAR,
        internalFormat: this.gl.R8,
        src: board,
        width: boardSize,
        height: boardSize,
        depth: 1
      })
      this.textures.u_front = twgl.createTexture(this.gl, {
        mag: this.gl.NEAREST,
        min: this.gl.LINEAR,
        internalFormat: this.gl.R8,
        src: board,
        width: boardSize,
        height: boardSize,
        depth: 1
      })
      this.generation = 0
      this.render()
    })
  }

  step () {
    if (this.running) return
    this.running = false
    if (this.generation === 0) this.animate()
    requestAnimationFrame(this.animate)
  }

  animate () {
    const now = performance.now()
    this.evolve()
    this.render()
    this.swap()
    if (this.lastFrameTime) {
      const durationMs = now - this.lastFrameTime
      this.frameTimes.push(durationMs)
      if (this.frameTimes.length > 50) this.frameTimes.shift()
      if (this.frameTimes.length) {
        console.log(`Frame time: ${Math.round(average(this.frameTimes))}ms`)
      }
    }
    this.lastFrameTime = now
    if (this.running) requestAnimationFrame(this.animate)
  }

  swap () {
    const { textures } = this
    const tmp = textures.u_front
    textures.u_front = textures.u_back
    textures.u_back = tmp
    this.generation++
  }

  evolve () {
    const { bufferInfo, gl, stepProgramInfo, textures, uniforms } = this
    gl.useProgram(stepProgramInfo.program)
    twgl.bindFramebufferInfo(gl, twgl.createFramebufferInfo(this.gl, [
      { attachment: textures.u_front }
    ]))
    twgl.setUniforms(stepProgramInfo, { ...uniforms,
      u_back: textures.u_back
    })
    twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP)
  }

  render () {
    const { bufferInfo, displayProgramInfo, gl, textures, uniforms } = this
    gl.useProgram(displayProgramInfo.program)
    twgl.bindFramebufferInfo(gl, null)
    twgl.setUniforms(displayProgramInfo, { ...uniforms,
      u_colorMap: textures.u_colorMap,
      u_front: textures.u_front
    })
    twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP)
  }
}
