
class PointsOffset {
    // Concrete subclasses of PointsOffset must implement these methods:
    // isPositive, toString, toShortString
    
    constructor(data) {
        // Do nothing.
    }
    
    getVerb() {
        return this.isPositive() ? "increase" : "decrease";
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
    
    toString(context) {
        return Math.round(Math.abs(this.ratio) * 100) + "%";
    }
    
    toShortString(context) {
        return this.toString(context);
    }
}

class ExplicitPointsOffset extends PointsOffset {
    // Concrete subclasses of ExplicitPointsOffset must implement these methods:
    // getPointsAmount
    
    toString(context) {
        return getNumberExpression(this.getPointsAmount(context), "point");
    }
    
    toShortString(context) {
        return this.getPointsAmount(context).toString();
    }
}

class AbsolutePointsOffset extends ExplicitPointsOffset {
    
    constructor(data) {
        super(data);
        this.value = data.value;
    }
    
    isPositive() {
        return (this.value > 0);
    }
    
    getPointsAmount(context) {
        return Math.abs(this.value);
    }
}

class PowerPointsOffset extends ExplicitPointsOffset {
    
    constructor(data) {
        super(data);
        this.scale = data.scale;
    }
    
    isPositive() {
        return (this.scale > 0);
    }
    
    getPointsAmount(context) {
        const { level } = context.performer;
        return Math.round(Math.abs(this.scale) * getPowerMultiplier(level));
    }
}

const pointsOffsetConstructorMap = {
    absolute: AbsolutePointsOffset,
    ratio: RatioPointsOffset,
    power: PowerPointsOffset,
};

const createPointsOffsetFromJson = (data) => {
    const pointsOffsetConstructor = pointsOffsetConstructorMap[data.name];
    return new pointsOffsetConstructor(data);
};

const getEffectReceiverName = (applyToOpponent) => (
    applyToOpponent ? "opponent" : "self"
);

class EffectContext {
    
    constructor(performer, opponent) {
        this.performer = performer;
        this.opponent = opponent;
    }
}

// Note that this only works after world entities
// have been populated from JSON.
const createEffectContextFromJson = (data) => {
    const performer = getEntityById(data.performerId);
    return new EffectContext(performer, performer.getOpponent());
}

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
        return [`Set ${this.pointsName} of ${receiverName} to ${numberExpression}.`];
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
    
    getDescription(context) {
        const verb = capitalize(this.offset.getVerb());
        const receiverName = this.getReceiverName();
        const offsetText = this.offset.toString(context);
        return [`${verb} ${this.pointsName} of ${receiverName} by ${offsetText}.`];
    }
    
    getShortDescriptionHelper(context) {
        const verb = (this.offset.isPositive()) ? "Regen" : "Deplete";
        const offsetText = this.offset.toShortString(context);
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
        const offsetText = this.offset.toString(context);
        const turnExpression = getNumberExpression(this.turnAmount, "turn");
        return [`${this.getVerb()} ${this.pointsName} of ${receiverName} by ${offsetText} for ${turnExpression}.`];
    }
    
    getShortDescriptionHelper(context) {
        const offsetText = this.offset.toShortString(context);
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
    
    getDescription(context) {
        const verb = capitalize(this.offset.getVerb());
        const offsetText = this.offset.toString(context);
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
        return [`${verb} ${this.pointsName} of ${senderName} by ${offsetText}, and ${transferPhrase} ${receiverName}.`];
    }
    
    getShortDescriptionHelper(context) {
        const verb = (this.offset.isPositive()) ? "Absorb" : "Drain";
        const offsetText = this.offset.toShortString(context);
        return [`${verb} ${offsetText} ${this.getPointsAbbreviation()}`];
    }
}

class SwapPointsEffect extends PointsEffect {
    
    getDescription(context) {
        return [`Swap ${this.pointsName} of self and opponent.`];
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
            modifiers.push(this.pointsName);
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

const effectConstructorMap = {
    setPoints: SetPointsEffect,
    offsetPoints: OffsetPointsEffect,
    burstPoints: BurstPointsEffect,
    transferPoints: TransferPointsEffect,
    swapPoints: SwapPointsEffect,
    linger: LingerEffect,
    clearStatus: ClearStatusEffect,
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


