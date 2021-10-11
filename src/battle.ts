
import { pointConstants } from "./constants.js";
import { World } from "./world.js";
import { Entity, PlayerEntity } from "./entity.js";
import { getGoldReward, getExperienceReward } from "./points.js";

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
        const startEnergy = Math.floor(Math.random() * pointConstants.maximumEnergy + 1);
        this.entities.forEach((entity) => {
            entity.removeFromChunk();
            entity.battle = this;
            entity.points.energy.setValue(startEnergy);
            entity.points.damage.setValue(5);
            entity.lingerStates = [];
            entity.removeAllPointsBursts();
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
        // entity2 is the winner, and entity1 is the loser.
        const level1 = entity1.getLevel();
        const level2 = entity2.getLevel();
        const goldReward = getGoldReward(level2, level1);
        const transferAmount = -entity1.points.gold.offsetValue(-goldReward);
        entity2.points.gold.offsetValue(transferAmount);
        const experienceReward = getExperienceReward(level2, level1);
        entity2.gainExperience(experienceReward);
    }
    
    checkDefeat(): void {
        this.checkDefeatHelper(0, 1);
        this.checkDefeatHelper(1, 0);
    }
    
    getTurnTimeout(): number {
        if (!this.isFinished
                && this.entities.every((entity) => entity instanceof PlayerEntity)) {
            return this.turnStartTime + 15 - Date.now() / 1000;
        } else {
            return null;
        }
    }
    
    finishTurn(): void {
        this.checkDefeat();
        this.turnIndex += 1;
        if (!this.isFinished) {
            const turnEntity = this.getTurnEntity();
            turnEntity.points.energy.offsetValue(1);
            turnEntity.processLingerStates();
            turnEntity.processPointsBursts();
        }
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
        if (this.isFinished) {
            const currentTime = Date.now() / 1000;
            if (currentTime > this.turnStartTime + 2) {
                this.cleanUp();
            }
        } else {
            const timeout = this.getTurnTimeout();
            if (timeout !== null && timeout <= 0) {
                this.finishTurn();
            }
        }
    }
}


