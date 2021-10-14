
import { PointsOffsetJson, AbsolutePointsOffsetJson, RatioPointsOffsetJson, ScalePointsOffsetJson } from "./interfaces.js";
import { Points, fuzzyRound, getPowerMultiplier, getDamageMultiplier, getExperienceMultiplier } from "./points.js";
import { EffectContext } from "./effect.js";

const powerNormalization = getPowerMultiplier(5);

export abstract class PointsOffset {
    
    abstract equals(offset: PointsOffset): boolean;
    
    abstract getName(): string;
    
    abstract isPositive(): boolean;
    
    abstract getAbsoluteOffsetHelper(context: EffectContext, points: Points): number;
    
    getAbsoluteOffset(context: EffectContext, points: Points): number {
        let output = this.getAbsoluteOffsetHelper(context, points);
        if (points.name === "health" && output < 0) {
            output *= getDamageMultiplier(context.damage);
        }
        return output;
    }
    
    apply(context: EffectContext, points: Points): number {
        const offset = this.getAbsoluteOffset(context, points);
        return points.offsetValue(fuzzyRound(offset));
    }
    
    toJson(): PointsOffsetJson {
        return { name: this.getName() };
    }
}

export class AbsolutePointsOffset extends PointsOffset {
    value: number;
    
    constructor(value: number) {
        super();
        this.value = value;
    }
    
    equals(offset: PointsOffset): boolean {
        return (offset instanceof AbsolutePointsOffset && this.value === offset.value);
    }
    
    getName(): string {
        return "absolute";
    }
    
    isPositive(): boolean {
        return (this.value > 0);
    }
    
    getAbsoluteOffsetHelper(context: EffectContext, points: Points): number {
        return this.value;
    }
    
    toJson(): AbsolutePointsOffsetJson {
        const output = super.toJson() as AbsolutePointsOffsetJson;
        output.value = this.value;
        return output;
    }
}

export class RatioPointsOffset extends PointsOffset {
    ratio: number;
    
    constructor(ratio: number) {
        super();
        this.ratio = ratio;
    }
    
    equals(offset: PointsOffset): boolean {
        return (offset instanceof RatioPointsOffset && this.ratio === offset.ratio);
    }
    
    getName(): string {
        return "ratio";
    }
    
    isPositive(): boolean {
        return (this.ratio > 0);
    }
    
    getAbsoluteOffsetHelper(context: EffectContext, points: Points): number {
        return this.ratio * points.maximumValue;
    }
    
    toJson(): RatioPointsOffsetJson {
        const output = super.toJson() as RatioPointsOffsetJson;
        output.ratio = this.ratio;
        return output;
    }
}

abstract class ScalePointsOffset extends PointsOffset {
    scale: number;
    
    constructor(scale: number) {
        super();
        this.scale = scale;
    }
    
    equals(offset: PointsOffset): boolean {
        return (offset instanceof ScalePointsOffset && this.scale === offset.scale);
    }
    
    isPositive(): boolean {
        return (this.scale > 0);
    }
    
    toJson(): ScalePointsOffsetJson {
        const output = super.toJson() as ScalePointsOffsetJson;
        output.scale = this.scale;
        return output;
    }
}

export class PowerPointsOffset extends ScalePointsOffset {
    
    constructor(value: number) {
        super(value / powerNormalization);
    }
    
    equals(offset: PointsOffset): boolean {
        return (super.equals(offset) && offset instanceof PowerPointsOffset);
    }
    
    getName(): string {
        return "power";
    }
    
    getAbsoluteOffsetHelper(context: EffectContext, points: Points): number {
        return this.scale * getPowerMultiplier(context.performer.getLevel());
    }
}

export class ExperiencePointsOffset extends ScalePointsOffset {
    
    equals(offset: PointsOffset): boolean {
        return (super.equals(offset) && offset instanceof ExperiencePointsOffset);
    }
    
    getName(): string {
        return "experience";
    }
    
    getAbsoluteOffsetHelper(context: EffectContext, points: Points): number {
        return this.scale * getExperienceMultiplier(context.performer.getLevel());
    }
}


