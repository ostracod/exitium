
import { EffectJson, PointsEffectJson, OffsetPointsEffectJson } from "./interfaces.js";
import { Entity } from "./entity.js";
import { Points } from "./points.js";

export abstract class Effect {
    
    abstract getName(): string;
    
    abstract apply(localEntity: Entity, opponentEntity: Entity): void;
    
    toJson(): EffectJson {
        return { name: this.getName() };
    }
}

export abstract class PointsEffect extends Effect {
    pointsName: string;
    shouldApplyToOpponent: boolean;
    
    constructor(pointsName: string, shouldApplyToOpponent: boolean) {
        super();
        this.pointsName = pointsName;
        this.shouldApplyToOpponent = shouldApplyToOpponent;
    }
    
    abstract applyToPoints(points: Points): void;
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const entity = this.shouldApplyToOpponent ? opponentEntity : localEntity;
        const points = entity.points[this.pointsName];
        this.applyToPoints(points);
    }
    
    toJson(): PointsEffectJson {
        const output = super.toJson() as PointsEffectJson;
        output.pointsName = this.pointsName;
        output.shouldApplyToOpponent = this.shouldApplyToOpponent;
        return output;
    }
}

export class OffsetPointsEffect extends PointsEffect {
    offset: number;
    
    constructor(pointsName: string, shouldApplyToOpponent: boolean, offset: number) {
        super(pointsName, shouldApplyToOpponent);
        this.offset = offset;
    }
    
    applyToPoints(points: Points): void {
        const value = points.getValue();
        points.setValue(value + this.offset);
    }
    
    getName() {
        return "offsetPoints";
    }
    
    toJson(): OffsetPointsEffectJson {
        const output = super.toJson() as OffsetPointsEffectJson;
        output.offset = this.offset;
        return output;
    }
}


