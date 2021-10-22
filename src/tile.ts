
import { tileSerialIntegers } from "./constants.js";
import { Entity } from "./entity.js";

const blockMap: { [spriteId: string]: Block } = {};

export abstract class Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.empty;
    }
    
    entityCanPlaceAndRemove(): boolean {
        return false;
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
    
    entityCanPlaceAndRemove(): boolean {
        return true;
    }
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
    
    entityCanPlaceAndRemove(): boolean {
        return true;
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

export class GoldTile extends Tile {
    
    getSerialInteger(): number {
        return tileSerialIntegers.gold;
    }
    
    entityCanPlaceAndRemove(): boolean {
        return true;
    }
}

export const emptyTile = new EmptyTile();
export const barrier = new Barrier();
export const hospital = new Hospital();
export const goldTile = new GoldTile();

const tileMap = {
    [tileSerialIntegers.empty]: emptyTile,
    [tileSerialIntegers.barrier]: barrier,
    [tileSerialIntegers.hospital]: hospital,
    [tileSerialIntegers.gold]: goldTile,
};

export const getBlock = (spriteId: number): Block => {
    if (!(spriteId in blockMap)) {
        blockMap[spriteId] = new Block(spriteId);
    }
    return blockMap[spriteId];
};

export const deserializeTiles = (text: string): Tile[] => {
    const output: Tile[] = [];
    let index = 0;
    while (index < text.length) {
        const tempText = text.substring(index, index + 2);
        index += 2;
        const serialInteger = parseInt(tempText, 16);
        let tile;
        if (serialInteger === tileSerialIntegers.block) {
            const tempText = text.substring(index, index + 8);
            index += 8;
            tile = getBlock(parseInt(tempText, 16));
        } else {
            tile = tileMap[serialInteger];
        }
        output.push(tile);
    }
    return output;
};


