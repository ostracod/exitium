
import { W as lambertW } from "lambert-w-function";
import { Player, PointsBurstJson, PointsJson } from "./interfaces.js";
import { pointConstants } from "./constants.js";

export class PointsBurst {
    offset: number;
    turnCount: number;
    extraTurnCount: number;
    
    constructor(offset: number, turnCount: number, extraTurnCount: number) {
        this.offset = offset;
        this.turnCount = turnCount;
        this.extraTurnCount = extraTurnCount;
    }
    
    handleTurn(): void {
        if (this.extraTurnCount > 0) {
            this.extraTurnCount -= 1;
        } else {
            this.turnCount -= 1;
        }
    }
    
    hasFinished(): boolean {
        return (this.turnCount + this.extraTurnCount <= 0);
    }
    
    toJson(): PointsBurstJson {
        return {
            offset: this.offset,
            turnCount: this.turnCount,
        };
    }
}

export abstract class Points {
    minimumValue: number;
    maximumValue: number;
    name: string;
    bursts: PointsBurst[];
    
    constructor(minimumValue: number, maximumValue: number) {
        this.minimumValue = minimumValue;
        this.maximumValue = maximumValue;
        this.name = null;
        this.bursts = [];
    }
    
    abstract getValue(): number;
    
    abstract setValueHelper(value: number): void;
    
    setValue(value: number): void {
        this.setValueHelper(this.clampValue(value));
    }
    
    getEffectiveValue(): number {
        const value = this.getValue();
        let minimumOffset = 0;
        let maximumOffset = 0;
        this.bursts.forEach((burst) => {
            minimumOffset = Math.min(minimumOffset, burst.offset);
            maximumOffset = Math.max(maximumOffset, burst.offset);
        });
        return this.clampValue(value + minimumOffset + maximumOffset);
    }
    
    offsetValue(amount: number): number {
        const oldValue = this.getValue();
        this.setValue(this.getValue() + amount);
        return this.getValue() - oldValue;
    }
    
    clampValue(value: number): number {
        let output = value;
        if (this.minimumValue !== null) {
            output = Math.max(this.minimumValue, output);
        }
        if (this.maximumValue !== null) {
            output = Math.min(this.maximumValue, output);
        }
        return output;
    }
    
    addBurst(burst: PointsBurst): void {
        this.bursts = this.bursts.filter((oldBurst) => (
            oldBurst.offset !== burst.offset || oldBurst.turnCount > burst.turnCount
        ));
        this.bursts.push(burst);
    }
    
    processBursts(): void {
        const nextBursts: PointsBurst[] = [];
        this.bursts.forEach((burst) => {
            burst.handleTurn();
            if (!burst.hasFinished()) {
                nextBursts.push(burst);
            }
        });
        this.bursts = nextBursts;
    }
    
    clearBursts(direction: number): boolean {
        const lastLength = this.bursts.length;
        if (direction === null) {
            this.bursts = [];
        } else {
            this.bursts = this.bursts.filter((burst) => (
                Math.sign(burst.offset) !== Math.sign(direction)
            ));
        }
        return (this.bursts.length < lastLength);
    }
    
    toJson(): PointsJson {
        return {
            value: this.getEffectiveValue(),
            maximumValue: this.maximumValue,
            bursts: this.bursts.map((burst) => burst.toJson()),
        };
    }
}

export class TempPoints extends Points {
    value: number;
    
    constructor(minimumValue: number, maximumValue: number, value: number) {
        super(minimumValue, maximumValue);
        this.value = value;
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValueHelper(value: number): void {
        this.value = value;
    }
}

export class PlayerPoints extends Points {
    player: Player;
    fieldName: string;
    
    constructor(
        minimumValue: number,
        maximumValue: number,
        player: Player,
        fieldName: string,
        defaultValue: number,
    ) {
        super(minimumValue, maximumValue);
        this.player = player;
        this.fieldName = fieldName;
        const value = this.getValue();
        if (value === null) {
            this.setValue(defaultValue);
        }
    }
    
    getValue(): number {
        return this.player.extraFields[this.fieldName];
    }
    
    setValueHelper(value: number): void {
        this.player.extraFields[this.fieldName] = value;
    }
}

export const fuzzyRound = (value: number): number => {
    const floorValue = Math.floor(value);
    return (Math.random() > value - floorValue) ? floorValue : floorValue + 1;
};

export const getPowerMultiplier = (level: number): number => (
    pointConstants.powerMultiplierCoefficient * level + pointConstants.powerMultiplierBase ** level - pointConstants.powerMultiplierOffset
);

export const getLevelByPower = (powerMultiplier: number): number => {
    const W = (value: number): number => lambertW(value, 30);
    const ln = Math.log;
    const a = pointConstants.powerMultiplierCoefficient;
    const b = pointConstants.powerMultiplierBase;
    const c = powerMultiplier + pointConstants.powerMultiplierOffset
    // I used Wolfram Alpha to find the solution to 0 = a * x + b ^ x - c.
    return (c * ln(b) - a * W(b ** (c / a) * ln(b) / a)) / (a * ln(b));
};

const getRewardMultiplier = (winnerLevel: number, loserLevel: number): number => {
    const winnerPowerMultiplier = getPowerMultiplier(winnerLevel);
    const loserPowerMultiplier = getPowerMultiplier(loserLevel);
    const powerMagnitudeDelta = Math.log2(loserPowerMultiplier / winnerPowerMultiplier);
    return 1 / (1 + 2 ** (-1.5 * powerMagnitudeDelta + 3));
};

export const getExperienceMultiplier = (level: number): number => (
    pointConstants.experienceMultiplierOffset + level
);

export const getMaximumHealth = (level: number): number => (
    Math.round(57 * getPowerMultiplier(level))
);

export const getGoldReward = (winnerLevel: number, loserLevel: number): number => {
    const gold = 100 * getRewardMultiplier(winnerLevel, loserLevel);
    return fuzzyRound(gold);
};

export const getExperienceReward = (winnerLevel: number, loserLevel: number): number => {
    const rewardMultiplier = getRewardMultiplier(winnerLevel, loserLevel);
    const experience = 10 * getExperienceMultiplier(loserLevel) * rewardMultiplier
    return fuzzyRound(experience);
};

export const getLevelUpCost = (level: number): number => (
    Math.round(getExperienceMultiplier(level) * pointConstants.levelUpCostBase ** level)
);

export const getActionLearnCost = (level: number): number => (
    Math.round(pointConstants.actionLearnCostCoefficient * getExperienceMultiplier(level) * (level + pointConstants.actionLearnCostOffset))
);

export const getDamageMultiplier = (damage: number): number => (
    pointConstants.damageMultiplierBase ** (pointConstants.damageMultiplierCoefficient * (damage - pointConstants.damageMultiplierNormalization))
);


