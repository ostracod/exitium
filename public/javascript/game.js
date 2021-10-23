
const pixelSize = 6;
const spritePixelSize = spriteSize * pixelSize;
let canvasSpriteSize;
let canvasPixelSize;
let lightboxBackgroundTag;
let lightboxTag;
const gameModes = {
    requestSpecies: 0,
    chunk: 1,
    battle: 2,
};
let gameMode = null;

const extendList = (destination, values) => {
    values.forEach((value) => {
        destination.push(value);
    });
};

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

const posIsInBounds = (pos, bounds) => {
    return (pos.x >= bounds.startPos.x && pos.x < bounds.endPos.x
        && pos.y >= bounds.startPos.y && pos.y < bounds.endPos.y);
};

const setGameMode = (nextGameMode) => {
    if (nextGameMode === gameMode) {
        return;
    }
    const lastGameMode = gameMode;
    gameMode = nextGameMode;
    canvas.style.cursor = (gameMode === gameModes.requestSpecies) ? "pointer" : "";
    if (gameMode === gameModes.battle) {
        const actionsModule = getModuleByName("actions");
        actionsModuleWasVisible = actionsModule.isVisible;
        actionsModule.show();
    }
    if (lastGameMode === gameModes.battle && !actionsModuleWasVisible) {
        hideModuleByName("actions");
    }
    if (gameMode !== gameModes.requestSpecies && !hasShownStatsModule) {
        showModuleByName("stats");
        hasShownStatsModule = true;
    }
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
    
    setSpecies(species, color) {
        this.addCommand("setSpecies", { species, color });
    }
    
    getLearnedActions() {
        this.addCommand("getLearnedActions");
    }
    
    getDiscountedActions() {
        this.addCommand("getDiscountedActions");
    }
    
    getState() {
        const commandData = {};
        if (gameMode === gameModes.battle) {
            commandData.turnIndex = battleTurnIndex;
        }
        this.addCommand("getState", commandData);
    }
    
    walk(offsetIndex) {
        this.addCommand("walk", { offsetIndex });
    }
    
    placeTile(offsetIndex, tile) {
        this.addCommand("placeTile", { offsetIndex, tile: tile.serialize() });
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
        localPlayerWalk(command.offsetIndex, false);
    },
    
    "placeTile": (command) => {
        const { offsetIndex } = command;
        const tile = deserializeTiles(command.tile)[0];
        localPlayerPlaceTileHelper(offsetIndex, tile, false);
    },
};

const commandListeners = {
    
    "requestSpecies": (command) => {
        setGameMode(gameModes.requestSpecies);
    },
    
    "setLearnedActions": (command) => {
        learnedActionSet = new Set(command.serialIntegers.map((serialInteger) => (
            actionMap[serialInteger]
        )));
    },
    
    "setDiscountedActions": (command) => {
        discountedActionSet = new Set(command.serialIntegers.map((serialInteger) => (
            actionMap[serialInteger]
        )));
        initializeActions();
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
        lingerStates = command.lingerStates.map((stateData) => (
            new LingerState(stateData)
        ));
        if ("actionMessages" in command) {
            battleActionMessages = command.actionMessages;
        }
        if ("rewardMessage" in command) {
            battleRewardMessage = command.rewardMessage;
        }
    },
    
    "setChunkEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromChunkJson);
        setGameMode(gameModes.chunk);
    },
    
    "setBattleEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromBattleJson);
        setGameMode(gameModes.battle);
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

const createOptionRow = (parentTagId, handleClick, text = null, sprite = null) => {
    const output = document.createElement("div");
    if (sprite !== null) {
        const tempCanvas = createCanvasWithSprite(output, sprite, 4);
        tempCanvas.style.marginRight = 8;
    }
    if (text !== null) {
        const spanTag = document.createElement("span");
        spanTag.innerHTML = text;
        if (sprite !== null) {
            spanTag.style.verticalAlign = 7;
        }
        output.appendChild(spanTag);
    }
    output.style.padding = "5px";
    output.style.border = "2px #FFFFFF solid";
    output.style.cursor = "pointer";
    output.onclick = handleClick;
    output.onmousedown = () => false;
    document.getElementById(parentTagId).appendChild(output);
    return output;
};

