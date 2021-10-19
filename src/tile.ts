
import { tileSerialIntegers } from "./constants.js";
import { Entity } from "./entity.js";

const blockMap: { [spriteId: string]: Block } = {};

export abstract class Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.empty;
    }
    
    // entity has tried to walk into this.
    bumpEvent(entity: Entity): void {
        // Do nothing.
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

export class Block extends Tile {
    spriteId: number;
    
    constructor(spriteId: number) {
        super();
        this.spriteId = spriteId;
    }
    
    getSerialInteger(): number {
        return tileSerialIntegers.block;
    }
    
    serialize(): string {
        return super.serialize() + this.spriteId.toString(16).padStart(8, "0");
    }
}

export class Hospital extends Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.hospital;
    }
    
    bumpEvent(entity: Entity): void {
        entity.useHospital();
    }
}

export const emptyTile = new EmptyTile();
export const barrier = new Barrier();
export const hospital = new Hospital();

export const getBlock = (spriteId: number): Block => {
    if (!(spriteId in blockMap)) {
        blockMap[spriteId] = new Block(spriteId);
    }
    return blockMap[spriteId];
};


