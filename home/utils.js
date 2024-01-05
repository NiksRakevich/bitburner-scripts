export const HACK_PROGRAM_LIST = ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];
export const IGNORE_HOST_NAME_TO_HACK_REGEXP = /myserv|darkweb|home/;
export const HELPLESS_HOST_NAMES = /darkweb/;
export const GROW_SECURITY_RAISING = 0.004;

/** @param {NS} ns */
export function disableHelplessLogs(ns) {
  ns.disableLog('ALL');
  ns.enableLog('purchaseServer');
  ns.enableLog('upgradePurchasedServer');
  ns.enableLog('scp');
  ns.enableLog('exec');
}

/** @param {number} time 
 *  @return {string}
*/
export function getHMSStringDate(time) {
  return new Date(time).toISOString().split('T')[1].split('.')[0];
}

/** @param {NS} ns
 *  @param {string} host
 *  @param {string} scriptName
*/
export function getMaxThreadsForScript(ns, host, scriptName) {
  return Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ns.getScriptRam(scriptName));
}

/** @param {NS} ns 
 *  @return {string[]}
*/
export function getAllHosts(ns) {
  const found = new Set();

  /** @param {string} parent */
  function getHostsOfNode(parent) {
    const childs = ns
      .scan(parent)
      .filter(child => 
        child !== parent &&
        !child.match(HELPLESS_HOST_NAMES) &&
        !found.has(child)
      );

    if (!childs.length) {
      return found;
    }
    childs.forEach(child => found.add(child));
    childs.forEach(child => getHostsOfNode(child));
  }

  getHostsOfNode('home');
  return [...found];
}

/** @param {NS} ns 
 *  @param {string} host
*/
export function isAbleToGetRoot(ns, host) {
  const ableToOpenPortsCount = HACK_PROGRAM_LIST.filter(name => ns.fileExists(name, 'home')).length;

  return ns.getServerNumPortsRequired(host) <= ableToOpenPortsCount &&
    ns.getServerRequiredHackingLevel(host) <= ns.getPlayer().skills.hacking &&
    !host.match(IGNORE_HOST_NAME_TO_HACK_REGEXP)
}

/** @param {NS} ns */
export function getAllHostsToHack(ns) {
  return getAllHosts(ns)
      .filter(host => !host.match(IGNORE_HOST_NAME_TO_HACK_REGEXP) && ns.getServer(host).moneyAvailable > 0);
}

/** @param {NS} ns */
export function getAllHostsToExecute(ns) {
  return getAllHosts(ns)
      .filter(host => 
        ns.getServerMaxRam(host) &&
        (host.match(IGNORE_HOST_NAME_TO_HACK_REGEXP) || isAbleToGetRoot(ns, host))
      );
}

/** @param {NS} ns */
export function getMyServers(ns) {
  return ns
    .getPurchasedServers()
    .map(name => ns.getServer(name));
}

/** @param {NS} ns */
export function getMyServerNames(ns) {
  return getMyServers(ns)
    .map(({ hostname }) => hostname);
}

/** @param {NS} ns
 *  @param {string} host
*/
export function getAvailableRAM(ns, host) {
  return ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
}

/** @param {NS} ns
 *  @param {string[]} executableHosts
*/
export function getTotalAvailableRAM(ns, executableHosts) {
  return executableHosts.reduce((totalRAM, host) => totalRAM + getAvailableRAM(ns, host), 0);
}

/** @param {NS} ns 
 *  @param {string} host
*/
export function getAdminRights(ns, host) {
  const HACK_PROGRAM_MAP = new Map([
    ['BruteSSH.exe', ns.brutessh],
    ['FTPCrack.exe', ns.ftpcrack],
    ['relaySMTP.exe', ns.relaysmtp],
    ['HTTPWorm.exe', ns.httpworm],
    ['SQLInject.exe', ns.sqlinject]
  ]);

  [...HACK_PROGRAM_MAP.entries()].forEach(([fileName, hackTool]) => {
    if (ns.fileExists(fileName, 'home')) {
      hackTool(host);
    }
  });

  ns.nuke(host);
}

