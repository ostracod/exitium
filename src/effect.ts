
import { EffectJson, PointsEffectJson, SinglePointsEffectJson, SetPointsEffectJson, OffsetPointsEffectJson, TransferPointsEffectJson } from "./interfaces.js";
import { Entity } from "./entity.js";
import { Points, fuzzyRound } from "./points.js";
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

export class TransferPointsEffect extends PointsEffect {
    opponentIsSource: boolean;
    efficiency: number;
    offset: PointsOffset;
    
    constructor(
        pointsName: string,
        opponentIsSource: boolean,
        efficiency: number,
        offset: PointsOffset
    ) {
        super(pointsName);
        this.opponentIsSource = opponentIsSource;
        this.efficiency = efficiency;
        this.offset = offset;
    }
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        let sourceEntity: Entity;
        let destinationEntity: Entity;
        if (this.opponentIsSource) {
            sourceEntity = opponentEntity;
            destinationEntity = localEntity;
        } else {
            sourceEntity = localEntity;
            destinationEntity = opponentEntity;
        }
        const sourcePoints = sourceEntity.points[this.pointsName];
        const destinationPoints = destinationEntity.points[this.pointsName];
        const amount = this.offset.apply(localEntity.getLevel(), sourcePoints);
        destinationPoints.offsetValue(-fuzzyRound(amount * this.efficiency));
    }
    
    getName() {
        return "transferPoints";
    }
    
    toJson(): TransferPointsEffectJson {
        const output = super.toJson() as TransferPointsEffectJson;
        output.opponentIsSource = this.opponentIsSource;
        output.efficiency = this.efficiency;
        output.offset = this.offset.toJson();
        return output;
    }
}

export class SwapPointsEffect extends PointsEffect {
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const localPoints = localEntity.points[this.pointsName];
        const opponentPoints = opponentEntity.points[this.pointsName];
        const localPointsValue = localPoints.getValue();
        const opponentPointsValue = opponentPoints.getValue();
        localPoints.setValue(opponentPointsValue);
        opponentPoints.setValue(localPointsValue);
    }
    
    getName() {
        return "swapPoints";
    }
}


