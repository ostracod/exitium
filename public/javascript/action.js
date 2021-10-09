
const actionList = [];
// Map from serial integer to Action.
const actionMap = {};
let keyActions = [];
let learnedActionSet = null;
let selectedAction = null;
let actionToBind = null;
let lastActionDescription = null;
let actionsModuleWasVisible = false;

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
    
    getDescription() {
        const output = super.getDescription();
        output.push(`Minimum level to learn: ${this.minimumLevel}`);
        return output;
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

const descriptionsAreEqual = (description1, description2) => {
    if (description1.length !== description2.length) {
        return false;
    }
    for (let index = 0; index < description1.length; index++) {
        const value1 = description1[index];
        const value2 = description2[index];
        if (typeof value1 === "string" && typeof value2 === "string") {
            if (value1 !== value2) {
                return false;
            }
        } else if (Array.isArray(value1) && Array.isArray(value2)) {
            if (!descriptionsAreEqual(value1, value2)) {
                return false;
            }
        } else {
            return false;
        }
    }
    return true;
};

const displayDescriptionHelper = (description, containerTag, indentation) => {
    description.forEach((value) => {
        if (typeof value === "string") {
            const tag = document.createElement("div");
            if (indentation > 0) {
                tag.innerHTML = "&bull; " + value;
                tag.style.paddingLeft = indentation * 20 - 10;
            } else {
                tag.innerHTML = value;
            }
            containerTag.appendChild(tag);
        }
        if (Array.isArray(value)) {
            displayDescriptionHelper(value, containerTag, indentation + 1);
        }
    });
};

const displayDescription = (description, containerTag) => {
    containerTag.innerHTML = "";
    displayDescriptionHelper(description, containerTag, 0);
};

const updateActionDescription = () => {
    let description;
    if (selectedAction === null) {
        description = ["No action selected."];
    } else {
        description = selectedAction.getDescription();
    }
    if (lastActionDescription === null
            || !descriptionsAreEqual(description, lastActionDescription)) {
        const tag = document.getElementById("actionDescription");
        displayDescription(description, tag);
        lastActionDescription = description;
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
};

const bindBattleActionToKey = (keyNumber) => {
    actionToBind.bind(keyNumber);
    actionToBind = null;
    hideLightbox();
};

const performBattleActionByKey = (keyNumber) => {
    if (keyNumber >= keyActions.length) {
        return;
    }
    const action = keyActions[keyNumber];
    if (action !== null) {
        action.perform();
    }
};

const handleBattleActionKey = (keyNumber) => {
    if (actionToBind === null) {
        performBattleActionByKey(keyNumber);
    } else {
        bindBattleActionToKey(keyNumber);
    }
};