//should be prepared before in order to have correct sorting for batch!
/** @param {NS} ns */
export function getBestAvailableTargetsToHackDESC(ns) {
  const player = ns.getPlayer();
  const hosts = getAllHostsToHack(ns);
  const hostsAvailableToHack = hosts.filter(host => isAbleToGetRoot(ns, host));
  return hostsAvailableToHack.map(host => {
    const server = ns.getServer(host);
    const hackSignificance = server.moneyMax * ns.formulas.hacking.hackChance(server, player);
    return {
      hackSignificance,
      server
    }
  })
  .filter(({ server }) => server.moneyMax)
  .sort((a, b) => b.hackSignificance - a.hackSignificance);
}

/** @param {NS} ns */
export function getBestAvailableTargetsToHackDESCLite(ns) {
  const hosts = getAllHostsToHack(ns);
  const hostsAvailableToHack = hosts.filter(host => isAbleToGetRoot(ns, host));
  return hostsAvailableToHack.map(host => {
    const server = ns.getServer(host);
    const hackSignificance = server.moneyMax;
    return {
      hackSignificance,
      server
    }
  })
  .filter(({ server }) => server.moneyMax)
  .sort((a, b) => b.hackSignificance - a.hackSignificance);
}

/** @param {NS} ns
 *  @param {number} growThreads
*/
export function predictWeakenThreadsForGrow(ns, growThreads) {
  const growSecurityAddition = growThreads * GROW_SECURITY_RAISING;
  var weakenThreads = 0;
  var securityDecrease = 0;
  while (growSecurityAddition - securityDecrease > 0) {
    securityDecrease = ns.weakenAnalyze(weakenThreads, 1);
    weakenThreads++;
  }
  return weakenThreads;
}

/** @param {NS} ns
 *  @param {number} hackThreads
 *  @param {string} targetHost
*/
export function predictWeakenThreadsForHack(ns, hackThreads, targetHost) {
  const hackSecurityAddition = ns.hackAnalyzeSecurity(hackThreads, targetHost);
  var weakenThreads = 0;
  var securityDecrease = 0;
  while (hackSecurityAddition - securityDecrease > 0) {
    securityDecrease = ns.weakenAnalyze(weakenThreads, 1);
    weakenThreads++;
  }
  return weakenThreads;
}

/** @param {NS} ns
 *  @param {Server} server
*/
export function getWeakenThreadsToMinimizeSecurity(ns, server) {
  const currentSecurityLevel = server.hackDifficulty;
  const minSecurityLevel = server.minDifficulty;
  var weakenThreads = 0;
  var securityDecrease = 0;
  while (currentSecurityLevel - securityDecrease > minSecurityLevel) {
    securityDecrease = ns.weakenAnalyze(weakenThreads, 1);
    weakenThreads++;
  }
  return weakenThreads;
}

/** @param {NS} ns
 *  @param {Server[]} servers
*/
export function getServersHackingInfo(ns, servers, targetMoneyMultiplier = 0.9, leftMoneyByHackMultiplier = 0.1) {
  const player = ns.getPlayer();
  return servers.map(server => {
    const weakenTime = ns.formulas.hacking.weakenTime(server, player);
    const growTime = ns.formulas.hacking.growTime(server, player);
    const hackTime = ns.formulas.hacking.hackTime(server, player);
    const growThreads = ns.formulas.hacking.growThreads(server, player, Math.round(server.moneyMax * targetMoneyMultiplier), 1);
    const hackThreads = Math.round(ns.hackAnalyzeThreads(server.hostname, server.moneyAvailable * (1 - leftMoneyByHackMultiplier)));

    const weakenThreads = getWeakenThreadsToMinimizeSecurity(ns, server);

    return {
      server,
      weakenTime,
      growTime,
      hackTime,
      weakenThreads,
      growThreads,
      hackThreads
    }
  })
}

