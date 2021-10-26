
class PointsOffset {
    // Concrete subclasses of PointsOffset must implement these methods:
    // isPositive, getPointsAmountHelper
    
    constructor(data) {
        // Do nothing.
    }
    
    getVerb() {
        return this.isPositive() ? "increase" : "decrease";
    }
    
    getPointsAmount(context, points) {
        let output = this.getPointsAmountHelper(context, points);
        if (output === null) {
            return null;
        }
        if (points !== null && points.name === "health" && !this.isPositive()) {
            output *= getDamageMultiplier(context.damage);
        }
        return Math.round(output);
    }
    
    toString(context, points) {
        const pointsAmount = this.getPointsAmount(context, points);
        if (pointsAmount === null) {
            return null
        } else {
            return getNumberExpression(pointsAmount, "point");
        }
    }
    
    toShortString(context, points) {
        const pointsAmount = this.getPointsAmount(context, points);
        return (pointsAmount === null) ? null : pointsAmount;
    }
}

class RatioPointsOffset extends PointsOffset {
    
    constructor(data) {
        super(data);
        this.ratio = data.ratio;
    }
    
    isPositive() {
        return (this.ratio > 0);
    }
    
    getPointsAmountHelper(context, points) {
        if (points === null) {
            return null;
        }
        return Math.abs(this.ratio) * points.maximumValue;
    }
    
    toPercentageString() {
        return Math.round(Math.abs(this.ratio) * 100) + "%";
    }
    
    toString(context, points) {
        const text = super.toString(context, points);
        return (text === null) ? this.toPercentageString() : text;
    }
    
    toShortString(context, points) {
        const text = super.toShortString(context, points);
        return (text === null) ? this.toPercentageString() : text;
    }
}

class AbsolutePointsOffset extends PointsOffset {
    
    constructor(data) {
        super(data);
        this.value = data.value;
    }
    
    isPositive() {
        return (this.value > 0);
    }
    
    getPointsAmountHelper(context, points) {
        return Math.abs(this.value);
    }
}

class ScalePointsOffset extends PointsOffset {
    // Concrete subclasses of ScalePointsOffset must implement these methods:
    // getMultiplier
    
    constructor(data) {
        super(data);
        this.scale = data.scale;
    }
    
    isPositive() {
        return (this.scale > 0);
    }
    
    getPointsAmountHelper(context, points) {
        const { level } = context.performer;
        return Math.abs(this.scale) * this.getMultiplier(level);
    }
}

class PowerPointsOffset extends ScalePointsOffset {
    
    getMultiplier(level) {
        return getPowerMultiplier(level);
    }
}

class ExperiencePointsOffset extends ScalePointsOffset {
    
    getMultiplier(level) {
        return getExperienceMultiplier(level);
    }
}

const pointsOffsetConstructorMap = {
    absolute: AbsolutePointsOffset,
    ratio: RatioPointsOffset,
    power: PowerPointsOffset,
    experience: ExperiencePointsOffset,
};

const createPointsOffsetFromJson = (data) => {
    const pointsOffsetConstructor = pointsOffsetConstructorMap[data.name];
    return new pointsOffsetConstructor(data);
};

class EffectContext {
    
    constructor(performer, opponent, damage = null) {
        this.performer = performer;
        this.opponent = opponent;
        if (damage === null) {
            const damagePoints = this.performer.points.damage;
            if (typeof damagePoints !== "undefined") {
                this.damage = damagePoints.value;
            } else {
                this.damage = pointConstants.startDamage;
            }
        } else {
            this.damage = damage;
        }
    }
    
    getPoints(applyToOpponent, pointsName) {
        const entity = applyToOpponent ? this.opponent : this.performer;
        if (entity === null) {
            return null;
        }
        const points = entity.points[pointsName];
        return (typeof points === "undefined") ? null : points;
    };
}

// Note that this only works after world entities
// have been populated from JSON.
const createEffectContextFromJson = (data) => {
    const performer = getEntityById(data.performerId);
    return new EffectContext(performer, performer.getOpponent(), data.damage);
}

const getEffectReceiverName = (applyToOpponent) => (
    applyToOpponent ? "opponent" : "self"
);

class Effect {
    // Concrete subclasses of Effect must implement these methods:
    // getDescription, getShortDescription
    
    constructor(data) {
        // Do nothing.
    }
}

class PointsEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.pointsName = data.pointsName;
    }
    
    getPointsAbbreviation() {
        return pointsAbbreviationMap[this.pointsName];
    }
}

