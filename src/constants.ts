
import * as pathUtils from "path";
import { fileURLToPath } from "url";

const distPath = pathUtils.dirname(fileURLToPath(import.meta.url));
export const projectPath = pathUtils.join(distPath, "..");

export const tileSerialIntegers = {
    empty: 0,
    barrier: 1,
};