/** @param {NS} ns 
 *  @param {string} targetHost
*/
export function getServerHackingInfoBatch(ns, targetHost, hackAmountMultiplier = 0.9) { 
  const player = ns.getPlayer();
  const targetServer = ns.getServer(targetHost);
  const hackAmount = targetServer.moneyMax * hackAmountMultiplier; // seems like works great when it is integer;
  const predictedMoneyLeft = targetServer.moneyMax - hackAmount;
  const predictedGrowMultiplier = targetServer.moneyMax / predictedMoneyLeft;

  const growTime = ns.formulas.hacking.growTime(targetServer, player);
  const hackTime = ns.formulas.hacking.hackTime(targetServer, player);
  const weakenTime = ns.formulas.hacking.weakenTime(targetServer, player);

  const weakenThreads = getWeakenThreadsToMinimizeSecurity(ns, targetServer);
  const growThreads = ns.formulas.hacking.growThreads(targetServer, player, targetServer.moneyMax, 1);
  const growWeakenThreads = predictWeakenThreadsForGrow(ns, growThreads, targetHost);

  const hackThreads = Math.floor(ns.hackAnalyzeThreads(targetServer.hostname, hackAmount));
  const predictedHackWeakenThreads = predictWeakenThreadsForHack(ns, hackThreads, targetHost);
  const predictedGrowThreads = Math.ceil(ns.growthAnalyze(targetHost, predictedGrowMultiplier)); //seems like can be smaller than needed
  const predictedGrowWeakenThreads = predictWeakenThreadsForGrow(ns, predictedGrowThreads, targetHost);

  return {
    targetServer,
    weakenTime: Math.ceil(weakenTime),
    growTime: Math.ceil(growTime),
    hackTime: Math.ceil(hackTime),
    weakenThreads,
    growThreads,
    growWeakenThreads,
    hackThreads,
    predictedGrowThreads,
    predictedGrowWeakenThreads,
    predictedHackWeakenThreads
  }
}

/** @param {number} currentMoney 
 *  @param {number} targetMoney
 *  @param {number} percentage
*/
export function calculateThreadsToGrowLite(currentMoney, targetMoney, percentage) {
  return Math.round(Math.log(targetMoney / currentMoney) / Math.log(1 + percentage / 100));
}

/** @param {NS} ns 
 *  @param {Server[]} servers
*/
export function getServersHackingInfoLite(ns, servers, targetMoneyMultiplier = 0.9, leftMoneyByHackMultiplier = 0.1) {
  return servers.map(server => {
    const SUPPOSED_GROW_PERCENT = 5;
    const growThreads = calculateThreadsToGrowLite(server.moneyAvailable, Math.floor(server.moneyMax * targetMoneyMultiplier), SUPPOSED_GROW_PERCENT);
    const hackThreads = Math.round(ns.hackAnalyzeThreads(server.hostname, server.moneyAvailable * (1 - leftMoneyByHackMultiplier)));

    const currentSecurityLevel = server.hackDifficulty;
    const minSecurityLevel = server.minDifficulty;
    var weakenThreads = 0;
    var securityDecrease = 0;
    while (currentSecurityLevel - securityDecrease > minSecurityLevel) {
      securityDecrease = ns.weakenAnalyze(weakenThreads, 1);
      weakenThreads++;
    }

    return {
      server,
      weakenThreads,
      growThreads,
      hackThreads
    }
  })
}

export class PIDSaver {
  /** @param {NS} ns */
  constructor(ns) {
    this.targetPIDMap = new Map();
    this.ns = ns;
  }

