/** @param {NS} ns */
export async function main(ns) {
  const REQUIRED_MAX_MONEY_PERCENTAGE = 0.9;
  const REQUIRED_MIN_SECYRITY_LEVEL_ADDITION = 1;
  const TARGET_NAME = ns.args[0];
  if (!TARGET_NAME) {
    ns.print('No target host name specified');
  }

  const maxMoney = ns.getServerMaxMoney(TARGET_NAME) * REQUIRED_MAX_MONEY_PERCENTAGE;
  const minServerSecurityLevel = ns.getServerMinSecurityLevel(TARGET_NAME) + REQUIRED_MIN_SECYRITY_LEVEL_ADDITION;

  while (true) {
    if (ns.getServerSecurityLevel(TARGET_NAME) > minServerSecurityLevel) {
      await ns.weaken(TARGET_NAME);
    } else if (ns.getServerMoneyAvailable(TARGET_NAME) < maxMoney) {
      await ns.grow(TARGET_NAME);
    } else {
      await ns.hack(TARGET_NAME);
    }
  }
}