import {
  getServerHackingInfoBatch
} from './utils.js';

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  const [host] = ns.args;
  ns.tail();

  while (true) {
    const info = getServerHackingInfoBatch(ns, host);
    ns.clearLog();
    ns.print(`
  ------ ${info.targetServer.hostname} ------
Max money:          ${info.targetServer.moneyMax}
Available money:    ${info.targetServer.moneyAvailable}
Min security level: ${info.targetServer.minDifficulty}
Security level:     ${info.targetServer.hackDifficulty}
  ------ Prepare Batch info ------
Weaken Threads ${info.weakenThreads}
Grow Threads ${info.growThreads}
Grow Weaken Threads ${info.growWeakenThreads}
  ---------- Batch info ----------
Hack Threads:                  ${info.hackThreads}
Predicted Grow Threads:        ${info.predictedGrowThreads}
Predicted Grow Weaken Threads: ${info.predictedGrowWeakenThreads}
Predicted Hack Weaken Threads: ${info.predictedHackWeakenThreads}
`);
    await ns.sleep(50);
  }
}
