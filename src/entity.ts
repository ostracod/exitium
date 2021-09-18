
import { Player, EntityJson } from "./interfaces.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, emptyTile } from "./tile.js";
import { World, Chunk } from "./world.js";

export abstract class Entity extends Tile {
    world: World;
    chunk: Chunk;
    pos: Pos;
    isInChunk: boolean;
    
    constructor(world: World, pos: Pos) {
        super();
        this.world = world;
        this.world.entities.add(this);
        this.chunk = null;
        this.pos = pos;
        // TODO: Ensure that the tile at this.pos is empty.
        this.addToChunk();
    }
    
    abstract getName(): string;
    
    addToChunk(): void {
        if (this.chunk === null) {
            this.chunk = this.world.getChunk(this.pos, true);
            this.chunk.setTile(this.pos, this);
            this.chunk.entities.add(this);
        }
    }
    
    removeFromChunk(): void {
        if (this.chunk !== null) {
            this.chunk.setTile(this.pos, emptyTile);
            this.chunk.entities.delete(this);
            this.chunk = null;
        }
    }
    
    remove(): void {
        this.world.entities.delete(this);
        this.removeFromChunk();
    }
    
    walk(offset: Pos): boolean {
        const nextPos = this.pos.copy();
        nextPos.add(offset);
        const tile = this.world.getTile(nextPos);
        if (!(tile instanceof EmptyTile)) {
            return false;
        }
        this.removeFromChunk();
        this.pos.set(nextPos);
        this.addToChunk();
        return true;
    }
    
    toJson(): EntityJson {
        return {
            name: this.getName(),
            pos: this.pos.toJson(),
        };
    }
}

export class EnemyEntity extends Entity {
    
    getName(): string {
        return "Enemy";
    }
}

export class PlayerEntity extends Entity {
    player: Player;
    
    constructor(world: World, pos: Pos, player: Player) {
        super(world, pos);
        this.player = player;
        this.world.playerEntityMap[this.player.username] = this;
    }
    
    getName(): string {
        return this.player.username;
    }
    
    remove(): void {
        super.remove();
        delete this.world.playerEntityMap[this.player.username];
    }
}


