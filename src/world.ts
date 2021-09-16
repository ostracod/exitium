
import { Player } from "./interfaces.js";
import { Pos } from "./pos.js";
import { Tile, emptyTile, barrier } from "./tile.js";
import { Entity, PlayerEntity } from "./entity.js";

const chunkWidth = 64;
const chunkHeight = 256;

class Chunk {
    posX: number;
    tiles: Tile[];
    
    constructor(posX: number) {
        this.posX = posX;
        this.tiles = [];
        const tempLength = chunkWidth * chunkHeight;
        while (this.tiles.length < tempLength) {
            const tile = (Math.random() < 0.1) ? barrier : emptyTile;
            this.tiles.push(tile);
        }
    }
    
    convertPosToIndex(pos: Pos) {
        if (pos.x < this.posX || pos.x >= this.posX + chunkWidth
                || pos.y < 0 || pos.y >= chunkHeight) {
            return null;
        } else {
            return (pos.x - this.posX) + pos.y * chunkWidth;
        }
    }
    
    getTile(pos: Pos): Tile {
        const index = this.convertPosToIndex(pos);
        if (index === null) {
            return barrier;
        } else {
            return this.tiles[index];
        }
    }
    
    setTile(pos: Pos, tile: Tile): void {
        const index = this.convertPosToIndex(pos);
        if (index !== null) {
            this.tiles[index] = tile;
        }
    }
}

export class World {
    chunkMap: { [posX: string]: Chunk };
    entities: Entity[];
    playerEntityMap: { [username: string]: PlayerEntity };
    
    constructor() {
        this.chunkMap = {};
        this.entities = [];
        this.playerEntityMap = {};
    }
    
    getChunk(pos: Pos, shouldCreateChunk: boolean): Chunk {
        const posX = Math.floor(pos.x / chunkWidth) * chunkWidth;
        if (posX in this.chunkMap) {
            return this.chunkMap[posX];
        } else if (shouldCreateChunk) {
            const chunk = new Chunk(posX);
            this.chunkMap[posX] = chunk;
            return chunk;
        } else {
            return null;
        }
    }
    
    getTile(pos: Pos, shouldCreateChunk = true): Tile {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk === null) {
            return barrier;
        } else {
            return chunk.getTile(pos);
        }
    }
    
    setTile(pos: Pos, tile: Tile, shouldCreateChunk = true): void {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk !== null) {
            chunk.setTile(pos, tile);
        }
    }
    
    getPlayerEntity(player: Player) {
        return this.playerEntityMap[player.username];
    }
    
    getTilesInWindow(pos: Pos, width: number, height: number): Tile[] {
        const output: Tile[] = [];
        const offset = new Pos(0, 0);
        const tempPos = new Pos(0, 0);
        while (offset.y < height) {
            tempPos.set(pos);
            tempPos.add(offset);
            const tempTile = this.getTile(tempPos);
            output.push(tempTile);
            offset.x += 1;
            if (offset.x >= width) {
                offset.x = 0;
                offset.y += 1;
            }
        }
        return output;
    }
}

export const world = new World();


