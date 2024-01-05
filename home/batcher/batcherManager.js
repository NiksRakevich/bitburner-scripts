import {
  getServerHackingInfoBatch,
  PIDSaver,
  getAllHostsToHack,
  isAbleToGetRoot,
  getAllHostsToExecute,
  getAdminRights,
  getMyServerNames,
  printTable,
  getHMSStringDate,
  convertNumberToSuffixedString
} from 'utils.js';

// Record with augmentations: 3.092 t/s (100, 5, 0.9, 3, 4)

// Min 20.
// Higher value - more RAM needed to batch infinitely.
// Smaller value - more emergency recovery chance and money income per second.
const ONE_WINDOW_DELAY = 100;
// Min * 3.
// Higher value - more RAM needed to batch infinitely.
// Smaller value - more emergency recovery chance and money income per second.
const WINDOW_BETWEEN_BATCHES = ONE_WINDOW_DELAY * 5;
// Should be < 1.
// Default 0.9, can be decreased when no enought RAM to even one batch yet
const HACK_AMOUNT_MULTIPLIER = 0.9;
const MAX_HACK_TIMES_EMERGENCY_CHECK = 3; // Should be > 1
// Min 0.
// Higher value - more warm up time significance while sorting the targets
const APPROXIMATE_EMERGENCY_COUNT_IN_WARMUP_TIME_PERIOD = 4;

const WEAKEN_SCRIPT_PATH = './weaken.js';
const GROW_SCRIPT_PATH = './grow.js';
const HACK_SCRIPT_PATH = './hack.js';
const MONITOR_SCRIPT_PATH = '../monitorServer.js';

/** @param {NS} ns 
 *  @return {number[]}
*/
function sendPrepareBatch(
  ns,
  executableHost,
  targetHost,
  weakenThreads,
  growWeakenThreads,
  growThreads,
  weakenTime,
  growTime
) {
  const pids = [];
  if (weakenThreads) {
    pids.push(ns.exec(WEAKEN_SCRIPT_PATH, executableHost, weakenThreads, targetHost));
  }

  if (growThreads) {
    const growSleepTime = weakenTime - growTime + ONE_WINDOW_DELAY;
    pids.push(ns.exec(GROW_SCRIPT_PATH, executableHost, growThreads, targetHost, growSleepTime));
  }

  if (growWeakenThreads) {
    const growWeakenSleepTime = ONE_WINDOW_DELAY * 2;
    pids.push(ns.exec(WEAKEN_SCRIPT_PATH, executableHost, growWeakenThreads, targetHost, growWeakenSleepTime));
  }

  return pids;
}

/** @param {NS} ns 
 *  @return {number[]}
*/
function sendBatch(
  ns,
  executableHost,
  targetHost,
  hackWeakenThreads,
  growWeakenThreads,
  growThreads,
  hackThreads,
  weakenTime,
  growTime,
  hackTime
) {
  const pids = [];
  const hackSleepTime = weakenTime - hackTime - ONE_WINDOW_DELAY;
  pids.push(ns.exec(HACK_SCRIPT_PATH, executableHost, hackThreads, targetHost, hackSleepTime));

  pids.push(ns.exec(WEAKEN_SCRIPT_PATH, executableHost, hackWeakenThreads, targetHost));

  const growSleepTime = weakenTime - growTime + ONE_WINDOW_DELAY;
  pids.push(ns.exec(GROW_SCRIPT_PATH, executableHost, growThreads, targetHost, growSleepTime));

  const growWeakenSleepTime = ONE_WINDOW_DELAY * 2;
  pids.push(ns.exec(WEAKEN_SCRIPT_PATH, executableHost, growWeakenThreads, targetHost, growWeakenSleepTime));

  // if one of the exec in batch failed - kill batch to not broke process
  if (pids.find(pid => pid <= 0)) {
    pids.filter(Boolean).forEach(pid => ns.kill(pid));
    return [];
  }

  return pids;
}

