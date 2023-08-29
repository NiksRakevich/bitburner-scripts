import { 
  getBestAvailableTargetsToHackDESCLite,
  getAdminRights,
  getServersHackingInfoLite,
  getAllHostsToExecute,
  getAvailableRAM,
  disableHelplessLogs,
  IGNORE_HOST_NAME_TO_HACK_REGEXP,
  PIDSaver
} from 'utils.js';

//Strategy config
const WEAKEN_MAX_THREADS_TO_RUN_HACK = 15;
const GROW_MAX_THREADS_TO_RUN_HACK = 10;
const WEAKEN_THREADS_FOR_GROW_MULTIPLIER = 1.2;
const WEAKEN_THREADS_FOR_HACK_MULTIPLIER = 1.2;
const SLEEP_TIME_BETWEEN_NEW_RUN = 1000 * 2;
const DO_NOT_USE_HOME_TO_EXECUTE = false;
const LEFT_HOME_RAM = 2 ** 5;
const DEFAULT_SOLDIER_NAME = './distributiveHackSoldier.js';

/** @param {NS} ns */
function mobilizeHackSoldiers(ns, hackType, targetHost, threads) {
  const runnedPIDs = [];
  var threadsRequired = threads;
  if (threadsRequired <= 0) {
    return runnedPIDs;
  }
  const SOLDIER_NAME = ns.args[0] || DEFAULT_SOLDIER_NAME;
  const soldierRequiredRam = ns.getScriptRam(SOLDIER_NAME);
  const executableServersWithThreadsAvailable = getAllHostsToExecute(ns)
    .map(host => ({
      host,
      threadsToRunAvailable: Math.floor( (host !== 'home' ? getAvailableRAM(ns, host) : (getAvailableRAM(ns, host) - LEFT_HOME_RAM)) / soldierRequiredRam )
    }))
    .filter(({ host, threadsToRunAvailable }) => 
      ((DO_NOT_USE_HOME_TO_EXECUTE ? host !== 'home' : true) &&
      (threadsToRunAvailable > 0))
    )
    .sort((infoA, infoB) => infoA.threadsToRunAvailable - infoB.threadsToRunAvailable);
  executableServersWithThreadsAvailable.forEach(({ host }) => host.match(IGNORE_HOST_NAME_TO_HACK_REGEXP) || getAdminRights(ns, host));

  while (executableServersWithThreadsAvailable.length && threadsRequired > 0) {
    const serverInfoToExecute = executableServersWithThreadsAvailable.pop();
    ns.scp(SOLDIER_NAME, serverInfoToExecute.host);

    var threadsToRunInExecutable = 0;
    if (threadsRequired > serverInfoToExecute.threadsToRunAvailable) {
      threadsToRunInExecutable = serverInfoToExecute.threadsToRunAvailable;
    } else {
      threadsToRunInExecutable = threadsRequired;
    }

    const PID = ns.exec(SOLDIER_NAME, serverInfoToExecute.host, threadsToRunInExecutable, hackType, targetHost);
    runnedPIDs.push(PID);
    threadsRequired = threadsRequired - threadsToRunInExecutable;
  }
  return runnedPIDs;
}

/** @param {NS} ns */
function runStrategyForHackSoldiers(ns, targetServerInfo, pidSaver) {
  const target = targetServerInfo.server.hostname;
  if (pidSaver.getPIDs(target).length) return;

  if (
    targetServerInfo.weakenThreads > WEAKEN_MAX_THREADS_TO_RUN_HACK ||
    targetServerInfo.growThreads > GROW_MAX_THREADS_TO_RUN_HACK
  ) {
    //exec weaken threads + grow threads
    targetServerInfo.weakenThreads = Math.round(targetServerInfo.weakenThreads * WEAKEN_THREADS_FOR_GROW_MULTIPLIER);
    pidSaver.addPIDs(target, mobilizeHackSoldiers(ns, 'weaken', target, targetServerInfo.weakenThreads));
    pidSaver.addPIDs(target, mobilizeHackSoldiers(ns, 'grow', target, targetServerInfo.growThreads));
  } else {
    //exec weaken threads + hack threads
    targetServerInfo.weakenThreads = Math.round(targetServerInfo.weakenThreads * WEAKEN_THREADS_FOR_HACK_MULTIPLIER);
    pidSaver.addPIDs(target, mobilizeHackSoldiers(ns, 'weaken', target, targetServerInfo.weakenThreads));
    pidSaver.addPIDs(target, mobilizeHackSoldiers(ns, 'hack', target, targetServerInfo.hackThreads));
  }
}

/** @param {NS} ns */
export async function main(ns) {
  disableHelplessLogs(ns);
  const pidSaver = new PIDSaver(ns);
  while (true) {
    const targetServersAvailableToHack = getBestAvailableTargetsToHackDESCLite(ns).map(({ server }) => server);
    targetServersAvailableToHack.forEach(server => getAdminRights(ns, server.hostname));
    const targetServersInfo = getServersHackingInfoLite(ns, targetServersAvailableToHack);
    targetServersInfo.forEach(targetServerInfo => {
      runStrategyForHackSoldiers(ns, targetServerInfo, pidSaver);
    })
    await ns.sleep(SLEEP_TIME_BETWEEN_NEW_RUN);
  }
}
