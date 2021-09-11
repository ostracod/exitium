
import * as pathUtils from "path";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath } from "./constants.js";
import { gameDelegate } from "./gameDelegate.js";
console.log(projectPath);

const { dbUtils } = ostracodMultiplayer;
const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

console.log("Starting Exitium server...");
const tempResult = ostracodMultiplayerInstance.initializeServer(
    projectPath,
    gameDelegate,
    []
);
if (!tempResult) {
    process.exit(1);
}


