
import { EffectContextJson, EffectJson, PointsEffectJson, SinglePointsEffectJson, SetPointsEffectJson, OffsetPointsEffectJson, BurstPointsEffectJson, TransferPointsEffectJson, LingerEffectJson, ClearStatusEffectJson, CompositeEffectJson, ChanceEffectJson, LingerStateJson } from "./interfaces.js";
import { pointsAbbreviationMap } from "./constants.js";
import { Entity } from "./entity.js";
import { Points, PointsBurst, fuzzyRound } from "./points.js";
import { PointsOffset } from "./pointsOffset.js";
import { Battle } from "./battle.js";

export class EffectContext {
    performer: Entity;
    opponent: Entity;
    battle: Battle;
    damage: number;
    messages: string[];
    
    constructor(performer: Entity) {
        this.performer = performer;
        this.opponent = this.performer.getOpponent();
        this.battle = this.performer.battle;
        // We copy this damage value so it can persist within LingerState.
        this.damage = this.performer.points.damage.getEffectiveValue();
        this.messages = [];
    }
    
    getEntities(): Entity[] {
        return [this.performer, this.opponent];
    }
    
    getEntity(isOpponent: boolean): Entity {
        return isOpponent ? this.opponent : this.performer;
    }
    
    addMessage(message: string): void {
        if (this.messages !== null) {
            this.messages.push(message);
        }
    }
    
    addPointsOffsetMessage(
        entity: Entity,
        valueDelta: number,
        pointsName: string,
    ): void {
        if (valueDelta === 0) {
            return;
        }
        const verb = (valueDelta > 0) ? "gained" : "lost";
        const abbreviation = pointsAbbreviationMap[pointsName];
        this.addMessage(`${entity.getName()} ${verb} ${Math.abs(valueDelta)} ${abbreviation}!`);
    }
    
    disableMessageAggregation(): void {
        this.messages = null;
    }
    
    toJson(): EffectContextJson {
        return {
            performerId: this.performer.id,
            damage: this.damage,
        };
    }
}

export abstract class Effect {
    
    abstract equals(effect: Effect): boolean;
    
    abstract getName(): string;
    
    abstract apply(context: EffectContext): void;
    
    iterateOverEffects(handle: (effect: Effect) => void): void {
        handle(this);
    }
    
    affectsPoints(name: string): boolean {
        return false;
    }
    
