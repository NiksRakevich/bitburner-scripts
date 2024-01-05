import {
  getAllHosts,
  isAbleToGetRoot,
  getAdminRights,
} from 'utils.js';

/** @param {number[]} arr */
function arrayJumpingGame(arr) {
  let currentPosition = 0;
  while (currentPosition < arr.length - 1) {
    if (arr[currentPosition] === 0) break;
    currentPosition += arr[currentPosition];
  }
  return currentPosition === arr.length - 1 ? 1 : 0;
}

/** @param {number} number */
function primeFactor(number) {
  const allPrimeFactors = [];

  let d = 2;
  while (d * d <= number) {
    if (number % d === 0) {
      allPrimeFactors.push(d);
      number /= d;
    } else {
      d++;
    }
  }

  if (number > 1) {
    allPrimeFactors.push(number);
  }

  return Math.max(...allPrimeFactors);
}

/** @param {[string, number]} */
function encryptionCaesarCipher([str, leftShift]) {
  const minUnicode = 65;
  const maxUnicode = 90;
  return str
    .toUpperCase()
    .split('')
    .map(char => {
      const unicode = char.charCodeAt(0);
      if (unicode >= minUnicode && unicode <= maxUnicode) {
        const shiftedUnicode = unicode - leftShift;
        const newUnicode = shiftedUnicode >= minUnicode ? shiftedUnicode : maxUnicode - minUnicode + shiftedUnicode + 1;
        return String.fromCharCode(newUnicode);
      }
      return char;
    })
    .join('');
}

/** @param {[string, string]} */
function encryptionVigenereCipher([text, keyword]) {
  const minUnicode = 'A'.charCodeAt(0);
  const maxUnicode = 'Z'.charCodeAt(0);
  const spaceUnicode = ' '.charCodeAt(0);
  const alphabetLenght = maxUnicode - minUnicode + 1;
  const unicodeAlphabet = new Array(alphabetLenght)
    .fill(0)
    .map((_, index) => minUnicode + index);

  let alignedKeyWord = keyword;
  while (alignedKeyWord.length < text.length) {
    alignedKeyWord += keyword;
  }
  const unicodeKeywordArr = alignedKeyWord.split('').map(letter => letter.charCodeAt(0));
  const unicodeTextArr = text.split('').map(letter => letter.charCodeAt(0));

  return unicodeTextArr
    .map((unicode, index) => unicode === spaceUnicode ? 
      spaceUnicode : 
      unicodeAlphabet[(unicode + unicodeKeywordArr[index]) % 26]
    )
    .map(unicode => String.fromCharCode(unicode))
    .join('');
}

/** @param {[number[]]} matrix */
function spiralizeMatrix(matrix) {
  const result = [];
  while (matrix.length) {
    result.push(...matrix.shift());
    result.push(...matrix.reduce((res, row) => {
      row.length && res.push(row.pop());
      return res;
    }, []));
    result.push(...(matrix.pop()?.reverse() || []));
    result.push(...matrix.reduce((res, row) => {
      row.length && res.push(row.shift());
      return res;
    }, []).reverse());
  }
  return result.filter(res => res !== null);
}

/** @param {[number, number]} */
function uniquePathInAGrid1([rowsCount, columnsCount]) {
  let pathsCount = 0;
  function findPath(currentRow, currentColumn) {
    if (currentRow === rowsCount && currentColumn === columnsCount) {
      pathsCount++;
    }
    if (currentRow < rowsCount) findPath(currentRow + 1, currentColumn);
    if (currentColumn < columnsCount) findPath(currentRow, currentColumn + 1);
  }
  findPath(1, 1);
  return pathsCount;
}

/** @param {number[]} stockPrises*/
function algorithmicStockTrader1(stockPrises) {
  let maxProfit = 0;
  for (let day = 0; day < stockPrises.length; day++) {
    const availableStockPrises = stockPrises.slice(day);
    const buyPrice = availableStockPrises[0];
    availableStockPrises.forEach(sellPrice => {
      if (sellPrice - buyPrice > maxProfit) maxProfit = sellPrice - buyPrice;
    });
  }
  return maxProfit
}

/** @param {number} number*/
function totalWaysToSum(number) {
  const totalWaysPerNumber = new Array(number + 1).fill(0);
  totalWaysPerNumber[0] = 1;

  for (let row = 1; row < number; row++) {
    for (let col = row; col <= number; col++) {
      totalWaysPerNumber[col] += totalWaysPerNumber[col - row];
    }
  }
  return(totalWaysPerNumber[number]);
}

/** @param {[number, number[]]}*/
function totalWaysToSum2([number, numbersToUse]) {
  const totalWaysPerNumber = new Array(number + 1).fill(0);
  totalWaysPerNumber[0] = 1;
  const numbersToUseSet = new Set(numbersToUse);

  for (let row = 1; row < number; row++) {
    if (numbersToUseSet.has(row)) {
      for (let col = row; col <= number; col++) {
          totalWaysPerNumber[col] += totalWaysPerNumber[col - row];
      }
    }
  }
  return(Math.max(...totalWaysPerNumber));
}

