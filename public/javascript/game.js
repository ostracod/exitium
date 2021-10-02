
const pixelSize = 6;
const spritePixelSize = spriteSize * pixelSize;
let canvasSpriteSize;
let canvasPixelSize;
const tileActionOffsetSet = [
    new Pos(-1, 0),
    new Pos(1, 0),
    new Pos(0, -1),
    new Pos(0, 1),
];
let lightboxBackgroundTag;
let lightboxTag;
let actionsModuleWasVisible = false;

const capitalize = (text) => {
    return text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
};

const getNumberExpression = (amount, noun) => {
    let output = amount + " " + noun;
    if (amount !== 1) {
        output += "s";
    }
    return output;
};

class Messenger {
    
    constructor() {
        // Do nothing.
    }
    
    addCommand(name, data = null) {
        const command = { commandName: name };
        if (data !== null) {
            for (const key in data) {
                command[key] = data[key];
            }
        }
        gameUpdateCommandList.push(command);
    }
    
    getLearnedActions() {
        this.addCommand("getLearnedActions");
    }
    
    getState() {
        const commandData = {};
        if (isInBattle) {
            commandData.turnIndex = battleTurnIndex;
        }
        this.addCommand("getState", commandData);
    }
    
    walk(offset) {
        this.addCommand("walk", { offset: offset.toJson() });
    }
    
    performAction(serialInteger) {
        this.addCommand("performAction", { serialInteger });
    }
    
    learnAction(serialInteger) {
        this.addCommand("learnAction", { serialInteger });
    }
    
    forgetAction(serialInteger) {
        this.addCommand("forgetAction", { serialInteger });
    }
    
    bindAction(serialInteger, keyNumber) {
        this.addCommand("bindAction", { serialInteger, keyNumber });
    }
    
    levelUp() {
        this.addCommand("levelUp");
    }
}

const messenger = new Messenger();

const commandRepeaters = {
    
    "walk": (command) => {
        const offset = createPosFromJson(command.offset);
        localPlayerWalk(offset, false);
    },
};

const commandListeners = {
    
    "setLearnedActions": (command) => {
        learnedActionSet = new Set(command.serialIntegers.map((serialInteger) => (
            actionMap[serialInteger]
        )));
        updateActionButtons();
    },
    
    "setChunkTiles": (command) => {
        chunkTiles = deserializeTiles(command.tiles);
        chunkWindowPos = createPosFromJson(command.pos);
        chunkWindowSize = command.windowSize;
    },
    
    "setBattleState": (command) => {
        battleTurnIndex = command.turnIndex;
        localPlayerHasTurn = command.localPlayerHasTurn;
        battleIsFinished = command.isFinished;
        battleTurnTimeout = command.turnTimeout;
        if ("message" in command) {
            battleMessage = command.message;
        }
    },
    
    "setChunkEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromChunkJson);
        if (isInBattle) {
            isInBattle = false;
            updateActionButtons();
            if (!actionsModuleWasVisible) {
                hideModuleByName("actions");
            }
        }
    },
    
    "setBattleEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromBattleJson);
        if (!isInBattle) {
            isInBattle = true;
            const actionsModule = getModuleByName("actions");
            actionsModuleWasVisible = actionsModule.isVisible;
            actionsModule.show();
        }
        updateActionButtons();
    },
};

for (const name in commandRepeaters) {
    const commandRepeater = commandRepeaters[name];
    addCommandRepeater(name, commandRepeater);
}
for (const name in commandListeners) {
    const commandListener = commandListeners[name];
    addCommandListener(name, commandListener);
}

const createLightbox = () => {
    const bodyTag = document.getElementsByTagName("body")[0];
    lightboxBackgroundTag = document.createElement("div");
    lightboxBackgroundTag.className = "lightboxBackground";
    lightboxBackgroundTag.style.display = "none";
    lightboxTag = document.createElement("div");
    lightboxTag.className = "lightbox";
    lightboxBackgroundTag.appendChild(lightboxTag);
    bodyTag.appendChild(lightboxBackgroundTag);
};