class SinglePointsEffect extends PointsEffect {
    // Concrete subclasses of SinglePointsEffect must implement these methods:
    // getShortDescriptionHelper
    
    constructor(data) {
        super(data);
        this.applyToOpponent = data.applyToOpponent;
    }
    
    getReceiverName() {
        return getEffectReceiverName(this.applyToOpponent);
    }
    
    getPoints(context) {
        return context.getPoints(this.applyToOpponent, this.pointsName);
    }
    
    getShortDescription(context, recipient) {
        if (this.applyToOpponent === (context.performer !== recipient)) {
            return this.getShortDescriptionHelper(context);
        } else {
            return [];
        }
    }
}

class SetPointsEffect extends SinglePointsEffect {
    
    constructor(data) {
        super(data);
        this.value = data.value;
    }
    
    getDescription(context) {
        const receiverName = this.getReceiverName();
        const numberExpression = getNumberExpression(Math.abs(this.value), "point");
        return [`Set ${this.getPointsAbbreviation()} of ${receiverName} to ${numberExpression}.`];
    }
    
    getShortDescriptionHelper(context) {
        return [`Set ${this.getPointsAbbreviation()} to ${this.value}`];
    }
}

class OffsetPointsEffect extends SinglePointsEffect {
    
    constructor(data) {
        super(data);
        this.offset = createPointsOffsetFromJson(data.offset);
    }
    
    getOffsetString(context) {
        const points = this.getPoints(context);
        return this.offset.toString(context, points);
    }
    
    getOffsetShortString(context) {
        const points = this.getPoints(context);
        return this.offset.toShortString(context, points);
    }
    
    getDescription(context) {
        const verb = capitalize(this.offset.getVerb());
        const receiverName = this.getReceiverName();
        const offsetText = this.getOffsetString(context);
        return [`${verb} ${this.getPointsAbbreviation()} of ${receiverName} by ${offsetText}.`];
    }
    
    getShortDescriptionHelper(context) {
        const verb = (this.offset.isPositive()) ? "Regen" : "Deplete";
        const offsetText = this.getOffsetShortString(context);
        return [`${verb} ${offsetText} ${this.getPointsAbbreviation()}`];
    }
}

class BurstPointsEffect extends OffsetPointsEffect {
    
    constructor(data) {
        super(data);
        this.turnAmount = data.turnAmount;
    }
    
    getVerb() {
        return this.offset.isPositive() ? "Raise" : "Lower";
    }
    
    getDescription(context) {
        const receiverName = this.getReceiverName();
        const offsetText = this.getOffsetString(context);
        const turnExpression = getNumberExpression(this.turnAmount, "turn");
        return [`${this.getVerb()} ${this.getPointsAbbreviation()} of ${receiverName} by ${offsetText} for ${turnExpression}.`];
    }
    
    getShortDescriptionHelper(context) {
        const offsetText = this.getOffsetShortString(context);
        return [`${this.getVerb()} ${this.getPointsAbbreviation()} by ${offsetText}`];
    }
}

class TransferPointsEffect extends PointsEffect {
    
    constructor(data) {
        super(data);
        this.opponentIsSource = data.opponentIsSource;
        this.efficiency = data.efficiency;
        this.offset = createPointsOffsetFromJson(data.offset);
    }
    
    getPoints(context) {
        return context.getPoints(this.opponentIsSource, this.pointsName);
    }
    
    getDescription(context) {
        const verb = capitalize(this.offset.getVerb());
        const points = this.getPoints(context);
        const offsetText = this.offset.toString(context, points);
        let senderName;
        let receiverName;
        if (this.opponentIsSource === !this.offset.isPositive()) {
            senderName = "opponent";
            receiverName = "self";
        } else {
            senderName = "self";
            receiverName = "opponent";
        }
        const efficiencyText = Math.round(this.efficiency * 100) + "%";
        let transferPhrase;
        if (this.offset.isPositive()) {
            transferPhrase = `remove ${efficiencyText} from`;
        } else {
            transferPhrase = `give ${efficiencyText} to`;
        }
        return [`${verb} ${this.getPointsAbbreviation()} of ${senderName} by ${offsetText}, and ${transferPhrase} ${receiverName}.`];
    }
    
    getShortDescriptionHelper(context) {
        const verb = (this.offset.isPositive()) ? "Absorb" : "Drain";
        const points = this.getPoints(context);
        const offsetText = this.offset.toShortString(context, points);
        return [`${verb} ${offsetText} ${this.getPointsAbbreviation()}`];
    }
}

class SwapPointsEffect extends PointsEffect {
    
