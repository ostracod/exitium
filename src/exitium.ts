
import * as fs from "fs";
import * as pathUtils from "path";
import express from "express";
import ostracodMultiplayer from "ostracod-multiplayer";

import { projectPath, chunksPath, tileSerialIntegers, pointsAbbreviationMap, pointConstants, restAreaWidth, restAreaSpacing, learnableActionCapacity, tileActionOffsets } from "./constants.js";
import { actionList } from "./action.js";
import { speciesList } from "./species.js";
import { gameDelegate } from "./gameDelegate.js";

const { dbUtils } = ostracodMultiplayer;
const ostracodMultiplayerInstance = ostracodMultiplayer.ostracodMultiplayer;

if (!fs.existsSync(chunksPath)) {
    fs.mkdirSync(chunksPath);
}

const router = express.Router();

router.get("/gameConstants", (req, res, next) => {
    res.json({
        tileSerialIntegers,
        pointsAbbreviationMap,
        pointConstants,
        actions: actionList.map((action) => action.toJson()),
        learnableActionCapacity,
        restAreaWidth,
        restAreaSpacing,
        tileActionOffsets: tileActionOffsets.map((offset) => offset.toJson()),
        speciesList: speciesList.map((species) => species.toJson()),
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


