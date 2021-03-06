
const actionList = [];
// Map from serial integer to Action.
const actionMap = {};
let hasInitializedActions = false;
let learnableActionCapacity;
let keyActions = [];
let learnedActionSet = null;
let discountedActionSet = null;
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
        this.baseEnergyCost = data.baseEnergyCost;
        this.energyCost = null;
        this.effect = createEffectFromJson(data.effect);
        this.keyNumber = null;
        this.tag = null;
        actionList.push(this);
        actionMap[this.serialInteger] = this;
    }
    
    getDiscountScale(scale) {
        return (discountedActionSet.has(this)) ? scale : 1;
    }
    
    initialize() {
        const scale = this.getDiscountScale(pointConstants.actionEnergyDiscount);
        this.energyCost = Math.round(scale * this.baseEnergyCost);
    }
    
    createTag() {
        this.tag = createOptionRow("actionsContainer", () => {
            this.select();
        });
        this.updateTag();
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
    
    getDescription(context) {
        let output;
        if (this.effect === null) {
            output = ["Wait for one turn."];
        } else {
            output = this.effect.getDescription(context).slice();
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
        if (gameMode === gameModes.battle) {
            output += ` (${this.energyCost} EP)`;
        }
        return output;
    }
    
    getTagColor() {
        if (gameMode === gameModes.battle && !this.energyCostIsMet()) {
            return "#FF0000";
        } else {
            return "#000000";
        }
    }
    
    shouldDisplayPerformButton() {
        return (gameMode === gameModes.battle);
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
        if (this.tag === null) {
            return;
        }
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
        return (localPlayerEntity.points.energy.value >= this.energyCost);
    }
    
    canPerform() {
        return (gameMode === gameModes.battle && localPlayerHasTurn
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
        this.baseMinimumLevel = data.baseMinimumLevel;
        this.minimumLevel = null;
    }
    
    initialize() {
        super.initialize();
        const scale = this.getDiscountScale(pointConstants.actionLevelDiscount);
        this.minimumLevel = Math.round(scale * this.baseMinimumLevel);
    }
    
    getDescription(context) {
        const output = super.getDescription(context);
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
        const baseLearnCost = getActionLearnCost(localPlayerEntity.level);
        const scale = this.getDiscountScale(pointConstants.actionExperienceDiscount);
        return Math.round(scale * baseLearnCost);
    }
    
    shouldDisplayTag() {
        return (this.hasBeenLearned() || gameMode !== gameModes.battle)
            && localPlayerEntity.level >= this.minimumLevel - 3;
    }
    
    getTagText() {
        if (this.hasBeenLearned()) {
            return super.getTagText();
        } else {
            let output = this.getTagTextHelper();
            if (!this.minimumLevelIsMet()) {
                output += ` (Level ${this.minimumLevel})`;
            }
            return output;
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
        return (gameMode !== gameModes.battle && this.hasBeenLearned());
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
    
    minimumLevelIsMet() {
        return (localPlayerEntity.level >= this.minimumLevel);
    }
    
    experienceCostIsMet() {
        return (localPlayerEntity.points.experience.value >= this.getExperienceCost());
    }
    
    canPerform() {
        return super.canPerform() && this.hasBeenLearned();
    }
    
    getLearnProblem() {
        if (learnedActionSet.has(this)) {
            return "You have already learned this action.";
        }
        if (!this.minimumLevelIsMet()) {
            return "Your level is not high enough to learn this action.";
        }
        if (!this.experienceCostIsMet()) {
            return "You do not have enough XP to learn this action.";
        }
        if (learnedActionSet.size >= learnableActionCapacity) {
            return `You can only learn up to ${learnableActionCapacity} actions. Please forget an action first.`;
        }
        if (gameMode === gameModes.battle) {
            return "You cannot learn an action while in battle.";
        }
        return null;
    }
    
    canLearn() {
        return (this.getLearnProblem() === null);
    }
    
    canForget() {
        return learnedActionSet.has(this);
    }
    
    learn() {
        const problem = this.getLearnProblem();
        if (problem !== null) {
            displayLightbox(problem, [
                { text: "Okay", clickEvent: hideLightbox },
            ]);
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
    if ("baseMinimumLevel" in data) {
        return new LearnableAction(data);
    } else {
        return new FreeAction(data);
    }
};

const initializeActions = () => {
    if (hasInitializedActions) {
        return;
    }
    actionList.forEach((action) => {
        action.initialize();
    });
    actionList.sort((action1, action2) => {
        if (action1 instanceof LearnableAction) {
            if (action2 instanceof LearnableAction) {
                return action1.minimumLevel - action2.minimumLevel;
            } else {
                return 1;
            }
        } else if (action2 instanceof LearnableAction) {
            return -1;
        } else {
            return 0;
        }
    });
    actionList.forEach((action) => {
        action.createTag();
    });
    hasInitializedActions = true;
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
        const context = new EffectContext(localPlayerEntity, opponentEntity);
        description = selectedAction.getDescription(context);
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


