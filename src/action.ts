
import { ActionJson } from "./interfaces.js";
import { Effect, SetPointsEffect, OffsetPointsEffect } from "./effect.js";
import { Entity } from "./entity.js";

export const actionList: Action[] = [];
export const actionMap: { [serialInteger: string]: Action } = {};

export class Action {
    serialInteger: number;
    name: string;
    minimumLevel: number;
    energyCost: number;
    effect: Effect;
    
    constructor(
        serialInteger: number,
        name: string,
        minimumLevel: number,
        energyCost: number,
        effect: Effect,
    ) {
        this.serialInteger = serialInteger;
        this.name = name;
        this.minimumLevel = minimumLevel;
        this.energyCost = energyCost;
        this.effect = effect;
        actionList.push(this);
        actionMap[this.serialInteger] = this;
    }
    
    perform(localEntity: Entity, opponentEntity: Entity): void {
        this.effect.apply(localEntity, opponentEntity);
    }
    
    toJson(): ActionJson {
        return {
            serialInteger: this.serialInteger,
            name: this.name,
            minimumLevel: this.minimumLevel,
            energyCost: this.energyCost,
            effect: this.effect.toJson(),
        };
    }
}

new Action(0, "Small Punch", 1, 0, new OffsetPointsEffect("health", true, -5));
new Action(1, "Big Punch", 2, 3, new OffsetPointsEffect("health", true, -15));
new Action(2, "Give Up", 0, 0, new SetPointsEffect("health", false, 0));


