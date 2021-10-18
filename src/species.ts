
import { SpeciesJson } from "./interfaces.js";
import { ClearStatusEffect, LingerEffect, BurstPointsEffect, OffsetPointsEffect, TransferPointsEffect } from "./effect.js";
import { Action, actionList } from "./action.js";

export const speciesList: Species[] = [];
export const speciesMap: { [serialInteger: string]: Species } = {};

export abstract class Species {
    serialInteger: number;
    name: string;
    description: string;
    discountedActions: Set<Action>;
    
    constructor(serialInteger: number, name: string, description: string) {
        this.serialInteger = serialInteger;
        this.name = name;
        this.description = description;
        speciesList.push(this);
        speciesMap[this.serialInteger] = this;
        // Subclasses should call initialize() in their constructor.
        // This is because actionHasDiscount() may depend on subclass properties
        // which cannot be populated before the super constructor.
    }
    
    initialize(): void {
        this.discountedActions = new Set(actionList.filter((action) => (
            this.actionHasDiscount(action)
        )));
    }
    
    // Note that it will be more efficient to check
    // this.discountedActions.has(action) after
    // construction of this class.
    abstract actionHasDiscount(action: Action): boolean;
    
    toJson(): SpeciesJson {
        return {
            serialInteger: this.serialInteger,
            name: this.name,
            description: this.description,
        }
    }
}

class SlimeSpecies extends Species {
    
    constructor() {
        super(0, "slime", "Specializes in clearing status effects.");
        this.initialize();
    }
    
    actionHasDiscount(action: Action): boolean {
        let output = false;
        action.iterateOverEffects((effect) => {
            if (effect instanceof ClearStatusEffect) {
                output = true;
            }
        });
        return output;
    }
}

class SpiderSpecies extends Species {
    
    constructor() {
        super(1, "spider", "Specializes in negative status effects.");
        this.initialize();
    }
    
    actionHasDiscount(action: Action): boolean {
        let output = false;
        action.iterateOverEffects((effect) => {
            if ((effect instanceof LingerEffect || effect instanceof BurstPointsEffect)
                    && effect.hasDirection(-1)) {
                output = true;
            }
        });
        return output;
    }
}

class PointsIncreaseSpecies extends Species {
    pointsName: string;
    
    constructor(serialInteger, name, pointsName) {
        super(serialInteger, name, `Specializes in boosting ${pointsName} points.`);
        this.pointsName = pointsName;
        this.initialize();
    }
    
    actionHasDiscount(action: Action): boolean {
        let output = false;
        action.iterateOverEffects((effect) => {
            if ((effect instanceof OffsetPointsEffect
                    || effect instanceof TransferPointsEffect)
                    && effect.pointsName === this.pointsName && effect.offset.isPositive()) {
                output = true;
            }
        });
        return output;
    }
}

class MushroomSpecies extends PointsIncreaseSpecies {
    
    constructor() {
        super(2, "mushroom", "health");
    }
}

class CrystalSpecies extends PointsIncreaseSpecies {
    
    constructor() {
        super(3, "crystal", "energy");
    }
}

class RobotSpecies extends PointsIncreaseSpecies {
    
    constructor() {
        super(4, "robot", "damage");
    }
}

new SlimeSpecies();
new SpiderSpecies();
new MushroomSpecies();
new CrystalSpecies();
new RobotSpecies();


