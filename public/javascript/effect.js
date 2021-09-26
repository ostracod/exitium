
const actionList = [];
// Map from serial integer to Action.
const actionMap = {};
let selectedAction = null;
let isInBattle = false;
let battleTurnIndex = null;
let localPlayerHasTurn = false;
let battleIsFinished = false;
let battleMessage = null;

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
        this.applyToOpponent = data.applyToOpponent;
    }
    
    getReceiverName() {
        return this.applyToOpponent ? "opponent" : "self";
    }
}

class SetPointsEffect extends PointsEffect {
    
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

class OffsetPointsEffect extends PointsEffect {
    
    constructor(data) {
        super(data);
        this.offset = data.offset;
    }
    
    getDescription() {
        const verb = (this.offset > 0) ? "Increase" : "Decrease";
        const receiverName = this.getReceiverName();
        const numberExpression = getNumberExpression(Math.abs(this.offset), "point");
        return [`${verb} ${this.pointsName} of ${receiverName} by ${numberExpression}.`];
    }
}

const effectConstructorMap = {
    setPoints: SetPointsEffect,
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
        this.tag.style.padding = "5px";
        this.tag.style.border = "2px #FFFFFF solid";
        this.tag.style.cursor = "pointer";
        this.tag.onclick = () => {
            this.select();
        };
        this.tag.onmousedown = () => false;
        this.updateTagText();
        document.getElementById("actionsContainer").appendChild(this.tag);
        actionList.push(this);
        actionMap[this.serialInteger] = this;
    }
    
    unselect() {
        selectedAction = null;
        this.tag.style.border = "2px #FFFFFF solid";
        updateActionPane();
    }
    
    select() {
        if (selectedAction !== null) {
            selectedAction.unselect();
        }
        selectedAction = this;
        this.tag.style.border = "2px #000000 solid";
        updateActionPane();
    }
    
    getDescription() {
        const output = this.effect.getDescription().slice();
        output.push(`Cost: ${this.energyCost} EP`);
        return output;
    }
    
    updateTagText() {
        let text = capitalize(this.name);
        let color = "#000000";
        if (isInBattle) {
            text += ` (${this.energyCost} EP)`;
            if (!this.energyCostIsMet()) {
                color = "#FF0000";
            }
        }
        // This check fixes a bug in Safari.
        if (this.tag.innerHTML !== text) {
            this.tag.innerHTML = text;
        }
        this.tag.style.color = color;
    }
    
    energyCostIsMet() {
        return (localPlayerEntity.energy >= this.energyCost);
    }
    
    canPerform() {
        if (localPlayerEntity === null) {
            return false;
        } else {
            return (isInBattle && localPlayerHasTurn && !battleIsFinished
                && this.energyCostIsMet());
        }
    }
    
    perform() {
        if (!localPlayerHasTurn) {
            return;
        }
        messenger.performAction(this.serialInteger);
    }
}

function updateActionButtons() {
    let displayStyle;
    if (selectedAction === null) {
        displayStyle = "none";
    } else {
        displayStyle = "";
        const tag = document.getElementById("performActionButton");
        tag.className = selectedAction.canPerform() ? "" : "redButton";
    }
    document.getElementById("actionButtonsContainer").style.display = displayStyle;
    actionList.forEach((action) => {
        action.updateTagText();
    });
}

function updateActionDescription() {
    const tag = document.getElementById("actionDescription")
    if (selectedAction === null) {
        tag.innerHTML = "No action selected.";
    } else {
        tag.innerHTML = selectedAction.getDescription().join("<br />");
    }
}

function updateActionPane() {
    updateActionButtons();
    updateActionDescription();
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
    let subtitle;
    if (battleIsFinished) {
        if (opponentEntity === null) {
            subtitle = "Your opponent logged out!";
        } else {
            const names = [];
            if (localPlayerEntity.isDead()) {
                names.push("You");
            }
            if (opponentEntity.isDead()) {
                names.push(opponentEntity.name);
            }
            subtitle = `${names.join(" and ")} passed out!`;
        }
    } else if (localPlayerHasTurn) {
        subtitle = "It's your turn!";
    } else {
        subtitle = `Waiting for ${opponentEntity.name}...`;
    }
    context.fillText(subtitle, posX, posY);
}


