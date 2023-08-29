import { getAllHosts } from './utils.js';

/** @param {NS} ns */
export async function main(ns) {
  getAllHosts(ns)
    .filter(host => ns.getServer(host).hasAdminRights)
    .forEach(host => ns.killall(host));
}