/** @param {NS} ns 
 *  @return {number}
*/
function getRequiredRAMforBatch(ns, growWeakenThreads, hackWeakenThreads, growThreads, hackThreads, weakenTime) {
  const BATCHES_RUNS_IN_ONE_TIME_CORRECTIVE = 1.05;
  const growWeakenRAM = ns.getScriptRam(WEAKEN_SCRIPT_PATH) * growWeakenThreads;
  const hackWeakenRAM = ns.getScriptRam(WEAKEN_SCRIPT_PATH) * hackWeakenThreads;
  const growRAM = ns.getScriptRam(GROW_SCRIPT_PATH) * growThreads;
  const hackRAM = ns.getScriptRam(HACK_SCRIPT_PATH) * hackThreads;
  const oneBatchRAM = growWeakenRAM + hackWeakenRAM + growRAM + hackRAM;
  const batchTime = weakenTime + (ONE_WINDOW_DELAY * 3);
  const batchesRunsInOneTime = Math.ceil((batchTime / WINDOW_BETWEEN_BATCHES) * BATCHES_RUNS_IN_ONE_TIME_CORRECTIVE);
  const batchRequiredRam = batchesRunsInOneTime * oneBatchRAM;
  return {
    batchRequiredRam,
    oneBatchRAM,
  }
}

/** @param {NS} ns 
 *  @param {string[]} hosts
 *  @return {string[]}
*/
function getSortedTargetsToHack(ns, targetHosts) {
  /** @param {number} moneyMax
   *  @param {number} hackChance
   *  @param {number} warmUpTime
  */
  function calculateHackSignificance(moneyMax, hackChance, targetHost) {
    const { weakenTime } = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
    const warmUpTime = weakenTime - ONE_WINDOW_DELAY;
    const averageWait = (warmUpTime + warmUpTime * APPROXIMATE_EMERGENCY_COUNT_IN_WARMUP_TIME_PERIOD) / 2;
    const potentialMoneyPerSecond = moneyMax / averageWait;
    return potentialMoneyPerSecond * hackChance;
  }

  const player = ns.getPlayer();
  return targetHosts.sort((hostA, hostB )=> {
    const serverA = ns.getServer(hostA);
    const serverB = ns.getServer(hostB);
    const hackSignificanceA = calculateHackSignificance(serverA.moneyMax, ns.formulas.hacking.hackChance(serverA, player), hostA);
    const hackSignificanceB = calculateHackSignificance(serverB.moneyMax, ns.formulas.hacking.hackChance(serverB, player), hostB);
    return hackSignificanceB - hackSignificanceA
  })
}

/** @param {NS} ns 
 *  @param {number} requiredRAM
 *  @param {string[]} executableHosts
 *  @return {string | undefined}
*/
function getHostForRequiredRAM(ns, requiredRAM, executableHosts, alternativeRAM = 0) {
  const sortedHostsByRAM = executableHosts
    .map(host => {
      const server = ns.getServer(host);
      return {
        host,
        ramLeft: server.maxRam - server.ramUsed
      }
    })
    .sort((serverA, serverB) => serverA.ramLeft - serverB.ramLeft);

  const foundedHostByRAM = sortedHostsByRAM
    .find(({ ramLeft }) => ramLeft > requiredRAM)?.host;

  if (!foundedHostByRAM && alternativeRAM) {
    return sortedHostsByRAM
      .filter(({ ramLeft }) => ramLeft > alternativeRAM)
      .pop()?.host;
  }

  return foundedHostByRAM;
}

