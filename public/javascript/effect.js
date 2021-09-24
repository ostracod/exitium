
// Map from serial integer to Action.
const actionMap = {};
let selectedAction = null;

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
        this.serialInteger = data.serialInteger;
        this.name = data.name;
        this.minimumLevel = data.minimumLevel;
        this.energyCost = data.energyCost;
        this.effect = createEffectFromJson(data.effect);
        this.tag = document.createElement("div");
        this.tag.innerHTML = capitalize(this.name);
        this.tag.style.padding = "5px";
        this.tag.style.border = "2px #FFFFFF solid";
        this.tag.onclick = () => {
            this.select();
        };
        document.getElementById("actionsContainer").appendChild(this.tag);
        actionMap[this.serialInteger] = this;
    }
    
    unselect() {
        selectedAction = null;
        this.tag.style.border = "2px #FFFFFF solid";
    }
    
    select() {
        if (selectedAction !== null) {
            selectedAction.unselect();
        }
        selectedAction = this;
        this.tag.style.border = "2px #000000 solid";
        document.getElementById("actionInfo").style.display = "";
    }
    
    perform() {
        messenger.performAction(this.serialInteger);
    }
}

function performSelectedAction() {
    if (selectedAction === null) {
        return;
    }
    selectedAction.perform();
}