/** @param {[number, number][]} intervals*/
function mergeOverlapingIntervals(intervals) {

  /** @param {[number, number]} firstInterval
   *  @param {[number, number]} secondInterval
  */
  function isOverlaping(firstInterval, secondInterval) {
    return (firstInterval[0] <= secondInterval[1] && firstInterval[1] >= secondInterval[0])
      // (firstInterval[0] >= secondInterval[0] && firstInterval[1] <= secondInterval[1]) ||
      // (firstInterval[0] >= secondInterval[0] && firstInterval[0] <= secondInterval[1] && firstInterval[1] >= secondInterval[1])
  }

  for (let firstIntervalIndex = 0; firstIntervalIndex < intervals.length - 1; firstIntervalIndex++) {
    let firstInterval = intervals[firstIntervalIndex];
    for (let secondIntervalIndex = firstIntervalIndex + 1; secondIntervalIndex < intervals.length; secondIntervalIndex++) {
      const secondInterval = intervals[secondIntervalIndex];
      if (isOverlaping(firstInterval, secondInterval) || isOverlaping(secondInterval, firstInterval)) {
        const mergedInterval = [Math.min(firstInterval[0], secondInterval[0]), Math.max(firstInterval[1], secondInterval[1])];
        intervals.splice(firstIntervalIndex, 1, mergedInterval);
        intervals.splice(secondIntervalIndex, 1);
        firstIntervalIndex = -1;
        break;
      }
    }
  }

  return intervals.sort(([ intervalStartA ], [ intervalStartB ]) => intervalStartA - intervalStartB );
}

/** @param {string} string*/
function rleCompression(string) {
  return string
    .split('')
    .reduce((prevResult, letter, index, stringArr) => {
      if (letter !== prevResult.letter || prevResult.letterCount === 9) {
        if (prevResult.letterCount) prevResult.resultStr += `${prevResult.letterCount}${prevResult.letter}`;
        prevResult.letterCount = 1;
        prevResult.letter = letter;
      } else {
        prevResult.letterCount += 1;
      }
      if (index === stringArr.length - 1) prevResult.resultStr += `${prevResult.letterCount}${prevResult.letter}`;
      return prevResult;
    }, {
      letter: null,
      letterCount: 0,
      resultStr: ''
    }).resultStr;
}

const contractSolvers = {
  "Find Largest Prime Factor": primeFactor,
  "Subarray with Maximum Sum": null,
  "Total Ways to Sum": totalWaysToSum,
  "Total Ways to Sum II": totalWaysToSum2, //can return wrong result, need to investigate
  "Spiralize Matrix": spiralizeMatrix,
  "Array Jumping Game": arrayJumpingGame,
  "Array Jumping Game II": null,
  "Merge Overlapping Intervals": mergeOverlapingIntervals,
  "Generate IP Addresses": null,
  "Algorithmic Stock Trader I": algorithmicStockTrader1,
  "Algorithmic Stock Trader II": null,
  "Algorithmic Stock Trader III": null,
  "Algorithmic Stock Trader IV": null,
  "Minimum Path Sum in a Triangle": null,
  "Unique Paths in a Grid I": uniquePathInAGrid1,
  "Unique Paths in a Grid II": null,
  "Shortest Path in a Grid": null,
  "Sanitize Parentheses in Expression": null,
  "Find All Valid Math Expressions": null,
  "HammingCodes: Integer to Encoded Binary": null,
  "HammingCodes: Encoded Binary to Integer": null,
  "Proper 2-Coloring of a Graph": null,
  "Compression I: RLE Compression": rleCompression,
  "Compression II: LZ Decompression": null,
  "Compression III: LZ Compression": null,
  "Encryption I: Caesar Cipher": encryptionCaesarCipher,
  "Encryption II: Vigenère Cipher": encryptionVigenereCipher,
};

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();
  const attemptFailedContracts = new Set();

  while (true) {
    const hosts = getAllHosts(ns).filter(host => isAbleToGetRoot(ns, host));
    hosts.forEach(host => getAdminRights(ns, host));
    hosts.push('home');

    hosts.forEach(host => {
      const contractFileNames = ns.ls(host, '.cct');
      contractFileNames
        .filter(contractFileName => !attemptFailedContracts.has(contractFileName))
        .forEach(contractFileName => {
        const contractType = ns.codingcontract.getContractType(contractFileName, host);
        const solver = contractSolvers[contractType];
        if (solver) {
          const contractData = ns.codingcontract.getData(contractFileName, host);
          const attemptReward = ns.codingcontract.attempt(solver(contractData), contractFileName, host);
          if (attemptReward) {
            ns.print(`Contract solved, reward: ${attemptReward}`);
          } else {
            attemptFailedContracts.add(contractFileName);
            ns.print(`Failed to solve contract, all failed contracts: ${[...attemptFailedContracts].join(', ')}`);
          }
        } else {
          ns.print(`No solver for "${contractType}" in ${host}`);
          // ns.print(`Data: ${ns.codingcontract.getData(contractFileName, host)}`);
        }
      });
    })

    ns.print('------ Waiting for the next check ------');
    await ns.sleep(1000 * 60);
  }
}
