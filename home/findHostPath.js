import { HELPLESS_HOST_NAMES } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
  const [hostToFind] = ns.args;
  const found = new Set();

  function findHost(parent, fullPath = []) {
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
      if (child === hostToFind) return fullPath;
      const currentPath = [...fullPath, child];
      const foundedPath = findHost(child, currentPath);
      if (foundedPath) {
        return foundedPath;
      }
    }
  }

  const foundedPath = findHost('home');
  if (foundedPath) {
    ns.tprint(`Host found, path: ${foundedPath.join(' -> ')}`);
  } else {
    ns.tprint('Host not found');
  }
}