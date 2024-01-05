import { HELPLESS_HOST_NAMES } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
  const [organization, regexpFlags] = ns.args;
  const found = new Set();
  const organizationRegexp = new RegExp(organization, regexpFlags);

  function findHost(parent) {
    const childs = ns
      .scan(parent)
      .filter(child => 
        child !== parent &&
        !child.match(HELPLESS_HOST_NAMES) &&
        !found.has(child)
      );

    if (!childs.length) return;

    childs.forEach(child => found.add(child));

    for (let child of childs) {
      const childOrg = ns.getServer(child).organizationName;
      if (childOrg.match(organizationRegexp)) return child;
      const foundedOrg = findHost(child);
      if (foundedOrg) {
        return foundedOrg;
      }
    }
  }

  const foundedOrg = findHost('home');
  if (foundedOrg) {
    ns.tprint(`Host found, name: ${foundedOrg}`);
  } else {
    ns.tprint('Host with this org not found');
  }
}