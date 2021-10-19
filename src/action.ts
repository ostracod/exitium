
import { ActionJson, LearnableActionJson } from "./interfaces.js";
import { pointConstants } from "./constants.js";
import { getActionLearnCost } from "./points.js";
import { AbsolutePointsOffset, RatioPointsOffset, PowerPointsOffset, ExperiencePointsOffset } from "./pointsOffset.js";
import { EffectContext, Effect, SetPointsEffect, OffsetPointsEffect, BurstPointsEffect, TransferPointsEffect, SwapPointsEffect, LingerEffect, ClearStatusEffect, CompositeEffect, ChanceEffect } from "./effect.js";
import { Entity } from "./entity.js";
import { Species } from "./species.js";

export const actionList: Action[] = [];
export const actionMap: { [serialInteger: string]: Action } = {};

export abstract class Action {
    serialInteger: number;
    name: string;
    baseEnergyCost: number;
    effect: Effect;
    
    constructor(
        serialInteger: number,
        name: string,
        baseEnergyCost: number,
        effect: Effect,
    ) {
        this.serialInteger = serialInteger;
        this.name = name;
        this.baseEnergyCost = baseEnergyCost;
        this.effect = effect;
        actionList.push(this);
        if (this.serialInteger in actionMap) {
            throw new Error(`Duplicate action serial integer! (${this.serialInteger})`);
        }
        actionMap[this.serialInteger] = this;
    }
    
    getDiscountScale(species: Species, scale: number): number {
        return (species.discountedActions.has(this)) ? scale : 1;
    }
    
    getEnergyCost(species: Species): number {
        const scale = this.getDiscountScale(species, pointConstants.actionEnergyDiscount);
        return Math.round(scale * this.baseEnergyCost);
    }
    
    perform(performer: Entity): void {
        if (this.effect !== null) {
            const context = new EffectContext(performer);
            this.effect.apply(context);
        }
        const energyCost = this.getEnergyCost(performer.getSpecies());
        performer.points.energy.offsetValue(-energyCost);
    }
    
    iterateOverEffects(handle: (effect: Effect) => void): void {
        if (this.effect === null) {
            return;
        }
        this.effect.iterateOverEffects(handle);
    }
    
    toJson(): ActionJson {
        const effectJson = (this.effect === null) ? null : this.effect.toJson();
        return {
            serialInteger: this.serialInteger,
            name: this.name,
            baseEnergyCost: this.baseEnergyCost,
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
    baseMinimumLevel: number;
    
    constructor(
        serialInteger: number,
        name: string,
        baseMinimumLevel: number,
        baseEnergyCost: number,
        effect: Effect,
    ) {
        super(serialInteger, name, baseEnergyCost, effect);
        this.baseMinimumLevel = baseMinimumLevel;
    }
    
    getMinimumLevel(species: Species): number {
        const scale = this.getDiscountScale(species, pointConstants.actionLevelDiscount);
        return Math.round(scale * this.baseEnergyCost);
    }
    
    getExperienceCost(entity: Entity) {
        const baseExperienceCost = getActionLearnCost(entity.getLevel());
        const scale = this.getDiscountScale(
            entity.getSpecies(),
            pointConstants.actionExperienceDiscount,
        );
        return Math.round(scale * baseExperienceCost);
    }
    
    toJson(): LearnableActionJson {
        const output = super.toJson() as LearnableActionJson;
        output.baseMinimumLevel = this.baseMinimumLevel;
        return output;
    }
}

export const punchAction = new FreeAction(0, "Punch", new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-3.5),
));
new FreeAction(1, "Do Nothing", null);
new FreeAction(2, "Give Up", new SetPointsEffect("health", false, 0));

// Basic attack actions.
new LearnableAction(3, "Hefty Punch", 1, 2, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-5),
));
new LearnableAction(4, "Potent Punch", 16, 4, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-7),
));
new LearnableAction(5, "Fierce Punch", 61, 7, new OffsetPointsEffect(
    "health", true, new PowerPointsOffset(-10),
));

// Chance attack actions.
new LearnableAction(6, "Pummel", 37, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-5.5)),
));
new LearnableAction(7, "Fervent Pummel", 73, 3, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-9)),
));
new LearnableAction(8, "Clobber", 24, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-12)),
));
new LearnableAction(9, "Enraged Clobber", 44, 3, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-18)),
));

// Poison effect actions.
new LearnableAction(10, "Poison", 7, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-1.5)),
));
new LearnableAction(11, "Noxious Poison", 11, 3, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3)),
));
new LearnableAction(12, "Biohazard", 35, 1, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-1)),
));
new LearnableAction(13, "Corroding Biohazard", 52, 6, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-2)),
));

