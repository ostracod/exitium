
import { tileSerialIntegers } from "./constants.js";

export abstract class Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.empty;
    }
    
    serialize(): string {
        return this.getSerialInteger().toString(16).padStart(2, "0");
    }
}

export class EmptyTile extends Tile {
    
}

export class Barrier extends Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.barrier;
    }
}

export const emptyTile = new EmptyTile();
export const barrier = new Barrier();


