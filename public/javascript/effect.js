
// Map from serial integer to Action.
const actionMap = {};
let selectedAction = null;
let battleTurnIndex = null;
let localPlayerHasTurn = false;
let battleMessage = null;

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
        this.tag.style.cursor = "pointer";
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
        if (!localPlayerHasTurn) {
            return;
        }
        messenger.performAction(this.serialInteger);
    }
}

function updateActionButtons() {
    const tag = document.getElementById("performActionButton");
    tag.className = (isInBattle && localPlayerHasTurn) ? "" : "redButton";
}

function performSelectedAction() {
    if (selectedAction === null) {
        return;
    }
    selectedAction.perform();
}

function drawBattleSubtitles() {
    context.font = "30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    const posX = canvasWidth / 2;
    let posY = 3 * canvasHeight / 4;
    if (battleMessage !== null) {
        context.fillText(battleMessage, posX, posY);
    }
    posY += 40;
    if (localPlayerHasTurn) {
        context.fillText("It's your turn!", posX, posY);
    } else {
        context.fillText(`Waiting for ${opponentEntity.name}...`, posX, posY);
    }
}


