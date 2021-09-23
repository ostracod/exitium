
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
let isInBattle = false;

const capitalize = (text) => {
    return text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
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
    
    getState() {
        this.addCommand("getState");
    }
    
    walk(offset) {
        this.addCommand("walk", { offset: offset.toJson() });
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
    
    "setChunkTiles": (command) => {
        chunkTiles = deserializeTiles(command.tiles);
        chunkWindowPos = createPosFromJson(command.pos);
        chunkWindowSize = command.windowSize;
    },
    
    "setChunkEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromChunkJson);
        isInBattle = false;
    },
    
    "setBattleEntities": (command) => {
        addEntitiesFromJson(command.entities, addEntityFromBattleJson);
        isInBattle = true;
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

class ClientDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    initialize(done) {
        canvasPixelSize = Math.round(canvasWidth / pixelSize);
        canvasSpriteSize = Math.round(canvasPixelSize / spriteSize);
        new ConstantsRequest((data) => {
            tileSerialIntegers = data.tileSerialIntegers;
            maximumEnergyPoints = data.maximumEnergyPoints;
            maximumDamagePoints = data.maximumDamagePoints;
            actionSet = data.actions.map((data) => new Action(data));
            initializeTileMap();
            initializeSpriteSheet(done);
        });
    }
    
    setLocalPlayerInfo(command) {
        // Do nothing.
    }
    
    addCommandsBeforeUpdateRequest() {
        messenger.getState();
    }
    
    timerEvent() {
        clearCanvas();
        if (isInBattle) {
            updateBattleAnimations();
            drawEntitySprites();
            drawBattleStats();
        } else {
            updateCameraPos();
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
        return true;
    }
    
    keyUpEvent(keyCode) {
        return true;
    }
}

clientDelegate = new ClientDelegate();


