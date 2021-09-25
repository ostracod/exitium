
import { World } from "./world.js";
import { Entity } from "./entity.js";

export class Battle {
    entities: [Entity, Entity];
    world: World;
    turnIndex: number;
    turnStartTime: number;
    message: string;
    
    // entity1 and entity2 must belong to the same World.
    constructor(entity1: Entity, entity2: Entity) {
        this.entities = [entity1, entity2];
        this.world = this.entities[0].world;
        this.turnIndex = 0;
        this.turnStartTime = Date.now() / 1000;
        this.message = null;
        this.entities.forEach((entity) => {
            entity.removeFromChunk();
            entity.battle = this;
            entity.points.energy.setValue(5);
            entity.points.damage.setValue(5);
        });
        this.world.battles.add(this);
    }
    
    getOpponent(entity: Entity): Entity {
        const index = (entity === this.entities[0]) ? 1 : 0;
        return this.entities[index];
    }
    
    entityHasTurn(entity: Entity): boolean {
        return (entity === this.entities[this.turnIndex % this.entities.length]);
    }
    
    finishTurn(): void {
        this.turnIndex += 1;
        this.turnStartTime = Date.now() / 1000;
    }
    
    isFinished(): boolean {
        return this.entities.some((entity) => entity.isDead());
    }
    
    cleanUp(): void {
        this.entities.forEach((entity) => {
            entity.leaveBattle();
        });
        this.world.battles.delete(this);
    }
    
    timerEvent(): void {
        const currentTime = Date.now() / 1000;
        if (this.isFinished() && currentTime > this.turnStartTime + 2) {
            this.cleanUp();
        }
    }
}


