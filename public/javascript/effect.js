
const actionList = [];
// Map from serial integer to Action.
const actionMap = {};
let keyActions = [];
let learnedActionSet = null;
let selectedAction = null;
let actionToBind = null;
let lastActionDescription = null;
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
    
    constructor(data) {
        this.serialInteger = data.serialInteger;
        this.name = data.name;
        this.energyCost = data.energyCost;
        this.effect = createEffectFromJson(data.effect);
        this.keyNumber = null;
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
    }
    
    select() {
        if (selectedAction !== null) {
            selectedAction.unselect();
        }
        selectedAction = this;
        this.tag.style.border = "2px #000000 solid";
    }
    
    getDescription() {
        let output;
        if (this.effect === null) {
            output = ["Wait for one turn."];
        } else {
            output = this.effect.getDescription().slice();
        }
        output.push(`Cost to perform: ${this.energyCost} EP`);
        return output;
    }
    
    shouldDisplayTag() {
        return true;
    }
    
    getTagTextHelper() {
        return capitalize(this.name);
    }
    
    getTagText() {
        let output = this.getTagTextHelper();
        if (this.keyNumber !== null) {
            output = `[${this.keyNumber}] ` + output;
        }
        if (isInBattle) {
            output += ` (${this.energyCost} EP)`;
        }
        return output;
    }
    
    getTagColor() {
        return (isInBattle && !this.energyCostIsMet()) ? "#FF0000" : "#000000";
    }
    
    shouldDisplayPerformButton() {
        return isInBattle;
    }
    
    shouldDisplayLearnButton() {
        return false;
    }
    
    shouldDisplayForgetButton() {
        return false;
    }
    
    shouldDisplayBindButton() {
        return true;
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
    
    getLearnCostText() {
        return "";
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
            !this.canLearn(),
        );
        updateButton("forgetActionButton", this.shouldDisplayForgetButton());
        updateButton("bindActionButton", this.shouldDisplayBindButton());
        document.getElementById("actionLearnCost").innerHTML = this.getLearnCostText();
    }
    
    energyCostIsMet() {
        return (localPlayerEntity.energy >= this.energyCost);
    }
    
    canPerform() {
        return (localPlayerEntity !== null && isInBattle && localPlayerHasTurn
            && !battleIsFinished && this.energyCostIsMet());
    }
    
    canLearn() {
        return false;
    }
    
    canForget() {
        return false;
    }
    
    perform() {
        if (!this.canPerform()) {
            return;
        }
        messenger.performAction(this.serialInteger);
    }
    
    bind(keyNumber, shouldSendCommand = true) {
        while (keyActions.length < keyNumber + 1) {
            keyActions.push(null);
        }
        if (this.keyNumber !== null) {
            keyActions[this.keyNumber] = null;
            this.keyNumber = null;
            if (shouldSendCommand) {
                messenger.bindAction(null, this.keyNumber);
            }
        }
        if (keyNumber !== null) {
            const oldAction = keyActions[keyNumber];
            if (oldAction !== null) {
                oldAction.keyNumber = null;
            }
            keyActions[keyNumber] = this;
            this.keyNumber = keyNumber;
            if (shouldSendCommand) {
                messenger.bindAction(this.serialInteger, keyNumber);
            }
        }
    }
}

class FreeAction extends Action {
    
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
        return getActionLearnCost(localPlayerEntity.level);
    }
    
    shouldDisplayTag() {
        return (this.hasBeenLearned() || !isInBattle) && (localPlayerEntity !== null
            && localPlayerEntity.level >= this.minimumLevel);
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
        return super.shouldDisplayPerformButton() && this.hasBeenLearned();
    }
    
    shouldDisplayLearnButton() {
        return !this.hasBeenLearned();
    }
    
    shouldDisplayForgetButton() {
        return (!isInBattle && this.hasBeenLearned());
    }
    
    shouldDisplayBindButton() {
        return this.hasBeenLearned();
    }
    
    getLearnCostText() {
        if (this.shouldDisplayLearnButton()) {
            return `Cost to learn: ${this.getExperienceCost()} XP`;
        } else {
            return super.getLearnCostText();
        }
    }
    
    experienceCostIsMet() {
        return (localPlayerEntity.experience >= this.getExperienceCost());
    }
    
    canPerform() {
        return super.canPerform() && this.hasBeenLearned();
    }
    
    canLearn() {
        return (localPlayerEntity !== null && !isInBattle
            && !learnedActionSet.has(this) && this.experienceCostIsMet());
    }
    
    canForget() {
        return learnedActionSet.has(this);
    }
    
    learn() {
        if (!this.canLearn()) {
            return;
        }
        messenger.learnAction(this.serialInteger);
    }
    
    forget() {
        if (!this.canForget()) {
            return;
        }
        this.bind(null);
        messenger.forgetAction(this.serialInteger);
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
    let text;
    if (selectedAction === null) {
        text = "No action selected.";
    } else {
        text = selectedAction.getDescription().join("<br />");
    }
    if (text !== lastActionDescription) {
        // We can't compare the last innerHTML of this tag
        // because <br /> is converted to <br>.
        document.getElementById("actionDescription").innerHTML = text;
        lastActionDescription = text;
    }
};

const performSelectedAction = () => {
    if (selectedAction === null) {
        return;
    }
    selectedAction.perform();
};

const learnSelectedAction = () => {
    if (selectedAction === null || !(selectedAction instanceof LearnableAction)) {
        return;
    }
    selectedAction.learn();
};

const forgetSelectedAction = () => {
    if (selectedAction === null || !(selectedAction instanceof LearnableAction)) {
        return;
    }
    // Make sure that we don't reassign the action to be forgotten.
    const action = selectedAction;
    displayLightbox(
        `Are you sure you want to forget ${action.name}?`,
        [
            { text: "Cancel", clickEvent: hideLightbox },
            { text: "Yes Forget", clickEvent: () => {
                action.forget();
                hideLightbox();
            } },
        ],
    );
};

const bindSelectedAction = () => {
    if (selectedAction === null) {
        return;
    }
    actionToBind = selectedAction;
    displayLightbox(
        `Press a number key between 0 and 9 to bind ${actionToBind.name}.`,
        [
            { text: "Cancel", clickEvent: () => {
                actionToBind = null;
                hideLightbox();
            } },
        ],
    );
}

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


