import {
  getAllHosts,
  isAbleToGetRoot,
  getAdminRights,
} from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
  const [fileSubstring] = ns.args;
  const hosts = getAllHosts(ns).filter(host => isAbleToGetRoot(ns, host));
  hosts.forEach(host => getAdminRights(ns, host));
  const foundedHosts = hosts.filter(host => ns.ls(host, fileSubstring).length);
  if (foundedHosts.length) {
    ns.tprint(`Found file in hosts: ${foundedHosts.join(', ')}`);
  } else {
    ns.tprint('File not found');
  }
}