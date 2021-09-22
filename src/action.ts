
import { ActionJson } from "./interfaces.js";
import { Effect, OffsetPointsEffect } from "./effect.js";

export class Action {
    name: string;
    minimumLevel: number;
    energyCost: number;
    effect: Effect;
    
    constructor(name: string, minimumLevel: number, energyCost: number, effect: Effect) {
        this.name = name;
        this.minimumLevel = minimumLevel;
        this.energyCost = energyCost;
        this.effect = effect;
    }
    
    toJson(): ActionJson {
        return {
            name: this.name,
            minimumLevel: this.minimumLevel,
            energyCost: this.energyCost,
            effect: this.effect.toJson(),
        };
    }
}

export const actions = [
    new Action("Small Punch", 1, 0, new OffsetPointsEffect("health", true, 5)),
    new Action("Big Punch", 2, 3, new OffsetPointsEffect("health", true, 15)),
];


