
import { ActionJson, LearnableActionJson } from "./interfaces.js";
import { pointConstants } from "./constants.js";
import { getActionLearnCost } from "./points.js";
import { AbsolutePointsOffset, RatioPointsOffset, PowerPointsOffset, ExperiencePointsOffset } from "./pointsOffset.js";
import { EffectContext, Effect, SetPointsEffect, OffsetPointsEffect, BurstPointsEffect, TransferPointsEffect, SwapPointsEffect, LingerEffect, ClearStatusEffect, CompositeEffect, ChanceEffect } from "./effect.js";
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
        if (this.serialInteger in actionMap) {
            throw new Error(`Duplicate action serial integer! (${this.serialInteger})`);
        }
        actionMap[this.serialInteger] = this;
    }
    
    perform(performer: Entity): void {
        if (this.effect !== null) {
            const context = new EffectContext(performer);
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

new FreeAction(0, "Punch", new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-3.5),
));
new FreeAction(1, "Do Nothing", null);
new FreeAction(2, "Give Up", new SetPointsEffect("health", false, 0));

// Basic attack actions.
new LearnableAction(3, "NAME", 1, 0, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-5),
));
new LearnableAction(4, "NAME", 1, 0, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-7),
));
new LearnableAction(5, "NAME", 1, 0, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-10),
));

// Chance attack actions.
new LearnableAction(6, "NAME", 1, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-5.5)),
));
new LearnableAction(7, "NAME", 1, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-9)),
));
new LearnableAction(8, "NAME", 1, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-12)),
));
new LearnableAction(9, "NAME", 1, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-18)),
));

// Poison effect actions.
new LearnableAction(10, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-1.5)),
));
new LearnableAction(11, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3)),
));
new LearnableAction(12, "NAME", 1, 0, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-1)),
));
new LearnableAction(13, "NAME", 1, 0, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-2)),
));

// Health leech actions.
new LearnableAction(14, "NAME", 1, 0, new TransferPointsEffect(
    "health", true, 0.5, new PowerPointsOffset(-2.5),
));
new LearnableAction(15, "NAME", 1, 0, new TransferPointsEffect(
    "health", true, 0.5, new PowerPointsOffset(-5),
));
new LearnableAction(16, "NAME", 1, 0, new TransferPointsEffect(
    "health", true, 0.8, new PowerPointsOffset(-3.5),
));
new LearnableAction(17, "NAME", 1, 0, new TransferPointsEffect(
    "health", true, 0.8, new PowerPointsOffset(-6),
));

// Percentage health actions.
new LearnableAction(18, "NAME", 1, 0, new OffsetPointsEffect(
    "health", true, new RatioPointsOffset(-0.1),
));
new LearnableAction(19, "NAME", 1, 0, new OffsetPointsEffect(
    "health", true, new RatioPointsOffset(-0.15),
));
new LearnableAction(20, "NAME", 1, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.15)),
));
new LearnableAction(21, "NAME", 1, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.35)),
));
new LearnableAction(22, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.04)),
));
new LearnableAction(23, "NAME", 1, 0, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.03)),
));

// Health regen actions.
new LearnableAction(24, "NAME", 1, 0, new OffsetPointsEffect(
    "health", false, new RatioPointsOffset(0.15),
));
new LearnableAction(25, "NAME", 1, 0, new OffsetPointsEffect(
    "health", false, new RatioPointsOffset(0.30),
));
new LearnableAction(26, "NAME", 1, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.25)),
));
new LearnableAction(27, "NAME", 1, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.35)),
));
new LearnableAction(28, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.06)),
));
new LearnableAction(29, "NAME", 1, 0, new LingerEffect(6,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.05)),
));

// Energy decrease actions.
new LearnableAction(30, "NAME", 1, 0, new OffsetPointsEffect(
    "energy", true, new AbsolutePointsOffset(-2),
));
new LearnableAction(31, "NAME", 1, 0, new OffsetPointsEffect(
    "energy", true, new AbsolutePointsOffset(-4),
));
new LearnableAction(32, "NAME", 1, 0, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(-8)),
));
new LearnableAction(33, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(-1)),
));

// Energy increase actions.
new LearnableAction(34, "NAME", 1, 0, new OffsetPointsEffect(
    "energy", false, new AbsolutePointsOffset(2),
));
new LearnableAction(35, "NAME", 1, 0, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(4)),
));
new LearnableAction(36, "NAME", 1, 0, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(6)),
));
new LearnableAction(37, "NAME", 1, 0, new LingerEffect(3,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(1)),
));

// Damage decrease actions.
new LearnableAction(38, "NAME", 1, 0, new OffsetPointsEffect(
    "damage", true, new AbsolutePointsOffset(-1),
));
new LearnableAction(39, "NAME", 1, 0, new OffsetPointsEffect(
    "damage", true, new AbsolutePointsOffset(-2),
));
new LearnableAction(40, "NAME", 1, 0, new BurstPointsEffect(
    "damage", true, new AbsolutePointsOffset(-2), 2
));
new LearnableAction(41, "NAME", 1, 0, new BurstPointsEffect(
    "damage", true, new AbsolutePointsOffset(-4), 2
));
new LearnableAction(42, "NAME", 1, 0, new ChanceEffect(0.5,
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(-4), 2),
));

