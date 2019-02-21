onmessage = ({ data: { data, lastData, boardSize, boardArea, rowStart, rowEnd } }) => {
  for (let y = rowStart; y < rowEnd; y += boardSize) {
    const up = (y || boardArea) - boardSize
    const down = (y + boardSize) % boardArea
    for (let x = 0; x < boardSize; ++x) {
      const left = (x || boardSize) - 1
      const right = (x + 1) % boardSize
      const numDeadNeighbors = (!data[left + up] +
                                !data[x + up] +
                                !data[right + up] +
                                !data[left + y] +
                                !data[right + y] +
                                !data[left + down] +
                                !data[x + down] +
                                !data[right + down])
      const index = x + y
      switch (numDeadNeighbors) {
        case 6:
          lastData[index] = data[index] + !!data[index]
          break
        case 5:
          lastData[index] = data[index] + 1
          break
        default:
          lastData[index] = 0
      }
    }
  }
  postMessage('OK')
}