/** @param {NS} ns 
 *  @param {string} targetHost
 *  @param {string[]} executableHosts
 *  @return {Promise<number[]>}
*/
async function prepareTargetDistributively(ns, targetHost, executableHosts) {
  // sorry for this code, it is temporary (I hope ;))
  ns.print(`Running ${targetHost} distributive preparation`);
  const pids = [];
  const prepareBatchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
  const {weakenTime, growTime} = prepareBatchInfo;
  const growSleepTime = weakenTime - growTime + ONE_WINDOW_DELAY;
  const growWeakenSleepTime = ONE_WINDOW_DELAY * 2;
  let weakenThreadsLeft = prepareBatchInfo.weakenThreads;
  let growThreadsLeft = prepareBatchInfo.growThreadsLeft;
  let growWeakenThreadsLeft = prepareBatchInfo.growWeakenThreads;

  var weakenThreadsToRun = weakenThreadsLeft;
  while (weakenThreadsLeft > 0) {
    const sortedExecutableHosts = executableHosts
      .map(host => {
        const server = ns.getServer(host);
        return {
          host,
          ramLeft: server.maxRam - server.ramUsed
        }
      })
      .filter(({ ramLeft }) => ramLeft > ns.getScriptRam(WEAKEN_SCRIPT_PATH))
      .sort((serverA, serverB) => serverB.ramLeft - serverA.ramLeft);
    const executableHost = sortedExecutableHosts[0]?.host;
    if (!executableHost) {
      await ns.sleep(ONE_WINDOW_DELAY);
      continue;
    }

    ns.scp([
      WEAKEN_SCRIPT_PATH,
      GROW_SCRIPT_PATH,
      HACK_SCRIPT_PATH
    ], executableHost);

    let pid;
    do {
      pid = ns.exec(WEAKEN_SCRIPT_PATH, executableHost, weakenThreadsToRun, targetHost);
      if (!pid) {
        weakenThreadsToRun = weakenThreadsToRun - 1;
      }
    } while (!pid)
    pids.push(pid);
    weakenThreadsLeft = weakenThreadsLeft - weakenThreadsToRun;
  }

  var growThreadsToRun = growThreadsLeft;
  while (growThreadsLeft > 0) {
    const sortedExecutableHosts = executableHosts
      .map(host => {
        const server = ns.getServer(host);
        return {
          host,
          ramLeft: server.maxRam - server.ramUsed
        }
      })
      .filter(({ ramLeft }) => ramLeft > ns.getScriptRam(GROW_SCRIPT_PATH))
      .sort((serverA, serverB) => serverB.ramLeft - serverA.ramLeft);
    const executableHost = sortedExecutableHosts[0]?.host;
    if (!executableHost) {
      await ns.sleep(ONE_WINDOW_DELAY);
      continue;
    }

    ns.scp([
      WEAKEN_SCRIPT_PATH,
      GROW_SCRIPT_PATH,
      HACK_SCRIPT_PATH
    ], executableHost);

    let pid;
    do {
      pid = ns.exec(GROW_SCRIPT_PATH, executableHost, growThreadsToRun, targetHost, growSleepTime);
      if (!pid) {
        growThreadsToRun = growThreadsToRun - 1;
      }
    } while (!pid)
    pids.push(pid);
    growThreadsLeft = growThreadsLeft - growThreadsToRun;
  }

  var growWeakenThreadsToRun = growWeakenThreadsLeft;
  while (growWeakenThreadsLeft > 0) {
    const sortedExecutableHosts = executableHosts
      .map(host => {
        const server = ns.getServer(host);
        return {
          host,
          ramLeft: server.maxRam - server.ramUsed
        }
      })
      .filter(({ ramLeft }) => ramLeft > ns.getScriptRam(WEAKEN_SCRIPT_PATH))
      .sort((serverA, serverB) => serverB.ramLeft - serverA.ramLeft);
    const executableHost = sortedExecutableHosts[0]?.host;
    if (!executableHost) {
      await ns.sleep(ONE_WINDOW_DELAY);
      continue;
    }

    ns.scp([
      WEAKEN_SCRIPT_PATH,
      GROW_SCRIPT_PATH,
      HACK_SCRIPT_PATH
    ], executableHost);

    let pid;
    do {
      pid = ns.exec(WEAKEN_SCRIPT_PATH, executableHost, growWeakenThreadsToRun, targetHost, growWeakenSleepTime);
      if (!pid) {
        growWeakenThreadsToRun = growWeakenThreadsToRun - 1;
      }
    } while (!pid)
    pids.push(pid);
    growWeakenThreadsLeft = growWeakenThreadsLeft - growWeakenThreadsToRun;
  }
  return pids;
}