// Damage increase actions.
new LearnableAction(43, "NAME", 1, 0, new OffsetPointsEffect(
    "damage", false, new AbsolutePointsOffset(1),
));
new LearnableAction(44, "NAME", 1, 0, new OffsetPointsEffect(
    "damage", false, new AbsolutePointsOffset(2),
));
new LearnableAction(45, "NAME", 1, 0, new BurstPointsEffect(
    "damage", false, new AbsolutePointsOffset(2), 2
));
new LearnableAction(46, "NAME", 1, 0, new BurstPointsEffect(
    "damage", false, new AbsolutePointsOffset(4), 2
));
new LearnableAction(47, "NAME", 1, 0, new ChanceEffect(0.5,
    new BurstPointsEffect("damage", false, new AbsolutePointsOffset(4), 2),
));

// Other damage actions.
new LearnableAction(48, "NAME", 1, 0, new SetPointsEffect(
    "damage", true, pointConstants.startDamage,
));
new LearnableAction(49, "NAME", 1, 0, new SetPointsEffect(
    "damage", false, pointConstants.startDamage,
));
new LearnableAction(50, "NAME", 1, 0, new TransferPointsEffect(
    "damage", true, 1, new AbsolutePointsOffset(-1),
));
new LearnableAction(51, "NAME", 1, 0, new SwapPointsEffect("damage"));

// Clear status actions.
new LearnableAction(52, "NAME", 1, 0, new ClearStatusEffect("health", true, 1));
new LearnableAction(53, "NAME", 1, 0, new ClearStatusEffect("health", false, -1));
new LearnableAction(54, "NAME", 1, 0, new ClearStatusEffect("damage", true, 1));
new LearnableAction(55, "NAME", 1, 0, new ClearStatusEffect("damage", false, -1));
new LearnableAction(56, "NAME", 1, 0, new ClearStatusEffect(null, true, null));
new LearnableAction(57, "NAME", 1, 0, new ClearStatusEffect(null, false, null));
new LearnableAction(58, "NAME", 1, 0, new ClearStatusEffect(null, true, 1));
new LearnableAction(59, "NAME", 1, 0, new ClearStatusEffect(null, false, -1));

// Health-health combo actions.
new LearnableAction(60, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(61, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new LingerEffect(3, new OffsetPointsEffect("health", false, new PowerPointsOffset(-2))),
]));

// Health-energy combo actions.
new LearnableAction(62, "NAME", 1, 0, new CompositeEffect([
    new TransferPointsEffect("energy", true, 1, new AbsolutePointsOffset(-3)),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-5)),
]));
new LearnableAction(63, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("health", false, new PowerPointsOffset(6)),
    new LingerEffect(3, new OffsetPointsEffect("energy", true, new PowerPointsOffset(1))),
]));

// Health-damage combo actions.
new LearnableAction(64, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", true, new AbsolutePointsOffset(-1)),
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(65, "NAME", 1, 0, new CompositeEffect([
    new BurstPointsEffect("damage", false, new AbsolutePointsOffset(5), 2),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-5)),
]));

// Energy-energy combo actions.
new LearnableAction(66, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(6)),
    new LingerEffect(3, new OffsetPointsEffect("energy", false, new PowerPointsOffset(-2))),
]));
new LearnableAction(67, "NAME", 1, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(4)),
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(4)),
));

// Energy-damage combo actions.
new LearnableAction(68, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(2)),
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(4)),
]));
new LearnableAction(69, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(5)),
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(-3), 2),
]));

// Damage-damage combo actions.
new LearnableAction(70, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(1)),
    new SetPointsEffect("damage", true, pointConstants.startDamage),
]));
new LearnableAction(71, "NAME", 1, 0, new CompositeEffect([
    new TransferPointsEffect("damage", true, 1, new AbsolutePointsOffset(-1)),
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(2), 2),
]));

// Clear status combo actions.
new LearnableAction(72, "NAME", 1, 0, new CompositeEffect([
    new ClearStatusEffect("health", false, null),
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(74, "NAME", 1, 0, new CompositeEffect([
    new ClearStatusEffect(null, false, null),
    new LingerEffect(3, new OffsetPointsEffect("energy", true, new PowerPointsOffset(1))),
]));
new LearnableAction(75, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(2)),
    new ClearStatusEffect(null, true, null),
]));
new LearnableAction(76, "NAME", 1, 0, new ChanceEffect(0.5,
    new ClearStatusEffect(null, false, -1),
    new ClearStatusEffect(null, true, -1),
));

// Misc combo actions.
new LearnableAction(77, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new OffsetPointsEffect("gold", false, new AbsolutePointsOffset(-2)),
]));
new LearnableAction(78, "NAME", 1, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(3)),
    new OffsetPointsEffect("experience", false, new ExperiencePointsOffset(-1)),
]));


