
import { EffectJson, PointsEffectJson, SinglePointsEffectJson, SetPointsEffectJson, OffsetPointsEffectJson, BurstPointsEffectJson, TransferPointsEffectJson, LingerEffectJson, ClearStatusEffectJson, LingerStateJson } from "./interfaces.js";
import { Entity } from "./entity.js";
import { Points, PointsBurst, fuzzyRound } from "./points.js";
import { PointsOffset } from "./pointsOffset.js";

export abstract class Effect {
    
    abstract equals(effect: Effect): boolean;
    
    abstract getName(): string;
    
    abstract apply(localEntity: Entity, opponentEntity: Entity): void;
    
    affectsPoints(name: string): boolean {
        return false;
    }
    
    hasRecipient(localEntity: Entity, recipientEntity: Entity): boolean {
        return false;
    }
    
    hasDirection(direction: number): boolean {
        return false;
    }
    
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
    
    affectsPoints(name: string): boolean {
        return (name === this.pointsName);
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
    
    hasRecipient(localEntity: Entity, recipientEntity: Entity): boolean {
        return (this.applyToOpponent === (localEntity !== recipientEntity));
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
    
    hasDirection(direction: number): boolean {
        return (this.offset.isPositive() === (direction > 0));
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
    
    hasRecipient(localEntity: Entity, recipientEntity: Entity): boolean {
        return (this.opponentIsSource === (localEntity !== recipientEntity));
    }
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof TransferPointsEffect
            && this.opponentIsSource === effect.opponentIsSource
            && this.efficiency === effect.efficiency
            && this.offset.equals(effect.offset));
    }
    
    hasDirection(direction: number): boolean {
        return (this.offset.isPositive() === (direction > 0));
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
    
    affectsPoints(name: string): boolean {
        return this.effect.affectsPoints(name);
    }
    
    hasRecipient(localEntity: Entity, recipientEntity: Entity): boolean {
        return this.effect.hasRecipient(localEntity, recipientEntity);
    }
    
    hasDirection(direction: number): boolean {
        return this.effect.hasDirection(direction);
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

export class ClearStatusEffect extends Effect {
    pointsName: string;
    applyToOpponent: boolean;
    direction: number;
    
    // pointsName may be null to clear status effects for all points.
    // direction may be null to clear status effects in both directions.
    constructor(pointsName: string, applyToOpponent: boolean, direction: number) {
        super();
        this.pointsName = pointsName;
        this.applyToOpponent = applyToOpponent;
        this.direction = direction;
    }
    
    equals(effect: Effect): boolean {
        return (effect instanceof ClearStatusEffect && this.pointsName === effect.pointsName
            && this.applyToOpponent == effect.applyToOpponent
            && this.direction === effect.direction);
    }
    
    affectsPoints(name: string): boolean {
        return (this.pointsName === null || name === this.pointsName);
    }
    
    hasRecipient(localEntity: Entity, recipientEntity: Entity): boolean {
        return (this.applyToOpponent === (localEntity !== recipientEntity));
    }
    
    apply(localEntity: Entity, opponentEntity: Entity): void {
        const recipientEntity = this.applyToOpponent ? opponentEntity : localEntity;
        [localEntity, opponentEntity].forEach((entity) => {
            entity.clearLingerStates(this.pointsName, recipientEntity, this.direction);
        });
        let pointsNames;
        if (this.pointsName === null) {
            pointsNames = Object.keys(recipientEntity.points);
        } else {
            pointsNames = [this.pointsName];
        }
        pointsNames.forEach((name) => {
            recipientEntity.points[name].clearBursts(this.direction);
        });
    }
    
    getName() {
        return "clearStatus";
    }
    
    toJson(): ClearStatusEffectJson {
        const output = super.toJson() as ClearStatusEffectJson;
        output.pointsName = this.pointsName;
        output.applyToOpponent = this.applyToOpponent;
        output.direction = this.direction;
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


