function generatePinList(length, width, height) {
  const center = [width / 2, height / 2];
  const radius = width / 2;
  const angleUnit = (Math.PI * 2) / length;

  const pinList = Array(length)
    .fill()
    .map((_, index) => {
      const angle = angleUnit * index - Math.PI / 2; // make pinList[0] at 12 o'clock

      const x = Math.round(center[0] + radius * Math.cos(angle));
      const y = Math.round(center[1] + radius * Math.sin(angle));

      if (x === width) {
        return [x - 1, y];
      }

      if (y === height) {
        return [x, y - 1];
      }

      return [x, y];
    });

  return pinList;
}

function isDotOnLine(dot, start, end) {
  // straight line
  if (end[0] - start[0] === 0) {
    if (dot[0] === end[0]) {
      return true;
    } else {
      return false;
    }
  }

  const slope = (end[1] - start[1]) / (end[0] - start[0]);
  const intercept = start[1] - slope * start[0];

  const blockTopY = dot[1] + 0.5;
  const blockBottomY = dot[1] - 0.5;
  const blockLeftY = slope * (dot[0] - 0.5) + intercept;
  const blockRightY = slope * (dot[0] + 0.5) + intercept;

  if (Math.abs(slope) <= 1) {
    if (
      (blockLeftY >= blockBottomY && blockLeftY <= blockTopY) ||
      (blockRightY >= blockBottomY && blockRightY <= blockTopY)
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    if (slope > 0) {
      if (blockLeftY > blockTopY || blockRightY < blockBottomY) {
        return false;
      } else {
        return true;
      }
    } else {
      if (blockRightY > blockTopY || blockLeftY < blockBottomY) {
        return false;
      } else {
        return true;
      }
    }
  }
}

function getPointListOnLine(start, end) {
  const pointList = [];
  const movementX = end[0] > start[0] ? 1 : -1;
  const movementY = end[1] > start[1] ? 1 : -1;

  let currentX = start[0];
  let currentY = start[1];

  let loopcount = 0;
  while ((currentX !== end[0] || currentY !== end[1]) && loopcount <= 1000) {
    pointList.push([currentX, currentY]);
    if (isDotOnLine([currentX + movementX, currentY], start, end)) {
      currentX += movementX;
    } else {
      currentY += movementY;
    }

    loopcount++;
  }
  pointList.push(end);

  return pointList;
}

// function getPointListOnLine(start, end) {
//   const pointList = [];
//   const dx = Math.abs(end[0] - start[0]);
//   const dy = -Math.abs(end[1] - start[1]);
//   const sx = start[0] < end[0] ? 1 : -1;
//   const sy = start[1] < end[1] ? 1 : -1;
//   let e = dx + dy;
//   let e2 = 0;

//   const a = [start[0], start[1]];
//   while (true) {
//     pointList.push([a[0], a[1]]);
//     if (a[0] === end[0] && a[1] === end[1]) break;
//     e2 = 2 * e;
//     if (e2 > dy) {
//       e += dy;
//       a[0] += sx;
//     }
//     if (e2 < dx) {
//       e += dx;
//       a[1] += sy;
//     }
//   }

//   return pointList;
// }

function getImageData(imageData, dot) {
  const startIndex = (dot[1] * imageData.width + dot[0]) * 4; // rgba
  return [
    imageData.data[startIndex],
    imageData.data[startIndex + 1],
    imageData.data[startIndex + 2],
    imageData.data[startIndex + 3]
  ];
}

function reduceImageData(imageData, start, end) {
  const dotList = getPointListOnLine(start, end);

  dotList.forEach(dot => {
    const startIndex = (dot[1] * imageData.width + dot[0]) * 4; // rgba
    imageData.data[startIndex] += 50;

    if (imageData.data[startIndex] > 255) {
      imageData.data[startIndex] = 255;
    }
  });
}

function getLineScore(imageData, start, end) {
  const dotList = getPointListOnLine(start, end);

  dotScoreList = dotList.map(dot => {
    const colorR = getImageData(imageData, dot)[0]; // r channel

    const dotScore = 1 - colorR / 255; // darker is higher

    return dotScore;
  });

  const score = dotScoreList.reduce((a, b) => a + b, 0) / dotScoreList.length;

  return score;
}

function isLineDrawn(lineList, startPinIndex, endPinIndex) {
  const lineFound = lineList.find(line => {
    if (
      (startPinIndex === line[0] && endPinIndex === line[1]) ||
      (startPinIndex === line[1] && endPinIndex === line[0])
    ) {
      return true;
    }

    return false;
  });

  return Boolean(lineFound);
}

function isPinTooClose(pinList, startPinIndex, endPinIndex) {
  let pinDistance = Math.abs(endPinIndex - startPinIndex);
  pinDistance =
    pinDistance > pinList.length / 2
      ? pinList.length - pinDistance
      : pinDistance;

  if (pinDistance < 25) {
    return true;
  }

  return false;
}

function drawLine(plate, start, end) {
  const line = plate.line().stroke({ width: 0.5, opacity: 0.6 });
  line.plot([start, end]);
}

const lineLimit = 1500;
let lineCount = 0;

let plate;
let image;
let imageData;
let pinList;
let lineList = [];

function draw(plate, imageData, pinList, startPinIndex) {
  let endPinIndex;
  let highestScore = 0;

  pinList.forEach((pin, index) => {
    if (
      startPinIndex === index ||
      isLineDrawn(lineList, startPinIndex, index) ||
      isPinTooClose(pinList, startPinIndex, index)
    ) {
      return;
    }

    const score = getLineScore(imageData, pinList[startPinIndex], pin);
    // console.log(startPinIndex, score);

    if (score > highestScore) {
      endPinIndex = index;
      highestScore = score;
    }
  });

  lineCount++;
  if (lineCount <= lineLimit) {
    lineList.push([startPinIndex, endPinIndex]);
    drawLine(plate, pinList[startPinIndex], pinList[endPinIndex]);
    reduceImageData(imageData, pinList[startPinIndex], pinList[endPinIndex]);

    setTimeout(() => {
      draw(plate, imageData, pinList, endPinIndex);
    }, 3);
  }
}

function init() {
  const canvas = $("canvas")[0];
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  imageData = ctx.getImageData(0, 0, 600, 600);

  pinList = generatePinList(200, 600, 600);

  draw(plate, imageData, pinList, 0);

  // Array(600)
  //   .fill()
  //   .forEach((_, x) => {
  //     Array(100)
  //       .fill()
  //       .forEach((_, y) => {
  //         const color = getImageData(imageData, [x, y])[0].toString(16);

  //         plate
  //           .rect(1, 1)
  //           .fill({ color: `#${color}${color}${color}` })
  //           .move(x, y);
  //       });
  //   });

  // pinList.forEach(startPin => {
  //   pinList.forEach(endPin => {
  //     if (lineCount <= lineLimit) {
  //       drawLine(plate, startPin, endPin);
  //       const score = getLineScore(imageData, startPin, endPin);

  //       console.log(score);
  //     }
  //     lineCount++;
  //   });
  // });
}

$(() => {
  plate = SVG("plate").size(600, 600);

  image = new Image();
  image.src = "./example/xman.jpg";
  image.onload = init;
});