    getDescription(context) {
        return [`Swap ${this.getPointsAbbreviation()} of self and opponent.`];
    }
    
    getShortDescription(context, recipient) {
        if (context.performer === recipient) {
            return [`Swap ${this.getPointsAbbreviation()}`];
        } else {
            return [];
        }
    }
}

class LingerEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.turnAmount = data.turnAmount;
        this.effect = createEffectFromJson(data.effect);
    }
    
    getDescription(context) {
        const turnExpression = getNumberExpression(this.turnAmount, "turn");
        return [`For the next ${turnExpression}:`, this.effect.getDescription(context)];
    }
    
    getShortDescription(context, recipient) {
        if (context.performer === recipient) {
            return ["Apply status effect"];
        } else {
            return [];
        }
    }
}

class ClearStatusEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.pointsName = data.pointsName;
        this.applyToOpponent = data.applyToOpponent;
        this.direction = data.direction;
    }
    
    getDescription(context) {
        const modifiers = [];
        if (this.direction !== null) {
            modifiers.push((this.direction > 0) ? "positive" : "negative");
        }
        if (this.pointsName !== null) {
            modifiers.push(pointsAbbreviationMap[this.pointsName]);
        }
        if (modifiers.length <= 0) {
            modifiers.push("all");
        }
        const receiverName = getEffectReceiverName(this.applyToOpponent);
        return [`Clear ${modifiers.join(" ")} status effects of ${receiverName}.`];
        
    }
    
    getShortDescription(context, recipient) {
        if (this.applyToOpponent === (context.performer !== recipient)) {
            return ["Clear status effect"];
        } else {
            return [];
        }
    }
}

class CompositeEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.effects = data.effects.map(createEffectFromJson);
    }
    
    getDescription(context) {
        const output = [];
        this.effects.forEach((effect) => {
            const description = effect.getDescription(context);
            extendList(output, description);
        });
        return output;
    }
    
    getShortDescription(context, recipient) {
        const output = [];
        this.effects.forEach((effect) => {
            const description = effect.getShortDescription(context, recipient);
            extendList(output, description);
        });
        return output;
    }
}

class ChanceEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.probability = data.probability;
        this.effect = createEffectFromJson(data.effect);
        this.alternativeEffect = createEffectFromJson(data.alternativeEffect);
    }
    
    getDescription(context) {
        const output = [
            `${Math.round(this.probability * 100)}% chance of the following:`,
            this.effect.getDescription(context),
        ];
        if (this.alternativeEffect !== null) {
            output.push("Otherwise, this will happen:");
            output.push(this.alternativeEffect.getDescription(context));
        }
        return output;
    }
    
    getShortDescription(context, recipient) {
        const output = [];
        const effects = [this.effects];
        if (this.alternativeEffect !== null) {
            effects.push(this.alternativeEffect);
        }
        effects.forEach((effect) => {
            const description = effect.getShortDescription(context, recipient);
            description.forEach((text) => {
                if (!text.endsWith("?")) {
                    text += "?";
                }
                output.push(text);
            });
        });
        return output;
    }
}

class MercyEffect extends Effect {
    
    getDescription(context) {
        return ["If your opponent also offers mercy, the battle will end in peace."];
    }
    
    getShortDescription(context, recipient) {
        if (context.performer === recipient) {
            return ["Offer mercy"];
        } else {
            return [];
        }
    }
}

const effectConstructorMap = {
    setPoints: SetPointsEffect,
    offsetPoints: OffsetPointsEffect,
    burstPoints: BurstPointsEffect,
    transferPoints: TransferPointsEffect,
    swapPoints: SwapPointsEffect,
    linger: LingerEffect,
    clearStatus: ClearStatusEffect,
    composite: CompositeEffect,
    chance: ChanceEffect,
    mercy: MercyEffect,
};

const createEffectFromJson = (data) => {
    if (data === null) {
        return null;
    }
    const effectConstructor = effectConstructorMap[data.name];
    return new effectConstructor(data);
};

class LingerState {
    
    constructor(data, parentEntity) {
        this.parentEntity = parentEntity;
        this.effect = createEffectFromJson(data.effect);
        this.turnCount = data.turnCount;
        this.contextData = data.context;
        this.context = null;
    }
    
    getEffectContext() {
        if (this.context === null) {
            this.context = createEffectContextFromJson(this.contextData);
        }
        return this.context;
    }
    
    getShortDescription(recipient) {
        const context = this.getEffectContext();
        return this.effect.getShortDescription(context, recipient);
    }
}


