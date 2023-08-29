import { disableHelplessLogs } from './utils.js';

const SLEEP_TIME_MS = 1000 * 10;

/** @param {NS} ns 
 *  @param {number} index
*/
async function upgradeNodeLevelToMax(ns, index) {
  var upgradeCost = ns.hacknet.getLevelUpgradeCost(index);

  while (upgradeCost !== Infinity) {
    ns.print(`Will upgrade node #${index} to MAX Level, cost: ${upgradeCost}`);
    while (ns.getServerMoneyAvailable('home') < upgradeCost) {
      await ns.sleep(SLEEP_TIME_MS);
    }
    ns.hacknet.upgradeLevel(index);
    upgradeCost = ns.hacknet.getLevelUpgradeCost(index);
  }
}

/** @param {NS} ns 
 *  @param {number} index
*/
async function upgradeNodeRamToMax(ns, index) {
  var upgradeCost = ns.hacknet.getRamUpgradeCost(index);

  while (upgradeCost !== Infinity) {
    ns.print(`Will upgrade node #${index} to MAX RAM, cost: ${upgradeCost}`);
    while (ns.getServerMoneyAvailable('home') < upgradeCost) {
      await ns.sleep(SLEEP_TIME_MS);
    }
    ns.hacknet.upgradeRam(index);
    upgradeCost = ns.hacknet.getRamUpgradeCost(index);
  }
}

/** @param {NS} ns 
 *  @param {number} index
*/
async function upgradeNodeCoresToMax(ns, index) {
  var upgradeCost = ns.hacknet.getCoreUpgradeCost(index);

  while (upgradeCost !== Infinity) {
    ns.print(`Will upgrade node #${index} to MAX Cores, cost: ${upgradeCost}`);
    while (ns.getServerMoneyAvailable('home') < upgradeCost) {
      await ns.sleep(SLEEP_TIME_MS);
    }
    ns.hacknet.upgradeCore(index);
    upgradeCost = ns.hacknet.getCoreUpgradeCost(index);
  }
}

/** @param {NS} ns 
 *  @param {number} index
*/
async function upgradeNodeToMax(ns, index) {
  await upgradeNodeLevelToMax(ns, index);
  await upgradeNodeRamToMax(ns, index);
  await upgradeNodeCoresToMax(ns, index);
}

/** @param {NS} ns */
async function purchaseNode(ns) {
  const purchaseCost = ns.hacknet.getPurchaseNodeCost();

  ns.print(`Will purchase node, cost: ${purchaseCost}`);
  while (ns.getServerMoneyAvailable('home') < purchaseCost) {
    await ns.sleep(SLEEP_TIME_MS);
  }
  ns.hacknet.purchaseNode();
}

/** @param {NS} ns */
export async function main(ns) {
  disableHelplessLogs(ns);

  let nextNodeIndex = 0;
  for (let index = 0; index < ns.hacknet.numNodes(); index++) {
    await upgradeNodeToMax(ns, index);
    nextNodeIndex++;
  }
  const purchasedNodesLimit = ns.hacknet.maxNumNodes();
  while (ns.hacknet.numNodes() < purchasedNodesLimit) {
    await purchaseNode(ns);
    await upgradeNodeToMax(ns, nextNodeIndex);
    nextNodeIndex++;
  }
  ns.print('Done'); // :)
}
