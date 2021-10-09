
class PointsOffset {
    // Concrete subclasses of PointsOffset must implement these methods:
    // isPositive, toString
    
    constructor(data) {
        // Do nothing.
    }
    
    getVerb() {
        return this.isPositive() ? "increase" : "decrease";
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
    
    toString() {
        return getNumberExpression(Math.abs(this.value), "point");
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
    
    toString() {
        return Math.round(Math.abs(this.ratio) * 100) + "%";
    }
}

class PowerPointsOffset extends PointsOffset {
    
    constructor(data) {
        super(data);
        this.scale = data.scale;
    }
    
    isPositive() {
        return (this.scale > 0);
    }
    
    toString() {
        const { level } = localPlayerEntity;
        const amount = Math.round(Math.abs(this.scale) * getPowerMultiplier(level));
        return getNumberExpression(amount, "point");
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
    // getDescription
    
    constructor(data) {
        // Do nothing.
    }
}

class PointsEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.pointsName = data.pointsName;
    }
}

class SinglePointsEffect extends PointsEffect {
    
    constructor(data) {
        super(data);
        this.applyToOpponent = data.applyToOpponent;
    }
    
    getReceiverName() {
        return this.applyToOpponent ? "opponent" : "self";
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
}

class OffsetPointsEffect extends SinglePointsEffect {
    
    constructor(data) {
        super(data);
        this.offset = createPointsOffsetFromJson(data.offset);
    }
    
    getDescription() {
        const verb = capitalize(this.offset.getVerb());
        const receiverName = this.getReceiverName();
        const offsetText = this.offset.toString();
        return [`${verb} ${this.pointsName} of ${receiverName} by ${offsetText}.`];
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
        const offsetText = this.offset.toString();
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
}

class SwapPointsEffect extends PointsEffect {
    
    getDescription() {
        return [`Swap ${this.pointsName} of self and opponent.`];
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


