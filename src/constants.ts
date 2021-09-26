
import * as pathUtils from "path";
import { fileURLToPath } from "url";

const distPath = pathUtils.dirname(fileURLToPath(import.meta.url));
export const projectPath = pathUtils.join(distPath, "..");

export const tileSerialIntegers = {
    empty: 0,
    barrier: 1,
    hospital: 2,
};

export const maximumEnergyPoints = 10;
export const maximumDamagePoints = 10;

export const chunkWidth = 64;
export const chunkHeight = 256;

export const restAreaWidth = chunkWidth;
export const restAreaSpacing = chunkWidth * 2;


