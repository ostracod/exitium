
import * as pathUtils from "path";
import { fileURLToPath } from "url";
import { Pos } from "./pos.js";

const distPath = pathUtils.dirname(fileURLToPath(import.meta.url));
export const projectPath = pathUtils.join(distPath, "..");
export const chunksPath = pathUtils.join(projectPath, "chunks");

export const tileSerialIntegers = {
    empty: 0,
    barrier: 1,
    block: 2,
    hospital: 3,
    gold: 4,
};

export const pointConstants = {
    maximumEnergy: 10,
    maximumDamage: 10,
    startDamage: 5,
    powerMultiplierCoefficient: 0.05,
    powerMultiplierBase: 1.05,
    powerMultiplierOffset: 1,
    experienceMultiplierOffset: 10,
    levelUpCostBase: 1.11,
    actionLearnCostCoefficient: 0.05,
    actionLearnCostOffset: 11,
    damageMultiplierBase: 2,
    damageMultiplierCoefficient: 0.2,
    damageMultiplierNormalization: 5,
    actionLevelDiscount: 0.5,
    actionExperienceDiscount: 0.5,
    actionEnergyDiscount: 0.5,
};

export const chunkWidth = 64;
export const chunkHeight = 256;

export const restAreaWidth = chunkWidth;
export const restAreaSpacing = chunkWidth * 8;

export const learnableActionCapacity = 7;

export const tileActionOffsets = [
    new Pos(-1, 0),
    new Pos(1, 0),
    new Pos(0, -1),
    new Pos(0, 1),
];

export const entityColorAmount = 8;


