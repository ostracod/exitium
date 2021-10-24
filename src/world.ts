
import * as fs from "fs";
import * as pathUtils from "path";
import { Player } from "./interfaces.js";
import { chunksPath, chunkWidth, chunkHeight, restAreaWidth, restAreaSpacing } from "./constants.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, Hospital, emptyTile, barrier, hospital, getBlock, deserializeTiles } from "./tile.js";
import { Entity, EnemyEntity, PlayerEntity } from "./entity.js";
import { Battle } from "./battle.js";

const enemySpawnRadius = 24;

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
    filePath: string;
    tiles: Tile[];
    entities: Set<Entity>;
    isDirty: boolean;
    
    constructor(posX: number) {
        this.posX = posX;
        this.filePath = pathUtils.join(chunksPath, `chunk_${this.posX}.txt`);
        if (fs.existsSync(this.filePath)) {
            const tileData = fs.readFileSync(this.filePath, "utf8");
            this.tiles = deserializeTiles(tileData);
            this.isDirty = false;
        } else {
            this.tiles = [];
            const tempLength = chunkWidth * chunkHeight;
            while (this.tiles.length < tempLength) {
                let tile: Tile;
                if (Math.random() < 0.1) {
                    tile = getBlock(Math.floor(Math.random() * 3));
                } else {
                    tile = emptyTile;
                }
                this.tiles.push(tile);
            }
            this.isDirty = true;
        }
        this.entities = new Set();
        if (posXIsInRestArea(this.posX)) {
            const pos = new Pos(this.posX + Math.floor(chunkWidth / 2), 64);
            while (pos.y < chunkHeight) {
                const tile = this.getTile(pos);
                if (!(tile instanceof Hospital)) {
                    this.setTile(pos, hospital);
                }
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
            const oldTile = this.tiles[index];
            this.tiles[index] = tile;
            // Do not mark the chunk as dirty when
            // swapping entities with empty tiles.
            if (!((oldTile instanceof EmptyTile || oldTile instanceof Entity)
                    && (tile instanceof EmptyTile || tile instanceof Entity))) {
                this.isDirty = true;
            }
        }
    }
    
    containsPlayerEntity(): boolean {
        for (const entity of this.entities) {
            if (entity instanceof PlayerEntity) {
                return true;
            }
        }
        return false;
    }
    
    persist(): void {
        if (!this.isDirty) {
            return;
        }
        const tileData = this.tiles.map((tile) => tile.serialize()).join("");
        fs.writeFileSync(this.filePath, tileData);
        this.isDirty = false;
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
    
    getChunkTile(pos: Pos, shouldCreateChunk = false): Tile {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk === null) {
            return barrier;
        } else {
            return chunk.getTile(pos);
        }
    }
    
    setChunkTile(pos: Pos, tile: Tile, shouldCreateChunk = false): void {
        const chunk = this.getChunk(pos, shouldCreateChunk);
        if (chunk !== null) {
            chunk.setTile(pos, tile);
        }
    }
    
    getPlayerEntity(player: Player): PlayerEntity {
        const playerEntity = this.playerEntityMap[player.username];
        return (typeof playerEntity === "undefined") ? null : playerEntity;
    }
    
    iterateOverPlayerEntities(handle: (playerEntity: PlayerEntity) => void): void {
        for (const username in this.playerEntityMap) {
            const playerEntity = this.playerEntityMap[username];
            handle(playerEntity);
        }
    }
    
    iterateOverChunks(handle: (chunk: Chunk) => void): void {
        for (const key in this.chunkMap) {
            const chunk = this.chunkMap[key];
            handle(chunk);
        }
    }
    
    getChunkTilesInWindow(pos: Pos, width: number, height: number): Tile[] {
        const output: Tile[] = [];
        const offset = new Pos(0, 0);
        const tempPos = new Pos(0, 0);
        while (offset.y < height) {
            tempPos.set(pos);
            tempPos.add(offset);
            const tempTile = this.getChunkTile(tempPos, true);
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
        if (chunk === null || chunk.entities.size > 40) {
            return;
        }
        const tempPos = new Pos(0, 0);
        let nonEmptyTileCount = 0;
        for (let offset = -1; offset <= 1; offset++) {
            tempPos.set(pos);
            tempPos.x += offset;
            const tile1 = this.getChunkTile(tempPos);
            tempPos.set(pos);
            tempPos.y += offset;
            const tile2 = this.getChunkTile(tempPos);
            // Please be aware that this intentionally double
            // counts the tile at the enemy spawn pos.
            if (!(tile1 instanceof EmptyTile)) {
                nonEmptyTileCount += 1;
            }
            if (!(tile2 instanceof EmptyTile)) {
                nonEmptyTileCount += 1;
            }
        }
        if (nonEmptyTileCount >= 2) {
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
            if (enemyCount < 10) {
                this.spawnEnemyNearPlayer(playerEntity);
            }
        });
    }
    
    despawnEnemies(): void {
        this.entities.forEach((entity) => {
            if (!(entity instanceof EnemyEntity) || entity.chunk === null
                    || Math.random() > 0.002) {
                return;
            }
            let isNearPlayer = false;
            for (const username in this.playerEntityMap) {
                const playerEntity = this.playerEntityMap[username];
                const distance = entity.pos.getOrthogonalDistance(playerEntity.pos);
                if (distance < enemySpawnRadius) {
                    isNearPlayer = true;
                    break;
                }
            }
            if (!isNearPlayer) {
                entity.remove();
            }
        });
    }
    
    removeEnemiesNearPos(pos: Pos, maximumDistance: number): void {
        this.entities.forEach((entity) => {
            if (!(entity instanceof EnemyEntity) || entity.chunk === null) {
                return;
            }
            const distance = entity.pos.getOrthogonalDistance(pos);
            if (distance <= maximumDistance) {
                entity.remove();
            }
        });
    }
    
    unloadChunk(chunk: Chunk): void {
        // This should never happen, but we can never be too safe.
        if (chunk.containsPlayerEntity()) {
            return;
        }
        chunk.entities.forEach((entity) => {
            entity.remove();
        });
        delete this.chunkMap[chunk.posX];
    }
    
    unloadDistantChunks(): void {
        const chunksNearPlayers = new Set<Chunk>();
        this.iterateOverPlayerEntities((playerEntity) => {
            const pos = new Pos(0, 0);
            for (let offset = -1; offset <= 1; offset++) {
                pos.set(playerEntity.pos);
                pos.x += offset * chunkWidth;
                const chunk = this.getChunk(pos, false);
                if (chunk !== null) {
                    chunksNearPlayers.add(chunk);
                }
            }
        });
        this.iterateOverChunks((chunk) => {
            if (!chunksNearPlayers.has(chunk)) {
                this.unloadChunk(chunk);
            }
        });
    }
    
    timerEvent(): void {
        this.spawnEnemies();
        this.despawnEnemies();
        this.entities.forEach((entity) => {
            entity.timerEvent();
        });
        this.battles.forEach((battle) => {
            battle.timerEvent();
        });
    }
}

export const world = new World();


