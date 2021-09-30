
import * as pathUtils from "path";
import express from "express";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath, tileSerialIntegers, pointConstants, restAreaWidth, restAreaSpacing } from "./constants.js";
import { actionList } from "./action.js";
import { gameDelegate } from "./gameDelegate.js";

const { dbUtils } = ostracodMultiplayer;
const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

const router = express.Router();

router.get("/gameConstants", (req, res, next) => {
    res.json({
        tileSerialIntegers,
        pointConstants,
        actions: actionList.map((action) => action.toJson()),
        restAreaWidth,
        restAreaSpacing,
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