// buttons conforms to { text: string, clickEvent: () => void }[]
const displayLightbox = (message, buttons) => {
    lightboxBackgroundTag.style.display = "";
    lightboxTag.innerHTML = "";
    let paragraphTag;
    paragraphTag = document.createElement("p");
    paragraphTag.innerHTML = message;
    lightboxTag.appendChild(paragraphTag);
    paragraphTag = document.createElement("p");
    buttons.forEach((button, index) => {
        const buttonTag = document.createElement("button");
        buttonTag.innerHTML = button.text;
        buttonTag.onclick = button.clickEvent;
        if (index > 0) {
            buttonTag.style.marginLeft = 10;
        }
        paragraphTag.appendChild(buttonTag);
    });
    lightboxTag.appendChild(paragraphTag);
}

const hideLightbox = () => {
    lightboxBackgroundTag.style.display = "none";
};

class ConstantsRequest extends AjaxRequest {
    
    constructor(callback) {
        super("gameConstants", {}, null);
        this.callback = callback;
    }
    
    respond(data) {
        super.respond(data);
        this.callback(data);
    }
}

const performTileAction = (offsetIndex) => {
    const offset = tileActionOffsetSet[offsetIndex];
    localPlayerWalk(offset);
};

const bindBattleActionToKey = (keyNumber) => {
    actionToBind.bind(keyNumber);
    actionToBind = null;
    hideLightbox();
    updateActionButtons();
}

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

class ClientDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    initialize(done) {
        
        canvasPixelSize = Math.round(canvasWidth / pixelSize);
        canvasSpriteSize = Math.round(canvasPixelSize / spriteSize);
        createLightbox();
        
        new ConstantsRequest((data) => {
            
            tileSerialIntegers = data.tileSerialIntegers;
            pointConstants = data.pointConstants;
            data.actions.forEach(createActionFromJson);
            restAreaWidth = data.restAreaWidth;
            restAreaSpacing = data.restAreaSpacing;
            
            updateActionPane();
            initializeTileMap();
            initializeSpriteSheet(done);
        });
    }
    
    setLocalPlayerInfo(command) {
        const keySerialIntegersText = command.extraFields.keyActions;
        if (keySerialIntegersText === null) {
            return;
        }
        const keySerialIntegers = JSON.parse(keySerialIntegersText);
        keySerialIntegers.forEach((serialInteger, index) => {
            if (serialInteger !== null) {
                const action = actionMap[serialInteger];
                action.bind(index, false);
            }
        });
    }
    
    addCommandsBeforeUpdateRequest() {
        if (learnedActionSet === null) {
            messenger.getLearnedActions();
        }
        messenger.getState();
    }
    
    timerEvent() {
        clearCanvas();
        if (isInBattle) {
            updateBattleAnimations();
            drawEntitySprites();
            drawBattleStats();
            drawBattleSubtitles();
        } else {
            updateCameraPos();
            drawRestAreaBoundaries();
            drawChunkTiles();
            displayLocalPlayerPos();
        }
        drawEntityNames();
    }
    
    keyDownEvent(keyCode) {
        if (focusedTextInput !== null) {
            return true;
        }
        if (keyCode === 37 || keyCode === 65) {
            performTileAction(0);
            return false;
        }
        if (keyCode === 39 || keyCode === 68) {
            performTileAction(1);
            return false;
        }
        if (keyCode === 38 || keyCode === 87) {
            performTileAction(2);
            return false;
        }
        if (keyCode === 40 || keyCode === 83) {
            performTileAction(3);
            return false;
        }
        if (keyCode >= 48 && keyCode <= 57) {
            handleBattleActionKey(keyCode - 48);
        }
        return true;
    }
    
    keyUpEvent(keyCode) {
        return true;
    }
}

clientDelegate = new ClientDelegate();