/** @param {NS} ns 
 *  @param {string[]} targetHosts
 *  @param {string[]} executableHosts
 *  @return {Promise<{preparationPIDs: PIDSaver, maxWaitTime: number}>}
*/
async function prepareTargets(ns, targetHosts, executableHosts) {
  const preparationPIDs = new PIDSaver(ns);
  let maxWaitTime = 0;
  for (const targetHost of targetHosts) {
    const prepareBatchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);

    if ((prepareBatchInfo.growWeakenThreads + prepareBatchInfo.weakenThreads + prepareBatchInfo.growThreads) === 0) {
      ns.print(`Prepared ${targetHost} already`);
      continue;
    } else {
      const prepareWaitTime = prepareBatchInfo.weakenTime + ONE_WINDOW_DELAY * 2;
      if (maxWaitTime < prepareWaitTime) maxWaitTime = prepareWaitTime;
    }

    ns.print(`Running ${targetHost} preparation`);
    const { oneBatchRAM } = getRequiredRAMforBatch(
      ns,
      prepareBatchInfo.growWeakenThreads + prepareBatchInfo.weakenThreads,
      0,
      prepareBatchInfo.growThreads,
      0,
      0, // only one batch in one time
    );

    const isNeededExecutableHostExists = Boolean(executableHosts.find(host => ns.getServer(host).maxRam > oneBatchRAM));
    if (!isNeededExecutableHostExists) {
      const prepareBatchPIDs = await prepareTargetDistributively(ns, targetHost, executableHosts);
      preparationPIDs.addPIDs(targetHost, prepareBatchPIDs);
      continue;
    }

    let executableHost;
    let isFirstTimeWait = true;
    do {
      executableHost = getHostForRequiredRAM(ns, oneBatchRAM, executableHosts);
      if (!executableHost) {
        isFirstTimeWait && ns.print(`Waiting for host availability to prepare ${targetHost}`);
        await ns.sleep(ONE_WINDOW_DELAY);
      }
      isFirstTimeWait = false;
    } while (!executableHost);

    ns.scp([
      WEAKEN_SCRIPT_PATH,
      GROW_SCRIPT_PATH,
      HACK_SCRIPT_PATH
    ], executableHost);

    const prepareBatchPIDs = sendPrepareBatch(
      ns,
      executableHost,
      targetHost,
      prepareBatchInfo.weakenThreads,
      prepareBatchInfo.growWeakenThreads,
      prepareBatchInfo.growThreads,
      prepareBatchInfo.weakenTime,
      prepareBatchInfo.growTime
    );
    preparationPIDs.addPIDs(targetHost, prepareBatchPIDs);
  }
  return {
    preparationPIDs,
    maxWaitTime,
  }
}

/** @param {NS} ns 
 *  @param {string} targetHost
 *  @param {number} requiredRAM
 *  @return {boolean}
*/
function emergencyCheck(ns, targetHost) {
  const targetServer = ns.getServer(targetHost);
  let allowedMoneyLeft = targetServer.moneyMax;
  for (let hackRound = 1; hackRound <= MAX_HACK_TIMES_EMERGENCY_CHECK; hackRound++) {
    allowedMoneyLeft = allowedMoneyLeft - allowedMoneyLeft * HACK_AMOUNT_MULTIPLIER;
  }
  const isMoneyAvailableCheckPassed = targetServer.moneyAvailable > allowedMoneyLeft;
  return isMoneyAvailableCheckPassed;
}

