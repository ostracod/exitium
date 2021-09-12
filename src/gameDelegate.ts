
import { Pos } from "./pos.js";
import { Player } from "./interfaces.js";
import { PlayerEntity } from "./entity.js";
import { world } from "./world.js";

class GameDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    playerEnterEvent(player: Player): void {
        if (player.username in world.playerEntityMap) {
            return;
        }
        const pos = new Pos(-10, 10);
        new PlayerEntity(world, pos, player);
    }
    
    playerLeaveEvent(player: Player): void {
        const playerEntity = world.playerEntityMap[player.username];
        if (typeof playerEntity !== "undefined") {
            playerEntity.remove();
        }
    }
    
    async persistEvent(): Promise<void> {
        // Do nothing.
    }
}

export const gameDelegate = new GameDelegate();