// Health leech actions.
new LearnableAction(14, "Leech", 5, 2, new TransferPointsEffect(
    "health", true, 0.5, new PowerPointsOffset(-3.5),
));
new LearnableAction(15, "Ravenous Leech", 58, 6, new TransferPointsEffect(
    "health", true, 0.5, new PowerPointsOffset(-6),
));
new LearnableAction(16, "Siphon", 28, 1, new TransferPointsEffect(
    "health", true, 0.8, new PowerPointsOffset(-2.5),
));
new LearnableAction(17, "Wide Siphon", 48, 7, new TransferPointsEffect(
    "health", true, 0.8, new PowerPointsOffset(-6),
));

// Percentage health actions.
new LearnableAction(18, "Kick", 10, 0, new OffsetPointsEffect(
    "health", true, new RatioPointsOffset(-0.1),
));
new LearnableAction(19, "Dashing Kick", 34, 2, new OffsetPointsEffect(
    "health", true, new RatioPointsOffset(-0.15),
));
new LearnableAction(20, "Stomp", 55, 0, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.15)),
));
new LearnableAction(21, "Heavy Stomp", 64, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.35)),
));
new LearnableAction(22, "Radiation", 32, 0, new LingerEffect(3,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.04)),
));
new LearnableAction(23, "Gamma Radiation", 68, 2, new LingerEffect(6,
    new OffsetPointsEffect("health", true, new RatioPointsOffset(-0.03)),
));

// Health regen actions.
new LearnableAction(24, "Rest", 14, 1, new OffsetPointsEffect(
    "health", false, new RatioPointsOffset(0.15),
));
new LearnableAction(25, "Mindful Rest", 63, 5, new OffsetPointsEffect(
    "health", false, new RatioPointsOffset(0.30),
));
new LearnableAction(26, "Mend", 22, 2, new ChanceEffect(0.65,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.25)),
));
new LearnableAction(27, "Hasty Mend", 69, 0, new ChanceEffect(0.3,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.35)),
));
new LearnableAction(28, "Soothe", 4, 2, new LingerEffect(3,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.06)),
));
new LearnableAction(29, "Gentle Soothe", 33, 4, new LingerEffect(6,
    new OffsetPointsEffect("health", false, new RatioPointsOffset(0.05)),
));

// Energy decrease actions.
new LearnableAction(30, "Stress", 20, 0, new OffsetPointsEffect(
    "energy", true, new AbsolutePointsOffset(-2),
));
new LearnableAction(31, "Frantic Stress", 38, 2, new OffsetPointsEffect(
    "energy", true, new AbsolutePointsOffset(-4),
));
new LearnableAction(32, "Bewilder", 15, 2, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(-8)),
));
new LearnableAction(33, "Burden", 29, 0, new LingerEffect(3,
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(-1)),
));

// Energy increase actions.
new LearnableAction(34, "Excite", 6, 0, new OffsetPointsEffect(
    "energy", false, new AbsolutePointsOffset(2),
));
new LearnableAction(35, "Invigorate", 45, 0, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(4)),
));
new LearnableAction(36, "Galvanize", 40, 2, new ChanceEffect(0.5,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(8)),
));
new LearnableAction(37, "Inspire", 23, 0, new LingerEffect(3,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(1)),
));

// Damage decrease actions.
new LearnableAction(38, "Fortify", 3, 0, new OffsetPointsEffect(
    "damage", true, new AbsolutePointsOffset(-1),
));
new LearnableAction(39, "Grand Fortify", 65, 3, new OffsetPointsEffect(
    "damage", true, new AbsolutePointsOffset(-2),
));
new LearnableAction(40, "Shield", 18, 0, new BurstPointsEffect(
    "damage", true, new AbsolutePointsOffset(-2), 2
));
new LearnableAction(41, "Sturdy Shield", 49, 3, new BurstPointsEffect(
    "damage", true, new AbsolutePointsOffset(-4), 2
));
new LearnableAction(42, "Obstruct", 36, 0, new ChanceEffect(0.5,
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(-4), 2),
));

// Damage increase actions.
new LearnableAction(43, "Equip", 2, 0, new OffsetPointsEffect(
    "damage", false, new AbsolutePointsOffset(1),
));
new LearnableAction(44, "Crafty Equip", 39, 3, new OffsetPointsEffect(
    "damage", false, new AbsolutePointsOffset(2),
));
new LearnableAction(45, "Sharpen", 8, 0, new BurstPointsEffect(
    "damage", false, new AbsolutePointsOffset(2), 2
));
new LearnableAction(46, "Razor Sharpen", 12, 3, new BurstPointsEffect(
    "damage", false, new AbsolutePointsOffset(4), 2
));
new LearnableAction(47, "Devise", 59, 0, new ChanceEffect(0.5,
    new BurstPointsEffect("damage", false, new AbsolutePointsOffset(4), 2),
));

