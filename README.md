# bitburner-scripts
Contains the automation scripts for Bitburner game.

# Hacking Scripts Info

## [Batcher](https://github.com/NiksRakevich/bitburner-scripts/blob/main/home/batcher/batcherManager.js)
Batcher is a hacking script that is using the best possible [HWGW](https://bitburner.readthedocs.io/en/latest/advancedgameplay/hackingalgorithms.html#batch-algorithms-hgw-hwgw-or-cycles) hacking strategy and utilizes its full potential on all the best targets at the same time (if you have enough RAM).<br>
Basically can be used in middle and late game since Formula.exe and servers with the big amount of RAM required.

Features:
1. Gets the list of all target servers we can attack
2. Gets root access in all targets
3. Prepares all targets for batching (decreasing security level to minimum, growing money to maximum)
4. Choosing the best targets for attack
5. Trying to utilize all targets and personal servers for attack
6. Emergency check: analyzing target if the attack process is not broken
7. Recovery: recover the broken attack process for the target

Flags:

**--prepareOnly** or **--p** - will only prepare all the targets<br>
**--preparedOnly** - will skip target preparation and start attacking only prepared targets<br>
**--monitorTargets** - will run separate monitor services for all targets we are attacking (see monitorServer script description below)<br>

Screenshot with Batcher output and 100+ billions/s income<br>
![Bitburner-batch100bs](https://github.com/NiksRakevich/bitburner-scripts/assets/32455265/e5bfc816-944a-49ea-bf1f-78dde5d1a7d7)

## [Distributive Hack](https://github.com/NiksRakevich/bitburner-scripts/blob/main/home/distributive-hack/distributiveHackManager.js)
Distributive hack is a hacking script that can be used in middle game (Formula.exe required).<br>
The **lite** version of this script can be used before purchasing Formula.exe.

Features:
1. Gets the list of all target servers we can attack (in fly)
2. Gets root access in all targets (in fly)
3. Runs WG or WH batch depended on the current server stats
4. Wait for the previous batch will be finished to run the next one
5. Utilises all target and personal servers for attack

## [Simple Hack](https://github.com/NiksRakevich/bitburner-scripts/blob/main/home/simpleHack.js)
Simple hack is a hacking script that can be used in early game since it is required only 2.40 GB of RAM per thread.<br>
Attacking only one target (run one more script to attack another target of you have free RAM)

Usage: run simpleHack.js target-host <-t number-of-threads>

# Helper Scripts Info
1. **totalKill.js** - kill all processes in all servers you have root access to.
2. **purchaseAndUpgradeServers.js** - automatically purchasing and upgrading personal servers. **--maxUpgradeFirst** or **--muf** will not purchase new server unless previous one is not upgraded to maximum. Will upgrade evenly by default. **--name** the name of the server to purchase 'myserv' by default.
3. **purchaseAndUpgradeHacknetNodes.js** - automatically purchasing and upgrading Hacknet Nodes.
4. **findHostPath.js < host-name >** - finds the connection path to the desired host.
5. **findHostByOrganization.js < organization > < regexp flags >** - finds host name by organization name.
6. **checkBestServersToHack.js < limit >** - shows the table with sorted targets to hack by calculated significance. (Formula.exe required)
7. **monitorServer.js** - shows the server information and threads required to prepare batch and attack batch, updating info every ~50ms. Formula.exe required. (see the screenshot with output below)
8. **findContracts.js** - finds host names with contracts.
8. **findFile.js < substring >** - finds host names with file by file name substring.

monitorServer.js output<br>
![bitburner-monitor-server](https://github.com/NiksRakevich/bitburner-scripts/assets/32455265/fe1fa5cb-0691-4176-9d3c-d569b64dde29)
