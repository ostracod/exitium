
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
    
    toString(level) {
        return Math.round(Math.abs(this.ratio) * 100) + "%";
    }
    
    toShortString(level) {
        return this.toString();
    }
}

class ExplicitPointsOffset extends PointsOffset {
    // Concrete subclasses of ExplicitPointsOffset must implement these methods:
    // getPointsAmount
    
    toString(level) {
        return getNumberExpression(this.getPointsAmount(level), "point");
    }
    
    toShortString(level) {
        return this.getPointsAmount(level).toString();
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
    
    getPointsAmount(level) {
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
    
    getPointsAmount(level) {
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
        return this.applyToOpponent ? "opponent" : "self";
    }
    
    getShortDescription(localEntity, referenceEntity) {
        if (this.applyToOpponent ^ (localEntity === referenceEntity)) {
            return this.getShortDescriptionHelper(localEntity.level);
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
    
    getDescription() {
        const receiverName = this.getReceiverName();
        const numberExpression = getNumberExpression(Math.abs(this.value), "point");
        return [`Set ${this.pointsName} of ${receiverName} to ${numberExpression}.`];
    }
    
    getShortDescriptionHelper(level) {
        return [`Set ${this.getPointsAbbreviation()} to ${this.value}`];
    }
}

class OffsetPointsEffect extends SinglePointsEffect {
    
    constructor(data) {
        super(data);
        this.offset = createPointsOffsetFromJson(data.offset);
    }
    
    getDescription() {
        const verb = capitalize(this.offset.getVerb());
        const receiverName = this.getReceiverName();
        const offsetText = this.offset.toString(localPlayerEntity.level);
        return [`${verb} ${this.pointsName} of ${receiverName} by ${offsetText}.`];
    }
    
    getShortDescriptionHelper(level) {
        const verb = (this.offset.isPositive()) ? "Regen" : "Deplete";
        const offsetText = this.offset.toShortString(level);
        return [`${verb} ${offsetText} ${this.getPointsAbbreviation()}`];
    }
}

class TransferPointsEffect extends PointsEffect {
    
    constructor(data) {
        super(data);
        this.opponentIsSource = data.opponentIsSource;
        this.efficiency = data.efficiency;
        this.offset = createPointsOffsetFromJson(data.offset);
    }
    
    getDescription() {
        const verb = capitalize(this.offset.getVerb());
        const offsetText = this.offset.toString(localPlayerEntity.level);
        let senderName;
        let receiverName;
        if (this.opponentIsSource ^ this.offset.isPositive()) {
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
    
    getShortDescriptionHelper(level) {
        const verb = (this.offset.isPositive()) ? "Absorb" : "Drain";
        const offsetText = this.offset.toShortString(level);
        return [`${verb} ${offsetText} ${this.getPointsAbbreviation()}`];
    }
}

class SwapPointsEffect extends PointsEffect {
    
    getDescription() {
        return [`Swap ${this.pointsName} of self and opponent.`];
    }
    
    getShortDescription(localEntity, referenceEntity) {
        if (localEntity === referenceEntity) {
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
    
    getDescription() {
        const turnExpression = getNumberExpression(this.turnAmount, "turn");
        return [`For the next ${turnExpression}:`, this.effect.getDescription()];
    }
    
    getShortDescription(localEntity, referenceEntity) {
        if (localEntity === referenceEntity) {
            return ["Apply status effect"];
        } else {
            return [];
        }
    }
}

const effectConstructorMap = {
    setPoints: SetPointsEffect,
    offsetPoints: OffsetPointsEffect,
    transferPoints: TransferPointsEffect,
    swapPoints: SwapPointsEffect,
    linger: LingerEffect,
};

const createEffectFromJson = (data) => {
    if (data === null) {
        return null;
    }
    const effectConstructor = effectConstructorMap[data.name];
    return new effectConstructor(data);
};

class LingerState {
    
    constructor(data) {
        this.effect = createEffectFromJson(data.effect);
        this.turnCount = data.turnCount;
    }
}


