import { disableHelplessLogs } from './utils.js';

const PURCHASE_RAM = 2 ** 1;
const SLEEP_TIME_MS = 1000 * 10;
const UPGRADE_SERVER_RAM_MULTIPLIER = 2; //must be a power of 2
const MAX_RAM_TO_UPGRADE = 2 ** 20; //must be a power of 2 (MAX 2 ** 20)

/** @param {NS} ns */
function getHostsToUpgradeAndSort(ns) {
  return ns.getPurchasedServers()
    .filter(host => ns.getServerMaxRam(host) < MAX_RAM_TO_UPGRADE)
    .sort((hostA, hostB) => ns.getServerMaxRam(hostA) - ns.getServerMaxRam(hostB))
}

/** @param {NS} ns 
 *  @param {string} hostToUpgrade
*/
async function upgradeServer(ns, hostToUpgrade) {
  const serverCurrentRAM = ns.getServerMaxRam(hostToUpgrade);
  const serverNextRAM = serverCurrentRAM * UPGRADE_SERVER_RAM_MULTIPLIER;
  const upgradeCost = ns.getPurchasedServerUpgradeCost(hostToUpgrade, serverNextRAM);

  ns.print(`Will upgrade ${hostToUpgrade} to ${serverNextRAM} GB RAM, cost: ${upgradeCost}`);
  while (ns.getServerMoneyAvailable('home') < upgradeCost) {
    await ns.sleep(SLEEP_TIME_MS);
  }
  ns.upgradePurchasedServer(hostToUpgrade, serverNextRAM);
}

/** @param {NS} ns 
 *  @param {string} name
*/
async function purchaseServer(ns, name) {
  const purchaseCost = ns.getPurchasedServerCost(PURCHASE_RAM);

  ns.print(`Will purchase server with ${PURCHASE_RAM} GB RAM, cost: ${purchaseCost}`);
  while (ns.getServerMoneyAvailable('home') < purchaseCost) {
    await ns.sleep(SLEEP_TIME_MS);
  }
  ns.purchaseServer(name, PURCHASE_RAM);
}

/** @param {NS} ns */
export async function main(ns) {
  disableHelplessLogs(ns);

  const flags = ns.flags([
    ['maxUpgradeFirst', false],
    ['muf', false],
    ['name', 'myserv']
  ])

  const purchasedServerLimit = ns.getPurchasedServerLimit();
  if (flags.maxUpgradeFirst || flags.muf) {
    var hostsToUpgrade = getHostsToUpgradeAndSort(ns).reverse();
    while (hostsToUpgrade.length) {
      const [hostToUpgrade] = hostsToUpgrade;
      await upgradeServer(ns, hostToUpgrade);
      hostsToUpgrade = getHostsToUpgradeAndSort(ns).reverse();
      if (!hostsToUpgrade.length && ns.getPurchasedServers().length < purchasedServerLimit) {
        await purchaseServer(ns, flags.name);
      }
    }
  } else {
    while (ns.getPurchasedServers().length < purchasedServerLimit) {
      await purchaseServer(ns, flags.name);
    }
    var hostsToUpgrade = getHostsToUpgradeAndSort(ns);
    while (hostsToUpgrade.length) {
      const [hostToUpgrade] = hostsToUpgrade;
      await upgradeServer(ns, hostToUpgrade);
      hostsToUpgrade = getHostsToUpgradeAndSort(ns);
    }
  }
  ns.print('Done');
}
