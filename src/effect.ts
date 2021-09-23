
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
    applyToOpponent: boolean;
    
    constructor(pointsName: string, applyToOpponent: boolean) {
        super();
        this.pointsName = pointsName;
        this.applyToOpponent = applyToOpponent;
    }
    
    abstract applyToPoints(points: Points): void;
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const entity = this.applyToOpponent ? opponentEntity : localEntity;
        const points = entity.points[this.pointsName];
        this.applyToPoints(points);
    }
    
    toJson(): PointsEffectJson {
        const output = super.toJson() as PointsEffectJson;
        output.pointsName = this.pointsName;
        output.applyToOpponent = this.applyToOpponent;
        return output;
    }
}

export class OffsetPointsEffect extends PointsEffect {
    offset: number;
    
    constructor(pointsName: string, applyToOpponent: boolean, offset: number) {
        super(pointsName, applyToOpponent);
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


