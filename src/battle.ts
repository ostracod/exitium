
import { World } from "./world.js";
import { Entity } from "./entity.js";

export class Battle {
    // Elements of this.entities may be null if
    // an entity prematurely leaves the battle.
    entities: [Entity, Entity];
    world: World;
    turnIndex: number;
    turnStartTime: number;
    isFinished: boolean;
    message: string;
    
    // entity1 and entity2 must belong to the same World.
    constructor(entity1: Entity, entity2: Entity) {
        this.entities = [entity1, entity2];
        this.world = this.entities[0].world;
        this.turnIndex = 0;
        this.resetTurnStartTime();
        this.isFinished = false;
        this.message = null;
        this.entities.forEach((entity) => {
            entity.removeFromChunk();
            entity.battle = this;
            entity.points.energy.setValue(5);
            entity.points.damage.setValue(5);
        });
        this.world.battles.add(this);
        this.checkDefeat();
    }
    
    resetTurnStartTime(): void {
        this.turnStartTime = Date.now() / 1000;
    }
    
    getOpponent(entity: Entity): Entity {
        const index = (entity === this.entities[0]) ? 1 : 0;
        return this.entities[index];
    }
    
    getTurnEntity(): Entity {
        return this.entities[this.turnIndex % this.entities.length];
    }
    
    entityHasTurn(entity: Entity): boolean {
        return (entity === this.getTurnEntity());
    }
    
    checkDefeatHelper(entityIndex1: number, entityIndex2: number): void {
        const entity1 = this.entities[entityIndex1];
        if (entity1 === null || !entity1.isDead()) {
            return;
        }
        entity1.defeatEvent();
        this.isFinished = true;
        const entity2 = this.entities[entityIndex2];
        if (entity2 === null || entity2.isDead()) {
            return;
        }
        // TODO: Give reward to entity2.
        
    }
    
    checkDefeat(): void {
        this.checkDefeatHelper(0, 1);
        this.checkDefeatHelper(1, 0);
    }
    
    finishTurn(): void {
        this.checkDefeat();
        this.turnIndex += 1;
        this.getTurnEntity().points.energy.offsetValue(1);
        this.resetTurnStartTime();
    }
    
    cleanUp(): void {
        this.entities.forEach((entity) => {
            if (entity !== null) {
                entity.leaveBattle();
            }
        });
        this.world.battles.delete(this);
    }
    
    timerEvent(): void {
        const currentTime = Date.now() / 1000;
        if (this.isFinished && currentTime > this.turnStartTime + 2) {
            this.cleanUp();
        }
    }
}