  /** @param {string} target 
   *  @param {number[]} PIDs
   *  @return {number[]}
  */
  addPIDs(target, PIDs) {
    if (this.targetPIDMap.has(target)) {
      const PIDSet = this.targetPIDMap.get(target);
      PIDs.forEach(PID => PID && PIDSet.add(PID));
    } else {
      this.targetPIDMap.set(target, new Set(PIDs));
    }
    return [...this.targetPIDMap.get(target)];
  }

  /** @param {string} target 
   *  @return {number[]}
  */
  getPIDs(target) {
    if (!this.targetPIDMap.has(target)) return [];

    const updatedTargetPIDs = [...this.targetPIDMap.get(target)]
      .filter(PID => this.ns.getRunningScript(PID));
    this.targetPIDMap.set(target, new Set(updatedTargetPIDs));
    return updatedTargetPIDs;
  }

  getAllPIDs() {
    return [...this.targetPIDMap.keys()]
    .map(target => this.getPIDs(target))
    .reduce((allPIDs, targetPIDs) => {
      allPIDs.push(...targetPIDs);
      return allPIDs;
    }, []);
  }

  /**  @return {string[]} */
  getAllTargets() {
    return [...this.targetPIDMap.keys()];
  }
}

/** @param {NS} ns
 *  @param {number} PID
*/
export async function waitForProcessEnd(ns, PID) { //WARNING: cause "exec: RAM usage could not be calculated" error if exec in loop
  if (!PID) return;
  const isSleepLogWasEnabled = ns.isLogEnabled('sleep');
  const isGetRunningScriptLogWasEnabled = ns.isLogEnabled('getRunningScript');
  ns.disableLog('sleep');
  ns.disableLog('getRunningScript');

  while(ns.getRunningScript(PID)) {
    await ns.sleep(1000 * 1);
  }

  isSleepLogWasEnabled && ns.enableLog('sleep');
  isGetRunningScriptLogWasEnabled && ns.enableLog('getRunningScript');
}

/** @param {NS} ns
 *  @param {string} tableName
 *  @param {string[]} headers
 *  @param {string[][]} data
*/
export function printTable(ns, tableName, headers, data) {
  const SEPARATOR = '| ';
  const SPACE = ' ';
  const DASH = '-';
  function generateString(strSymbol, length) {
    var str = '';
    for(let i = 0; i <= length; i++) {
      str += strSymbol;
    }
    return str;
  }

  const cellsWidths = [headers, ...data].reduce((widths, rows) => {
    rows.forEach((cellData, index) => {
      if (widths[index] < cellData.toString().length) {
        widths[index] = cellData.toString().length;
      }
    })
    return widths;
  }, new Array(headers.length).fill(0));

  const trimmedHeaders = headers.map((cellData, index) => {
    const spacesToAdd = cellsWidths[index] - cellData.toString().length;
    return cellData + generateString(SPACE, spacesToAdd);
  })
  const trimmedData = data.map(row => row.map((cellData, index) => {
    const spacesToAdd = cellsWidths[index] - cellData.toString().length;
    return cellData + generateString(SPACE, spacesToAdd);
  }))

  const headerStr = trimmedHeaders.join(SEPARATOR);
  const dashesToAddToTableName = headerStr.length - tableName.length - 2;
  const tableNameDashes = generateString(DASH, Math.floor(dashesToAddToTableName / 2));
  ns.print(tableNameDashes + ' ' + tableName + ' ' + tableNameDashes);
  ns.print(headerStr);
  trimmedData.forEach(row => ns.print(row.join(SEPARATOR)));
}

/** @param {number} number
 *  @param {string[]} suffixes
*/
export function convertNumberToSuffixedString(number, suffixes = ['$/s', 'k/s', 'm/s', 'b/s', 't/s', 'q/s', 'Q/s']) {
  let devidedTimes = 0;
  while (
    number.toFixed().length > 3 &&
    suffixes.length - 1 > devidedTimes
  ) {
    number /= 1000;
    devidedTimes += 1;
  }
  return number.toFixed(3) + ' ' + suffixes[devidedTimes];
}
