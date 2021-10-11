
import { ActionJson, LearnableActionJson } from "./interfaces.js";
import { getActionLearnCost } from "./points.js";
import { AbsolutePointsOffset, PowerPointsOffset } from "./pointsOffset.js";
import { EffectContext, Effect, SetPointsEffect, OffsetPointsEffect, BurstPointsEffect, TransferPointsEffect, SwapPointsEffect, LingerEffect, ClearStatusEffect } from "./effect.js";
import { Entity } from "./entity.js";

export const actionList: Action[] = [];
export const actionMap: { [serialInteger: string]: Action } = {};

export abstract class Action {
    serialInteger: number;
    name: string;
    energyCost: number;
    effect: Effect;
    
    constructor(
        serialInteger: number,
        name: string,
        energyCost: number,
        effect: Effect,
    ) {
        this.serialInteger = serialInteger;
        this.name = name;
        this.energyCost = energyCost;
        this.effect = effect;
        actionList.push(this);
        actionMap[this.serialInteger] = this;
    }
    
    perform(performer: Entity, opponent: Entity): void {
        if (this.effect !== null) {
            const context = new EffectContext(performer, opponent);
            this.effect.apply(context);
        }
        performer.points.energy.offsetValue(-this.energyCost);
    }
    
    toJson(): ActionJson {
        const effectJson = (this.effect === null) ? null : this.effect.toJson();
        return {
            serialInteger: this.serialInteger,
            name: this.name,
            energyCost: this.energyCost,
            effect: effectJson,
        };
    }
}

export class FreeAction extends Action {
    
    constructor(serialInteger: number, name: string, effect: Effect) {
        super(serialInteger, name, 0, effect);
    }
}

export class LearnableAction extends Action {
    minimumLevel: number;
    
    constructor(
        serialInteger: number,
        name: string,
        minimumLevel: number,
        energyCost: number,
        effect: Effect,
    ) {
        super(serialInteger, name, energyCost, effect);
        this.minimumLevel = minimumLevel;
    }
    
    getExperienceCost(entity: Entity) {
        return getActionLearnCost(entity.getLevel());
    }
    
    toJson(): LearnableActionJson {
        const output = super.toJson() as LearnableActionJson;
        output.minimumLevel = this.minimumLevel;
        return output;
    }
}

new FreeAction(0, "Small Punch", new OffsetPointsEffect(
    "health", true, new AbsolutePointsOffset(-5),
));
new FreeAction(1, "Do Nothing", null);
new FreeAction(2, "Give Up", new SetPointsEffect("health", false, 0));
new LearnableAction(3, "Big Punch", 7, 1, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-10),
));
new FreeAction(4, "Hype Up", new BurstPointsEffect(
    "damage", false, new AbsolutePointsOffset(2), 3,
));


