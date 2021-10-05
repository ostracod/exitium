
import { PointsOffsetJson, AbsolutePointsOffsetJson, RatioPointsOffsetJson, PowerPointsOffsetJson } from "./interfaces.js";
import { Points, fuzzyRound, getPowerMultiplier } from "./points.js";

const powerNormalization = getPowerMultiplier(5);

export abstract class PointsOffset {
    
    abstract getName(): string;
    
    abstract getAbsoluteOffset(level: number, points: Points): number;
    
    apply(level: number, points: Points): number {
        const offset = this.getAbsoluteOffset(level, points);
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
    
    getName(): string {
        return "absolute";
    }
    
    getAbsoluteOffset(level: number, points: Points): number {
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
    
    getName(): string {
        return "ratio";
    }
    
    getAbsoluteOffset(level: number, points: Points): number {
        return this.ratio * points.maximumValue;
    }
    
    toJson(): RatioPointsOffsetJson {
        const output = super.toJson() as RatioPointsOffsetJson;
        output.ratio = this.ratio;
        return output;
    }
}

export class PowerPointsOffset extends PointsOffset {
    scale: number;
    
    constructor(value: number) {
        super();
        this.scale = value / powerNormalization;
    }
    
    getName(): string {
        return "power";
    }
    
    getAbsoluteOffset(level: number, points: Points): number {
        return this.scale * getPowerMultiplier(level);
    }
    
    toJson(): PowerPointsOffsetJson {
        const output = super.toJson() as PowerPointsOffsetJson;
        output.scale = this.scale;
        return output;
    }
}

