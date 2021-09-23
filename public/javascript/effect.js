
let actionSet;

class Effect {
    
    constructor(data) {
        // Do nothing.
    }
}

class PointsEffect extends Effect {
    
    constructor(data) {
        super(data);
        this.pointsName = data.pointsName;
        this.applyToOpponent = data.applyToOpponent;
    }
}

class OffsetPointsEffect extends PointsEffect {
    
    constructor(data) {
        super(data);
        this.offset = data.offset;
    }
}

const effectConstructorMap = {
    offsetPoints: OffsetPointsEffect,
};

const createEffectFromJson = (data) => {
    const effectConstructor = effectConstructorMap[data.name];
    return new effectConstructor(data);
};

class Action {
    
    constructor(data) {
        this.name = data.name;
        this.minimumLevel = data.minimumLevel;
        this.energyCost = data.energyCost;
        this.effect = createEffectFromJson(data.effect);
        this.tag = document.createElement("p");
        this.tag.innerHTML = capitalize(this.name);
        document.getElementById("actionsContainer").appendChild(this.tag);
    }
}


