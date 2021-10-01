
const actionList = [];
// Map from serial integer to Action.
const actionMap = {};
let learnedActionSet = null;
let selectedAction = null;
let isInBattle = false;
let battleTurnIndex = null;
let localPlayerHasTurn = false;
let battleIsFinished = false;
let battleTurnTimeout = null;
let battleMessage = null;

const updateButton = (tagName, isVisible, isRed = false) => {
    const tag = document.getElementById(tagName);
    let displayStyle;
    if (isVisible) {
        tag.className = isRed ? "redButton" : "";
        displayStyle = "";
    } else {
        displayStyle = "none";
    }
    tag.style.display = displayStyle;
}

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
    if (data === null) {
        return null;
    }
    const effectConstructor = effectConstructorMap[data.name];
    return new effectConstructor(data);
};

class Action {
    
    // Concrete subclasses of Action must implement these methods:
    // shouldDisplayPerformButton, shouldDisplayLearnButton, shouldDisplayForgetButton
    
    constructor(data) {
        this.serialInteger = data.serialInteger;
        this.name = data.name;
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
        this.updateTag();
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
        if (this.effect === null) {
            return ["Wait for one turn."];
        } else {
            return this.effect.getDescription().slice();
        }
    }
    
    shouldDisplayTag() {
        return true;
    }
    
    getTagTextHelper() {
        return capitalize(this.name);
    }
    
    getTagText() {
        let output = this.getTagTextHelper();
        if (isInBattle) {
            output += ` (${this.energyCost} EP)`;
        }
        return output;
    }
    
    getTagColor() {
        return (isInBattle && !this.energyCostIsMet()) ? "#FF0000" : "#000000";
    }
    
    updateTag() {
        if (!this.shouldDisplayTag()) {
            this.tag.style.display = "none";
            if (this === selectedAction) {
                this.unselect();
            }
            return
        }
        this.tag.style.display = "";
        const text = this.getTagText();
        // This check fixes a bug in Safari.
        if (this.tag.innerHTML !== text) {
            this.tag.innerHTML = text;
        }
        this.tag.style.color = this.getTagColor();
    }
    
    getCostText() {
        if (this.shouldDisplayPerformButton()) {
            return `Cost: ${this.energyCost} EP`;
        } else {
            return "";
        }
    }
    
    updateButtons() {
        updateButton(
            "performActionButton",
            this.shouldDisplayPerformButton(),
            !this.canPerform(),
        );
        updateButton(
            "learnActionButton",
            this.shouldDisplayLearnButton(),
        );
        updateButton(
            "forgetActionButton",
            this.shouldDisplayForgetButton(),
        );
        document.getElementById("actionCost").innerHTML = this.getCostText();
    }
    
    energyCostIsMet() {
        return (localPlayerEntity.energy >= this.energyCost);
    }
    
    canPerform() {
        return (localPlayerEntity !== null && isInBattle && localPlayerHasTurn
            && !battleIsFinished && this.energyCostIsMet());
    }
    
    perform() {
        if (!this.canPerform()) {
            return;
        }
        messenger.performAction(this.serialInteger);
    }
}

class FreeAction extends Action {
    
    shouldDisplayPerformButton() {
        return true;
    }
    
    shouldDisplayLearnButton() {
        return false;
    }
    
    shouldDisplayForgetButton() {
        return false;
    }
}

class LearnableAction extends Action {
    
    constructor(data) {
        super(data);
        this.minimumLevel = data.minimumLevel;
    }
    
    hasBeenLearned() {
        if (learnedActionSet === null) {
            return false;
        } else {
            return learnedActionSet.has(this);
        }
    }
    
    getExperienceCost() {
        // TODO: Determine the actual cost.
        return 10;
    }
    
    shouldDisplayTag() {
        return (this.hasBeenLearned() || !isInBattle);
    }
    
    getTagText() {
        if (this.hasBeenLearned()) {
            return super.getTagText();
        } else {
            return this.getTagTextHelper();
        }
    }
    
    getTagColor() {
        if (this.hasBeenLearned()) {
            return super.getTagColor();
        } else {
            return "#AAAAAA";
        }
    }
    
    shouldDisplayPerformButton() {
        return this.hasBeenLearned();
    }
    
    shouldDisplayLearnButton() {
        return !this.hasBeenLearned();
    }
    
    shouldDisplayForgetButton() {
        return (!isInBattle && this.hasBeenLearned());
    }
    
    getCostText() {
        if (this.shouldDisplayLearnButton()) {
            return `Cost: ${this.getExperienceCost()} XP`;
        } else {
            return super.getCostText();
        }
    }
    
    canPerform() {
        return super.canPerform() && this.hasBeenLearned();
    }
}

const createActionFromJson = (data) => {
    if ("minimumLevel" in data) {
        return new LearnableAction(data);
    } else {
        return new FreeAction(data);
    }
};

const updateActionButtons = () => {
    let displayStyle;
    if (selectedAction === null) {
        displayStyle = "none";
    } else {
        displayStyle = "";
        selectedAction.updateButtons();
    }
    document.getElementById("actionButtonsContainer").style.display = displayStyle;
    actionList.forEach((action) => {
        action.updateTag();
    });
};

const updateActionDescription = () => {
    const tag = document.getElementById("actionDescription")
    if (selectedAction === null) {
        tag.innerHTML = "No action selected.";
    } else {
        tag.innerHTML = selectedAction.getDescription().join("<br />");
    }
};

const updateActionPane = () => {
    updateActionButtons();
    updateActionDescription();
};

const performSelectedAction = () => {
    if (selectedAction === null) {
        return;
    }
    selectedAction.perform();
};

const learnSelectedAction = () => {
    if (selectedAction === null) {
        return;
    }
    // TODO: Implement.
    
};

const forgetSelectedAction = () => {
    if (selectedAction === null) {
        return;
    }
    // TODO: Implement.
    
};

const drawBattleSubtitles = () => {
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
    } else {
        if (localPlayerHasTurn) {
            subtitle = "It's your turn!";
        } else {
            subtitle = `Waiting for ${opponentEntity.name}...`;
        }
        if (battleTurnTimeout !== null) {
            subtitle += ` (Timeout: ${battleTurnTimeout})`;
        }
    }
    context.fillText(subtitle, posX, posY);
};


