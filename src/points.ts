
import { Player } from "./interfaces.js";
import { pointConstants } from "./constants.js";

export abstract class Points {
    minimumValue: number;
    maximumValue: number;
    
    constructor(minimumValue: number, maximumValue: number) {
        this.minimumValue = minimumValue;
        this.maximumValue = maximumValue;
    }
    
    abstract getValue(): number;
    
    abstract setValueHelper(value: number): void;
    
    setValue(value: number): void {
        this.setValueHelper(this.clampValue(value));
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

const getRewardMultiplier = (winnerLevel: number, loserLevel: number): number => {
    const winnerPowerMultiplier = getPowerMultiplier(winnerLevel);
    const loserPowerMultiplier = getPowerMultiplier(loserLevel);
    const powerMagnitudeDelta = Math.log2(loserPowerMultiplier / winnerPowerMultiplier);
    return 1 / (1 + 2 ** (-1.5 * powerMagnitudeDelta + 3));
};

const getExperienceMultiplier = (level: number): number => (
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


