import {
  getAllHosts,
  isAbleToGetRoot,
  getAdminRights,
} from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
  const hosts = getAllHosts(ns).filter(host => isAbleToGetRoot(ns, host))
  hosts.forEach(host => getAdminRights(ns, host));

  const hostsWithContracts = hosts.filter(host => ns.ls(host, '.cct').length);

  if (hostsWithContracts.length) {
    ns.tprint(`Contracts found in : ${hostsWithContracts.join(', ')}`);
  } else {
    ns.tprint('Contracts not found');
  }
}