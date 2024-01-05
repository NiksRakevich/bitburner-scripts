import {
  getBestAvailableTargetsToHackDESCLite,
  getAllHostsToExecute,
  getAdminRights,
} from 'utils.js';

const SIMPLE_HACK_SCRIPT_NAME = './simpleHack.js';

/** @param {NS} ns */
export async function main(ns) {
  const busyHosts = new Set();
  const targetsInProgress = new Set();
  while (true) {
    const scriptRamRequired = ns.getScriptRam(SIMPLE_HACK_SCRIPT_NAME);

    const targets = getBestAvailableTargetsToHackDESCLite(ns)
      .map(({ server }) => server.hostname)
      .filter(targetHost => !targetsInProgress.has(targetHost));
    targets.forEach(targetHost => getAdminRights(ns, targetHost));

    const hostsInfo = getAllHostsToExecute(ns).map(host => ({
      ram: ns.getServer(host).maxRam,
      host,
    }))
    .filter(host => !busyHosts.has(host) && host.ram >= scriptRamRequired)
    .sort((hostInfoA, hostInfoB) => hostInfoA.ram - hostInfoB.ram);

    hostsInfo.forEach(({ host }) => getAdminRights(ns, host));

    targets.forEach(targetHost => {
      const hostInfo = hostsInfo.pop();
      if (hostInfo) {
        ns.scp(SIMPLE_HACK_SCRIPT_NAME, hostInfo.host, 'home');
        ns.exec(SIMPLE_HACK_SCRIPT_NAME, hostInfo.host, Math.floor(hostInfo.ram / scriptRamRequired), targetHost);
        busyHosts.add(hostInfo.host);
        targetsInProgress.add(targetHost);
      }
    })

    await ns.sleep(1000 * 5);
  }
}