const drawButton = (centerPos, text) => {
    context.font = "bold 32px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const width = context.measureText(text).width + 40;
    const height = 76;
    const borderRadius = 30;
    const startPos = new Pos(centerPos.x - width / 2, centerPos.y - height / 2);
    const endPos = new Pos(centerPos.x + width / 2, centerPos.y + height / 2);
    context.fillStyle = "#888888";
    context.beginPath();
    context.moveTo(startPos.x, startPos.y);
    context.arcTo(endPos.x, startPos.y, endPos.x, endPos.y, borderRadius);
    context.arcTo(endPos.x, endPos.y, startPos.x, endPos.y, borderRadius);
    context.arcTo(startPos.x, endPos.y, startPos.x, startPos.y, borderRadius);
    context.arcTo(startPos.x, startPos.y, endPos.x, startPos.y, borderRadius);
    context.closePath();
    context.fill();
    context.fillStyle = "#FFFFFF";
    context.fillText(text, centerPos.x, centerPos.y);
    return { startPos, endPos };
};

const processDirectionKey = (keyCode, handle) => {
    if (keyCode === 37 || keyCode === 65) {
        handle(-1, 0);
        return true;
    }
    if (keyCode === 39 || keyCode === 68) {
        handle(1, 0);
        return true;
    }
    if (keyCode === 38 || keyCode === 87) {
        handle(0, -1);
        return true;
    }
    if (keyCode === 40 || keyCode === 83) {
        handle(0, 1);
        return true;
    }
    return false;
}

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
            pointsAbbreviationMap = data.pointsAbbreviationMap;
            pointConstants = data.pointConstants;
            data.actions.forEach(createActionFromJson);
            learnableActionCapacity = data.learnableActionCapacity;
            restAreaWidth = data.restAreaWidth;
            restAreaSpacing = data.restAreaSpacing;
            tileActionOffsets = data.tileActionOffsets.map(createPosFromJson);
            speciesList = data.speciesList;
            
            initializeTileMap();
            initializeSpeciesMap();
            initializeSpriteSheet(() => {
                initializeInventoryItems();
                done();
            });
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
        if (discountedActionSet === null && gameMode !== null
                && gameMode !== gameModes.requestSpecies) {
            messenger.getDiscountedActions();
        }
        messenger.getState();
    }
    
    timerEvent() {
        if (localWalkOffsetIndex !== null && Date.now() / 1000 > localWalkStartTime + 0.3) {
            localPlayerWalk(localWalkOffsetIndex);
        }
        clearCanvas();
        if (gameMode === gameModes.requestSpecies) {
            drawSpeciesRequest();
        } else {
            if (gameMode === gameModes.battle) {
                updateBattleAnimations();
                drawEntitySprites();
                drawBattleStats();
                drawBattleSubtitles();
            } else if (gameMode === gameModes.chunk) {
                updateCameraPos();
                drawRestAreaBoundaries();
                drawChunkTiles();
                displayLocalPlayerPos();
            }
            drawEntityNames();
            updateActionButtons();
            updateActionDescription();
        }
    }
    
    keyDownEvent(keyCode) {
        if (focusedTextInput !== null) {
            return true;
        }
        const isDirectionKey = processDirectionKey(keyCode, startTileAction);
        if (isDirectionKey) {
            return false;
        }
        if (keyCode >= 48 && keyCode <= 57) {
            handleBattleActionKey(keyCode - 48);
        }
        return true;
    }
    
    keyUpEvent(keyCode) {
        return !processDirectionKey(keyCode, stopTileAction);
    }
    
    canvasMouseDownEvent(pos) {
        if (gameMode === gameModes.requestSpecies) {
            speciesRequestClickEvent(pos);
        }
    }
}

clientDelegate = new ClientDelegate();


