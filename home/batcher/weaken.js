/** @param {NS} ns */
export async function main(ns) {
  const [target, sleepTime] = ns.args;
  sleepTime && await ns.sleep(sleepTime);
  await ns.weaken(target);
}