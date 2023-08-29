/** @param {NS} ns */
export async function main(ns) {
  const HACK_TYPE = ns.args[0];
  const TARGET_NAME = ns.args[1];
  if (!TARGET_NAME) {
    ns.print('No target host name specified');
  }

  switch (HACK_TYPE) {
    case 'weaken':
      await ns.weaken(TARGET_NAME);
      break;
    case 'grow':
      await ns.grow(TARGET_NAME);
      break;
    case 'hack':
      await ns.hack(TARGET_NAME);
      break;
    default:
      ns.print('No HACK_TYPE specified');
  }
}