
import { Player } from "./interfaces.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, emptyTile } from "./tile.js";
import { World } from "./world.js";

export abstract class Entity extends Tile {
    world: World;
    pos: Pos;
    isInChunk: boolean;
    
    constructor(world: World, pos: Pos) {
        super();
        this.world = world;
        this.world.entities.push(this);
        this.pos = pos;
        this.isInChunk = false;
        this.addToChunk();
    }
    
    addToChunkHelper(): void {
        this.world.setTile(this.pos, this);
    }
    
    removeFromChunkHelper(): void {
        this.world.setTile(this.pos, emptyTile);
    }
    
    addToChunk(): void {
        if (this.isInChunk) {
            return;
        }
        // TODO: Ensure that the old tile is empty.
        this.addToChunkHelper();
        this.isInChunk = true;
    }
    
    removeFromChunk(): void {
        if (!this.isInChunk) {
            return;
        }
        this.removeFromChunkHelper();
        this.isInChunk = false;
    }
    
    remove(): void {
        const index = this.world.entities.indexOf(this);
        this.world.entities.splice(index, 1);
        this.removeFromChunk();
    }
    
    walk(offset: Pos): boolean {
        const nextPos = this.pos.copy();
        nextPos.add(offset);
        const tile = this.world.getTile(nextPos);
        if (!(tile instanceof EmptyTile)) {
            return false;
        }
        this.removeFromChunkHelper();
        this.pos.set(nextPos);
        this.addToChunkHelper();
        return true;
    }
}

export class PlayerEntity extends Entity {
    player: Player;
    
    constructor(world: World, pos: Pos, player: Player) {
        super(world, pos);
        this.player = player;
        this.world.playerEntityMap[this.player.username] = this;
    }
    
    remove(): void {
        super.remove();
        delete this.world.playerEntityMap[this.player.username];
    }
}


