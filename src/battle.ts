
import ostracodMultiplayer from "ostracod-multiplayer";
import { pointConstants } from "./constants.js";
import { World } from "./world.js";
import { Entity, PlayerEntity } from "./entity.js";
import { getGoldReward, getExperienceReward } from "./points.js";
import { LingerState } from "./effect.js";

const { gameUtils } = ostracodMultiplayer;

export class Battle {
    // Elements of this.entities may be null if
    // an entity prematurely leaves the battle.
    entities: [Entity, Entity];
    world: World;
    turnIndex: number;
    turnStartTime: number;
    isFinished: boolean;
    actionMessages: string[];
    rewardMessage: string;
    lingerStates: LingerState[];
    
    // entity1 and entity2 must belong to the same World.
    constructor(entity1: Entity, entity2: Entity) {
        this.entities = [entity1, entity2];
        this.world = this.entities[0].world;
        this.turnIndex = 0;
        this.resetTurnStartTime();
        this.isFinished = false;
        this.actionMessages = [];
        this.rewardMessage = null;
        this.lingerStates = [];
        const startEnergy = Math.floor(Math.random() * pointConstants.maximumEnergy + 1);
        this.entities.forEach((entity) => {
            entity.removeFromChunk();
            entity.battle = this;
            entity.points.energy.setValue(startEnergy);
            entity.points.damage.setValue(pointConstants.startDamage);
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
        this.rewardMessage = `${entity2.getName()} received ${experienceReward} XP and ${transferAmount} gold!`;
        if (entity1 instanceof PlayerEntity) {
            gameUtils.announceMessageInChat(
                `${entity2.getName()} defeated ${entity1.getName()}.`,
            );
        }
    }
    
    checkDefeat(): void {
        if (this.isFinished) {
            return;
        }
        this.checkDefeatHelper(0, 1);
        this.checkDefeatHelper(1, 0);
        if (this.entities.every((entity) => (entity !== null && entity.isDead()))) {
            const name1 = this.entities[0].getName();
            const name2 = this.entities[1].getName();
            gameUtils.announceMessageInChat(`${name1} and ${name2} perished in a tie.`);
        }
    }
    
    addLingerState(state: LingerState): void {
        this.lingerStates = this.lingerStates.filter((oldState) => (
            !oldState.effect.equals(state.effect)
                || oldState.context.performer !== state.context.performer
                || oldState.turnCount > state.turnCount
        ));
        this.lingerStates.push(state);
    }
    
    processLingerStates(): void {
        const turnEntity = this.getTurnEntity();
        for (const state of this.lingerStates) {
            if (state.context.performer !== turnEntity) {
                continue;
            }
            state.turnCount -= 1;
            if (this.isFinished) {
                continue;
            }
            state.effect.apply(state.context);
            this.checkDefeat();
        }
        this.lingerStates = this.lingerStates.filter((state) => (state.turnCount > 0));
    }
    
    clearLingerStates(
        pointsName: string,
        recipientEntity: Entity,
        direction: number,
    ): boolean {
        const lastLength = this.lingerStates.length;
        this.lingerStates = this.lingerStates.filter((state) => {
            const { effect } = state;
            if (pointsName !== null && !effect.affectsPoints(pointsName)) {
                return true;
            }
            if (!effect.hasRecipient(state.context, recipientEntity)) {
                return true;
            }
            if (direction !== null && !effect.hasDirection(direction)) {
                return true;
            }
            return false;
        });
        return (this.lingerStates.length < lastLength);
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
        this.getTurnEntity().processPointsBursts();
        this.checkDefeat();
        this.turnIndex += 1;
        if (!this.isFinished) {
            this.getTurnEntity().points.energy.offsetValue(1);
            this.processLingerStates();
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