    hasRecipient(context: EffectContext, recipient: Entity): boolean {
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
    
    getPointsAbbreviation(): string {
        return pointsAbbreviationMap[this.pointsName];
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
    
    getRecipient(context: EffectContext): Entity {
        return context.getEntity(this.applyToOpponent);
    }
    
    hasRecipient(context: EffectContext, recipient: Entity): boolean {
        return (this.getRecipient(context) === recipient);
    }
    
    abstract applyToPoints(context: EffectContext, points: Points): void;
    
    apply(context: EffectContext): void {
        const entity = this.getRecipient(context);
        const points = entity.points[this.pointsName];
        this.applyToPoints(context, points);
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
    
    applyToPoints(context: EffectContext, points: Points): void {
        points.setValue(this.value);
        context.addMessage(`Set ${this.getPointsAbbreviation()} of ${this.getRecipient(context).getName()} to ${this.value}!`);
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
    
    applyToPoints(context: EffectContext, points: Points): void {
        const entity = this.getRecipient(context);
        const valueDelta = this.offset.apply(context, points);
        context.addPointsOffsetMessage(entity, valueDelta, this.pointsName);
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
    
    applyToPoints(context: EffectContext, points: Points): void {
        const absoluteOffset = this.offset.getAbsoluteOffset(context, points);
        // Burst turn count is decremented at the end of the performer's
        // turn. As a result, the performer will be affected by the burst
        // for one fewer turn than desired. We add an extra turn to
        // compensate for this.
        const extraTurnAmount = this.applyToOpponent ? 0 : 1;
        points.addBurst(new PointsBurst(absoluteOffset, this.turnAmount, extraTurnAmount));
        context.addMessage(`${context.performer.getName()} applied status effect!`);
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
    
    hasRecipient(context: EffectContext, recipient: Entity): boolean {
        return (this.opponentIsSource === (context.performer !== recipient));
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
    
    apply(context: EffectContext): void {
        let sourceEntity: Entity;
        let destinationEntity: Entity;
        if (this.opponentIsSource) {
            sourceEntity = context.opponent;
            destinationEntity = context.performer;
        } else {
            sourceEntity = context.performer;
            destinationEntity = context.opponent;
        }
        const sourcePoints = sourceEntity.points[this.pointsName];
        const destinationPoints = destinationEntity.points[this.pointsName];
        const valueDelta1 = this.offset.apply(context, sourcePoints);
        const valueDelta2 = destinationPoints.offsetValue(
            -fuzzyRound(valueDelta1 * this.efficiency),
        );
        context.addPointsOffsetMessage(sourceEntity, valueDelta1, this.pointsName);
        context.addPointsOffsetMessage(destinationEntity, valueDelta2, this.pointsName);
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
    
    apply(context: EffectContext): void {
        const performerPoints = context.performer.points[this.pointsName];
        const opponentPoints = context.opponent.points[this.pointsName];
        const performerPointsValue = performerPoints.getValue();
        const opponentPointsValue = opponentPoints.getValue();
        performerPoints.setValue(opponentPointsValue);
        opponentPoints.setValue(performerPointsValue);
        context.addMessage(`Swapped ${this.getPointsAbbreviation()} of ${context.performer.getName()} and ${context.opponent.getName()}!`);
    }
    
    equals(effect: Effect): boolean {
        return (super.equals(effect) && effect instanceof SwapPointsEffect);
    }
    
    getName() {
        return "swapPoints";
    }
}

export abstract class ParentEffect extends Effect {
    
    abstract getChildEffects(): Effect[];
    
    iterateOverEffects(handle: (effect: Effect) => void): void {
        super.iterateOverEffects(handle);
        this.getChildEffects().forEach((effect) => {
            effect.iterateOverEffects(handle);
        });
    }
    
    affectsPoints(name: string): boolean {
        return this.getChildEffects().some((effect) => effect.affectsPoints(name));
    }
    
    hasRecipient(context: EffectContext, recipient: Entity): boolean {
        return this.getChildEffects().some((effect) => (
            effect.hasRecipient(context, recipient)
        ));
    }
    
    hasDirection(direction: number): boolean {
        return this.getChildEffects().some((effect) => effect.hasDirection(direction));
    }
}

export class LingerEffect extends ParentEffect {
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
    
    getChildEffects(): Effect[] {
        return [this.effect];
    }
    
    apply(context: EffectContext): void {
        const state = new LingerState(context, this.effect, this.turnAmount);
        context.battle.addLingerState(state);
        context.addMessage(`${context.performer.getName()} applied status effect!`);
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
    
    hasRecipient(context: EffectContext, recipient: Entity): boolean {
        return (this.applyToOpponent === (context.performer !== recipient));
    }
    
    apply(context: EffectContext): void {
        let hasClearedStatus = false;
        const recipientEntity = context.getEntity(this.applyToOpponent);
        hasClearedStatus ||= context.battle.clearLingerStates(
            this.pointsName,
            recipientEntity,
            this.direction,
        );
        let pointsNames;
        if (this.pointsName === null) {
            pointsNames = Object.keys(recipientEntity.points);
        } else {
            pointsNames = [this.pointsName];
        }
        pointsNames.forEach((name) => {
            hasClearedStatus ||= recipientEntity.points[name].clearBursts(this.direction);
        });
        if (hasClearedStatus) {
            context.addMessage(`${context.performer.getName()} cleared status effect!`);
        }
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

export class CompositeEffect extends ParentEffect {
    effects: Effect[];
    
    constructor(effects: Effect[]) {
        super();
        this.effects = effects;
    }
    
    equals(effect: Effect): boolean {
        if (!(effect instanceof CompositeEffect)
                || this.effects.length !== effect.effects.length) {
            return false;
        }
        const effects = effect.effects.slice();
        for (const effect of this.effects) {
            const index = effects.findIndex((inputEffect) => inputEffect.equals(effect));
            if (index < 0) {
                return false;
            }
            effects.splice(index, 1);
        }
        return true;
    }
    
    getChildEffects(): Effect[] {
        return this.effects;
    }
    
    apply(context: EffectContext): void {
        this.effects.forEach((effect) => {
            effect.apply(context);
        });
    }
    
    getName() {
        return "composite";
    }
    
    toJson(): CompositeEffectJson {
        const output = super.toJson() as CompositeEffectJson;
        output.effects = this.effects.map((effect) => effect.toJson());
        return output;
    }
}

export class ChanceEffect extends ParentEffect {
    probability: number;
    effect: Effect;
    alternativeEffect: Effect;
    
    constructor(probability: number, effect: Effect, alternativeEffect: Effect = null) {
        super();
        this.probability = probability;
        this.effect = effect;
        this.alternativeEffect = alternativeEffect;
    }
    
    equals(effect: Effect): boolean {
        if (!(effect instanceof ChanceEffect) || this.probability !== effect.probability
                || this.effect.equals(effect.effect)) {
            return false;
        }
        const { alternativeEffect } = effect;
        if (this.alternativeEffect === null) {
            return (alternativeEffect === null);
        } else {
            return ((alternativeEffect !== null)
                && this.alternativeEffect.equals(alternativeEffect));
        }
    }
    
    getChildEffects(): Effect[] {
        const output = [this.effect];
        if (this.alternativeEffect !== null) {
            output.push(this.alternativeEffect);
        }
        return output;
    }
    
    apply(context: EffectContext): void {
        if (Math.random() < this.probability) {
            this.effect.apply(context);
        } else if (this.alternativeEffect !== null) {
            this.alternativeEffect.apply(context);
        }
    }
    
    getName() {
        return "chance";
    }
    
    toJson(): ChanceEffectJson {
        const output = super.toJson() as ChanceEffectJson;
        output.probability = this.probability;
        output.effect = this.effect.toJson();
        let tempData: EffectJson;
        if (this.alternativeEffect === null) {
            tempData = null;
        } else {
            tempData = this.alternativeEffect.toJson();
        }
        output.alternativeEffect = tempData;
        return output;
    }
}

export class MercyEffect extends Effect {
    
    equals(effect: Effect): boolean {
        return (effect instanceof MercyEffect);
    }
    
    apply(context: EffectContext): void {
        context.performer.isOfferingMercy = true;
        if (context.opponent.isOfferingMercy) {
            context.addMessage("Both sides have agreed upon mercy!");
        } else {
            context.addMessage(`Will ${context.opponent.getName()} also offer mercy?`);
        }
    }
    
    getName() {
        return "mercy";
    }
}

export class LingerState {
    context: EffectContext;
    effect: Effect;
    turnCount: number;
    
    constructor(context: EffectContext, effect: Effect, turnCount: number) {
        this.context = context;
        this.effect = effect;
        this.turnCount = turnCount;
    }
    
    toJson(): LingerStateJson {
        return {
            context: this.context.toJson(),
            effect: this.effect.toJson(),
            turnCount: this.turnCount,
        };
    }
}