/** @param {NS} ns 
 *  @param {{
      batchInfo,
      requiredRAM,
      executableHost,
      targetHost,
      state
    }[]} batchesInfo
*/
function printBatchesInfo(ns, batchesInfo) {
  ns.clearLog();
  printTable(
    ns,
    'Running batches',
    ['Target', 'Host', 'Warm Up Time', 'State'],
    batchesInfo.map(({
      batchInfo,
      executableHost,
      targetHost,
      state
    }) => [
      targetHost,
      executableHost,
      getHMSStringDate(batchInfo.weakenTime - ONE_WINDOW_DELAY),
      state
    ])
  );
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();

  const flags = ns.flags([
    ['prepareOnly', false],
    ['p', false],
    ['monitorTargets', false],
    ['preparedOnly', false],
  ]);

  let targetHosts = getAllHostsToHack(ns)
    .filter(host => isAbleToGetRoot(ns, host));
  targetHosts.forEach(host => getAdminRights(ns, host));
  const myServerHosts = new Set(getMyServerNames(ns));
  const executableHosts = getAllHostsToExecute(ns)
    .filter(host => myServerHosts.has(host) || isAbleToGetRoot(ns, host));
  executableHosts.forEach(host => myServerHosts.has(host) || getAdminRights(ns, host));

  if (!flags.preparedOnly) {
    ns.print('----- Prepairing targets -----');
    const { preparationPIDs, maxWaitTime } = await prepareTargets(ns, targetHosts, executableHosts);

    ns.print('----- Waiting for all preparations end -----');
    if (preparationPIDs.getAllPIDs().length) {
      ns.print(`Approximate wait time: ${getHMSStringDate(maxWaitTime)}`);
    }
    while (preparationPIDs.getAllPIDs().length) {
      await ns.sleep(ONE_WINDOW_DELAY);
    }

    const nonPreparedTargets = targetHosts.filter(targetHost => {
      const batchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
      return batchInfo.weakenThreads || batchInfo.growWeakenThreads || batchInfo.growThreads;
    });
    if (nonPreparedTargets.length) {
      ns.print('Some targets are ill-prepared!');
      ns.print('It might happen due to distributuve preparation, wrong calculation of batch required RAM or batch timings.');
      ns.print('You can try to increase corrective for RAM calculation, play with batch timings or distributuve preparation logic.');
      ns.print('Otherwise, just restart the Manager. You can use --preparedOnly flag also');
      ns.print(`Non-prepared targets: ${nonPreparedTargets.join(', ')}`);
      return;
    }
  } else {
    targetHosts = targetHosts.filter(targetHost => {
      const batchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
      return !(batchInfo.weakenThreads || batchInfo.growWeakenThreads || batchInfo.growThreads);
    })
  }

  if (flags.prepareOnly || flags.p) return;

  ns.print('----- Distributing targets to executable servers -----');
  const batchingStates = {
    processing: 'Process',
    emergency: 'Emergency',
    emergencyRecovering: 'Recovery',
    warmUp: 'Warm Up',
  };
  const sortedTargetsToHack = getSortedTargetsToHack(ns, targetHosts);
  const nonDistributedExecutableHostsSet = new Set(executableHosts);
  const batchesInfo = sortedTargetsToHack
    .map(targetHost => {
      const batchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
      const { batchRequiredRam, oneBatchRAM } = getRequiredRAMforBatch(
        ns,
        batchInfo.predictedGrowWeakenThreads,
        batchInfo.predictedHackWeakenThreads,
        batchInfo.predictedGrowThreads,
        batchInfo.hackThreads,
        batchInfo.weakenTime
      );
      const executableHost = getHostForRequiredRAM(ns, batchRequiredRam, [...nonDistributedExecutableHostsSet], oneBatchRAM);
      if (!executableHost) {
        ns.print(`No free executable host with required RAM found for ${targetHost}, required RAM: ${batchRequiredRam / 1024} TB`);
        return;
      }
      nonDistributedExecutableHostsSet.delete(executableHost);

      return {
        batchInfo,
        batchRequiredRam,
        executableHost,
        targetHost,
        state: batchingStates.warmUp,
        warmUpEndTime: new Date().getTime() + batchInfo.weakenTime - ONE_WINDOW_DELAY,
      }
    })
    .filter(Boolean);

  batchesInfo.forEach(({ executableHost }) => 
    ns.scp([
      WEAKEN_SCRIPT_PATH,
      GROW_SCRIPT_PATH,
      HACK_SCRIPT_PATH
    ], executableHost)
  )

  const thisHostName = ns.getHostname();
  if (flags.monitorTargets) {
    batchesInfo.forEach(({ targetHost }) => ns.exec(MONITOR_SCRIPT_PATH, thisHostName, 1, targetHost));
  }

  const emergencyPreparePids = new PIDSaver(ns);
  const thisScriptName = ns.getScriptName();
  let bestIncomeRate = 0;
  while (true) {
    batchesInfo.forEach(({
      batchInfo,
      executableHost,
      targetHost,
      state,
      warmUpEndTime
    }, index) => {
      switch(state) {
        case batchingStates.warmUp:
          if (warmUpEndTime <= new Date().getTime()) batchesInfo[index].state = batchingStates.processing;
          // send batches as usual
        case batchingStates.processing:
          sendBatch(
            ns,
            executableHost,
            targetHost,
            batchInfo.predictedHackWeakenThreads,
            batchInfo.predictedGrowWeakenThreads,
            batchInfo.predictedGrowThreads,
            batchInfo.hackThreads,
            batchInfo.weakenTime,
            batchInfo.growTime,
            batchInfo.hackTime
          );
          const isEmergencyCheckPassed = emergencyCheck(ns, targetHost);
          if (!isEmergencyCheckPassed) {
            ns.killall(executableHost, true);
            const prepareInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
            const emergencyPids = sendPrepareBatch(
              ns,
              executableHost,
              targetHost,
              prepareInfo.weakenThreads,
              prepareInfo.growWeakenThreads,
              prepareInfo.growThreads,
              prepareInfo.weakenTime,
              prepareInfo.growTime
            );
            if (emergencyPids.every(pid => pid > 0)) {
              batchesInfo[index].state = batchingStates.emergencyRecovering;
              emergencyPreparePids.addPIDs(targetHost, emergencyPids);
            } else {
              batchesInfo[index].state = batchingStates.emergency;
            }
          }
          break;
        case batchingStates.emergencyRecovering:
          if (!emergencyPreparePids.getPIDs(targetHost).length) {
            batchesInfo[index].batchInfo = getServerHackingInfoBatch(ns, targetHost, HACK_AMOUNT_MULTIPLIER);
            batchesInfo[index].state = batchingStates.warmUp;
            batchesInfo[index].warmUpEndTime = new Date().getTime() + batchInfo.weakenTime - ONE_WINDOW_DELAY;
          }
          break;
      }
    })

    printBatchesInfo(ns, batchesInfo);
    ns.print(`Brings money at this moment: ${batchesInfo.filter(({ state }) => state === batchingStates.processing).length} / ${batchesInfo.length}`);

    const currentIncomeRate = ns.getScriptIncome(thisScriptName, thisHostName, ...ns.args);
    if (currentIncomeRate > bestIncomeRate) bestIncomeRate = currentIncomeRate;
    ns.print(`Current / Best income rate: ${convertNumberToSuffixedString(currentIncomeRate)} / ${convertNumberToSuffixedString(bestIncomeRate)}`);

    await ns.sleep(WINDOW_BETWEEN_BATCHES);
  }
}
