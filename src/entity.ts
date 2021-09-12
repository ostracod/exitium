
import { Player } from "./interfaces.js";
import { Pos } from "./pos.js";
import { Tile, emptyTile } from "./tile.js";
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
    
    addToChunk(): void {
        if (this.isInChunk) {
            return;
        }
        // TODO: Ensure that the old tile is empty.
        this.world.setTile(this.pos, this);
        this.isInChunk = true;
    }
    
    removeFromChunk(): void {
        if (!this.isInChunk) {
            return;
        }
        this.world.setTile(this.pos, emptyTile);
        this.isInChunk = false;
    }
    
    remove(): void {
        const index = this.world.entities.indexOf(this);
        this.world.entities.splice(index, 1);
        this.removeFromChunk();
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


