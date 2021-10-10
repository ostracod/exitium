
import { EffectJson, PointsEffectJson, SinglePointsEffectJson, SetPointsEffectJson, OffsetPointsEffectJson, BurstPointsEffectJson, TransferPointsEffectJson, LingerEffectJson, LingerStateJson } from "./interfaces.js";
import { Entity } from "./entity.js";
import { Points, PointsBurst, fuzzyRound } from "./points.js";
import { PointsOffset } from "./pointsOffset.js";

export abstract class Effect {
    
    abstract equals(effect: Effect): boolean;
    
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
    
    equals(effect: Effect): boolean {
        return (effect instanceof PointsEffect && this.pointsName === effect.pointsName);
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
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof SinglePointsEffect
            && this.applyToOpponent === effect.applyToOpponent);
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
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof SetPointsEffect
            && this.value === effect.value);
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
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof OffsetPointsEffect
            && this.offset.equals(effect.offset));
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

export class BurstPointsEffect extends OffsetPointsEffect {
    turnAmount: number;
    
    constructor(
        pointsName: string,
        applyToOpponent: boolean,
        offset: PointsOffset,
        turnAmount: number,
    ) {
        super(pointsName, applyToOpponent, offset);
        this.turnAmount = turnAmount;
    }
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof BurstPointsEffect
            && this.turnAmount === effect.turnAmount);
    }
    
    applyToPoints(level: number, points: Points): void {
        const absoluteOffset = this.offset.getAbsoluteOffset(level, points);
        points.addBurst(new PointsBurst(absoluteOffset, this.turnAmount));
    }
    
    getName() {
        return "burstPoints";
    }
    
    toJson(): BurstPointsEffectJson {
        const output = super.toJson() as BurstPointsEffectJson;
        output.turnAmount = this.turnAmount;
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
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof TransferPointsEffect
            && this.opponentIsSource === effect.opponentIsSource
            && this.efficiency === effect.efficiency
            && this.offset.equals(effect.offset));
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
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof SwapPointsEffect);
    }
    
    getName() {
        return "swapPoints";
    }
}

export class LingerEffect extends Effect {
    turnAmount: number;
    effect: Effect;
    
    constructor(turnAmount: number, effect: Effect) {
        super();
        this.turnAmount = turnAmount;
        this.effect = effect;
    }
    
    equals(effect: Effect): boolean {
        return (effect instanceof LingerEffect && this.turnAmount === effect.turnAmount
            && this.effect.equals(effect.effect));
    }
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const state = new LingerState(this.effect, this.turnAmount);
        localEntity.addLingerState(state);
    }
    
    getName() {
        return "linger";
    }
    
    toJson(): LingerEffectJson {
        const output = super.toJson() as LingerEffectJson;
        output.turnAmount = this.turnAmount;
        output.effect = this.effect.toJson();
        return output;
    }
}

export class LingerState {
    effect: Effect;
    turnCount: number;
    
    constructor(effect: Effect, turnCount: number) {
        this.effect = effect;
        this.turnCount = turnCount;
    }
    
    toJson(): LingerStateJson {
        return {
            effect: this.effect.toJson(),
            turnCount: this.turnCount,
        };
    }
}