// Other damage actions.
new LearnableAction(48, "Contra Revert", 51, 5, new SetPointsEffect(
    "damage", true, pointConstants.startDamage,
));
new LearnableAction(49, "Auto Revert", 41, 5, new SetPointsEffect(
    "damage", false, pointConstants.startDamage,
));
new LearnableAction(50, "Heist", 67, 3, new TransferPointsEffect(
    "damage", true, 1, new AbsolutePointsOffset(-1),
));
new LearnableAction(51, "Switcharoo", 54, 7, new SwapPointsEffect("damage"));

// Clear status actions.
new LearnableAction(52, "Inhibitor", 53, 0, new ClearStatusEffect("health", true, 1));
new LearnableAction(53, "Antitoxin", 9, 0, new ClearStatusEffect("health", false, -1));
new LearnableAction(54, "Disarm", 56, 0, new ClearStatusEffect("damage", true, 1));
new LearnableAction(55, "Fracture", 47, 0, new ClearStatusEffect("damage", false, -1));
new LearnableAction(56, "Nullify", 31, 2, new ClearStatusEffect(null, true, null));
new LearnableAction(57, "Purify", 17, 2, new ClearStatusEffect(null, false, null));
new LearnableAction(58, "Damper", 43, 4, new ClearStatusEffect(null, true, 1));
new LearnableAction(59, "Rejuvinate", 25, 4, new ClearStatusEffect(null, false, -1));

// Health-health combo actions.
new LearnableAction(60, "Backfire", 13, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(61, "Sting Jab", 66, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new LingerEffect(3, new OffsetPointsEffect("health", false, new PowerPointsOffset(-2))),
]));

// Health-energy combo actions.
new LearnableAction(62, "Dishearten", 50, 0, new CompositeEffect([
    new TransferPointsEffect("energy", true, 1, new AbsolutePointsOffset(-3)),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-3)),
]));
new LearnableAction(63, "Sweet Dream", 42, 0, new CompositeEffect([
    new OffsetPointsEffect("health", false, new PowerPointsOffset(6)),
    new LingerEffect(3, new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(1))),
]));

// Health-damage combo actions.
new LearnableAction(64, "Curling Bash", 19, 3, new CompositeEffect([
    new OffsetPointsEffect("damage", true, new AbsolutePointsOffset(-1)),
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(65, "Overexert", 26, 0, new CompositeEffect([
    new BurstPointsEffect("damage", false, new AbsolutePointsOffset(5), 2),
    new OffsetPointsEffect("health", false, new PowerPointsOffset(-4)),
]));

// Energy-energy combo actions.
new LearnableAction(66, "Caffeine Rush", 62, 0, new CompositeEffect([
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(6)),
    new LingerEffect(3,
        new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(-2)),
    ),
]));
new LearnableAction(67, "Gambling High", 71, 0, new ChanceEffect(0.75,
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(6)),
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(6)),
));

// Energy-damage combo actions.
new LearnableAction(68, "Razzle Dazzle", 46, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(2)),
    new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(3)),
]));
new LearnableAction(69, "Mentor", 21, 0, new CompositeEffect([
    new OffsetPointsEffect("energy", false, new AbsolutePointsOffset(5)),
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(3), 2),
]));

// Damage-damage combo actions.
new LearnableAction(70, "Stepping Stone", 27, 7, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(1)),
    new SetPointsEffect("damage", true, pointConstants.startDamage),
]));
new LearnableAction(71, "Handover", 60, 0, new CompositeEffect([
    new TransferPointsEffect("damage", true, 1, new AbsolutePointsOffset(-1)),
    new BurstPointsEffect("damage", true, new AbsolutePointsOffset(2), 2),
]));

// Clear status combo actions.
new LearnableAction(72, "Charcoal Strike", 30, 2, new CompositeEffect([
    new ClearStatusEffect("health", false, null),
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-3.5)),
]));
new LearnableAction(73, "Exfoliate", 57, 0, new CompositeEffect([
    new ClearStatusEffect(null, false, null),
    new LingerEffect(3, new OffsetPointsEffect("energy", true, new AbsolutePointsOffset(1))),
]));
new LearnableAction(74, "Bleach", 70, 7, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(2)),
    new ClearStatusEffect(null, true, null),
]));
new LearnableAction(75, "Double Blind", 75, 0, new ChanceEffect(0.5,
    new ClearStatusEffect(null, false, -1),
    new ClearStatusEffect(null, true, -1),
));

// Misc combo actions.
new LearnableAction(76, "Capitalism", 74, 0, new CompositeEffect([
    new OffsetPointsEffect("health", true, new PowerPointsOffset(-7)),
    new OffsetPointsEffect("gold", false, new AbsolutePointsOffset(-2)),
]));
new LearnableAction(77, "Brain Dump", 72, 0, new CompositeEffect([
    new OffsetPointsEffect("damage", false, new AbsolutePointsOffset(3)),
    new OffsetPointsEffect("experience", false, new ExperiencePointsOffset(-1)),
]));


