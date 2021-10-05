
import { EffectJson, PointsEffectJson, SinglePointsEffectJson, SetPointsEffectJson, OffsetPointsEffectJson } from "./interfaces.js";
import { Entity } from "./entity.js";
import { Points } from "./points.js";
import { PointsOffset } from "./pointsOffset.js";

export abstract class Effect {
    
    abstract getName(): string;
    
    abstract apply(localEntity: Entity, opponentEntity: Entity): void;
    
    toJson(): EffectJson {
        return { name: this.getName() };
    }
}

export abstract class PointsEffect extends Effect {
    pointsName: string;
    
    constructor(pointsName: string) {
        super();
        this.pointsName = pointsName;
    }
    
    toJson(): PointsEffectJson {
        const output = super.toJson() as PointsEffectJson;
        output.pointsName = this.pointsName;
        return output;
    }
}

export abstract class SinglePointsEffect extends PointsEffect {
    applyToOpponent: boolean;
    
    constructor(pointsName: string, applyToOpponent: boolean) {
        super(pointsName);
        this.applyToOpponent = applyToOpponent;
    }
    
    abstract applyToPoints(level: number, points: Points): void;
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const entity = this.applyToOpponent ? opponentEntity : localEntity;
        const points = entity.points[this.pointsName];
        this.applyToPoints(localEntity.getLevel(), points);
    }
    
    toJson(): SinglePointsEffectJson {
        const output = super.toJson() as SinglePointsEffectJson;
        output.applyToOpponent = this.applyToOpponent;
        return output;
    }
}

export class SetPointsEffect extends SinglePointsEffect {
    value: number;
    
    constructor(pointsName: string, applyToOpponent: boolean, value: number) {
        super(pointsName, applyToOpponent);
        this.value = value;
    }
    
    applyToPoints(level: number, points: Points): void {
        points.setValue(this.value);
    }
    
    getName() {
        return "setPoints";
    }
    
    toJson(): SetPointsEffectJson {
        const output = super.toJson() as SetPointsEffectJson;
        output.value = this.value;
        return output;
    }
}

export class OffsetPointsEffect extends SinglePointsEffect {
    offset: PointsOffset;
    
    constructor(pointsName: string, applyToOpponent: boolean, offset: PointsOffset) {
        super(pointsName, applyToOpponent);
        this.offset = offset;
    }
    
    applyToPoints(level: number, points: Points): void {
        this.offset.apply(level, points);
    }
    
    getName() {
        return "offsetPoints";
    }
    
    toJson(): OffsetPointsEffectJson {
        const output = super.toJson() as OffsetPointsEffectJson;
        output.offset = this.offset.toJson();
        return output;
    }
}


