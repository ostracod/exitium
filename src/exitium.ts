
import * as pathUtils from "path";
import express from "express";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath, tileSerialIntegers, maximumEnergyPoints, maximumDamagePoints } from "./constants.js";
import { gameDelegate } from "./gameDelegate.js";
console.log(projectPath);

const { dbUtils } = ostracodMultiplayer;
const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

const router = express.Router();

router.get("/gameConstants", (req, res, next) => {
    res.json({
        tileSerialIntegers,
        maximumEnergyPoints,
        maximumDamagePoints,
    });
});

console.log("Starting Exitium server...");
const tempResult = ostracodMultiplayerInstance.initializeServer(
    projectPath,
    gameDelegate,
    [router],
);
if (!tempResult) {
    process.exit(1);
}


