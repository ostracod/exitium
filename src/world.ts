
import { Player } from "./interfaces.js";
import { chunkWidth, chunkHeight, restAreaWidth, restAreaSpacing } from "./constants.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, emptyTile, barrier, hospital } from "./tile.js";
import { Entity, EnemyEntity, PlayerEntity } from "./entity.js";
import { Battle } from "./battle.js";

const enemySpawnRadius = 64;

const getEnemySpawnOffset = (): number => (
    enemySpawnRadius - Math.floor(Math.random() * enemySpawnRadius * 2)
);

const posXIsInRestArea = (posX: number): boolean => {
    if (posX < 0) {
        return false;
    } else {
        return (posX % restAreaSpacing < restAreaWidth);
    }
};

export class Chunk {
    posX: number;
    tiles: Tile[];
    entities: Set<Entity>;
    
    constructor(posX: number) {
        this.posX = posX;
        this.tiles = [];
        const tempLength = chunkWidth * chunkHeight;
        while (this.tiles.length < tempLength) {
            const tile = (Math.random() < 0.1) ? barrier : emptyTile;
            this.tiles.push(tile);
        }
        this.entities = new Set();
        if (posXIsInRestArea(this.posX)) {
            const pos = new Pos(this.posX + Math.floor(chunkWidth / 2), 64);
            while (pos.y < chunkHeight) {
                this.setTile(pos, hospital);
                pos.y += 64;
            }
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
    battles: Set<Battle>;
    entities: Set<Entity>;
    playerEntityMap: { [username: string]: PlayerEntity };
    
    constructor() {
        this.chunkMap = {};
        this.battles = new Set();
        this.entities = new Set();
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
    
    getChunkTile(pos: Pos, shouldCreateChunk = true): Tile {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk === null) {
            return barrier;
        } else {
            return chunk.getTile(pos);
        }
    }
    
    setChunkTile(pos: Pos, tile: Tile, shouldCreateChunk = true): void {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk !== null) {
            chunk.setTile(pos, tile);
        }
    }
    
    getPlayerEntity(player: Player): PlayerEntity {
        return this.playerEntityMap[player.username];
    }
    
    iterateOverPlayerEntities(handle: (playerEntity: PlayerEntity) => void): void {
        for (const username in this.playerEntityMap) {
            const playerEntity = this.playerEntityMap[username];
            handle(playerEntity);
        }
    }
    
    getChunkTilesInWindow(pos: Pos, width: number, height: number): Tile[] {
        const output: Tile[] = [];
        const offset = new Pos(0, 0);
        const tempPos = new Pos(0, 0);
        while (offset.y < height) {
            tempPos.set(pos);
            tempPos.add(offset);
            const tempTile = this.getChunkTile(tempPos);
            output.push(tempTile);
            offset.x += 1;
            if (offset.x >= width) {
                offset.x = 0;
                offset.y += 1;
            }
        }
        return output;
    }
    
    posIsInBattleArea(pos: Pos): boolean {
        return (pos.x >= 0 && !posXIsInRestArea(pos.x));
    }
    
    enemyCanOccupyPos(pos: Pos): boolean {
        return this.posIsInBattleArea(pos);
    }
    
    countEnemiesNearPlayer(playerEntity: PlayerEntity): number {
        let output = 0;
        this.entities.forEach((entity) => {
            if (!(entity instanceof EnemyEntity)) {
                return;
            }
            const distance = playerEntity.pos.getOrthogonalDistance(entity.pos);
            if (distance < enemySpawnRadius) {
                output += 1;
            }
        });
        return output;
    }
    
    spawnEnemyNearPlayer(playerEntity: PlayerEntity): void {
        const playerPos = playerEntity.pos;
        const pos = playerPos.copy();
        pos.x += getEnemySpawnOffset();
        pos.y += getEnemySpawnOffset();
        if (!this.enemyCanOccupyPos(pos) || pos.getOrthogonalDistance(playerPos) < 8) {
            return;
        }
        const chunk = this.getChunk(pos, false);
        if (chunk === null || chunk.entities.size > 10) {
            return;
        }
        const tile = chunk.getTile(pos);
        if (!(tile instanceof EmptyTile)) {
            return;
        }
        new EnemyEntity(this, pos);
    }
    
    spawnEnemies(): void {
        this.iterateOverPlayerEntities((playerEntity) => {
            if (Math.random() < 0.05) {
                return;
            }
            const enemyCount = this.countEnemiesNearPlayer(playerEntity);
            if (enemyCount < 100) {
                this.spawnEnemyNearPlayer(playerEntity);
            }
        });
    }
    
    timerEvent(): void {
        this.spawnEnemies();
        this.entities.forEach((entity) => {
            entity.timerEvent();
        });
        this.battles.forEach((battle) => {
            battle.timerEvent();
        });
    }
}

export const world = new World();


