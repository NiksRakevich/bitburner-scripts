import { 
  getBestAvailableTargetsToHackDESC,
  printTable
} from './utils.js';

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();
  const [MAX_NUMBER] = ns.args;
  const tableData = getBestAvailableTargetsToHackDESC(ns)
    .slice(0, MAX_NUMBER)
    .reduce((allData, info, index) => {
      allData.push([
        index + 1,
        info.server.hostname,
        info.hackSignificance.toFixed(),
        info.server.moneyMax,
        info.server.moneyAvailable.toFixed(),
        info.server.minDifficulty,
        info.server.hackDifficulty.toFixed(2),
      ])
      return allData;
    }, []);

  printTable(
    ns,
    'Best Targets',
    ['#', 'Host', 'Significance', 'Max Money', 'Available Money', 'Min Sec', 'Crt Sec'],
    tableData
  )
}