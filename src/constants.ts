
import * as pathUtils from "path";
import { fileURLToPath } from "url";

const distPath = pathUtils.dirname(fileURLToPath(import.meta.url));
export const projectPath = pathUtils.join(distPath, "..");

export const tileSerialIntegers = {
    empty: 0,
    barrier: 1,
    hospital: 2,
};

export const pointConstants = {
    maximumEnergy: 10,
    maximumDamage: 10,
    experienceMultiplierOffset: 10,
    levelUpCostBase: 1.11,
    actionLearnCostCoefficient: 0.05,
    actionLearnCostOffset: 11,
};

export const chunkWidth = 64;
export const chunkHeight = 256;

export const restAreaWidth = chunkWidth;
export const restAreaSpacing = chunkWidth * 2;


