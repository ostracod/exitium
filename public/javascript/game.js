
const pixelSize = 6;
const spritePixelSize = spriteSize * pixelSize;
let canvasSpriteSize;
const tileActionOffsetSet = [
    new Pos(-1, 0),
    new Pos(1, 0),
    new Pos(0, -1),
    new Pos(0, 1),
];

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
    
    "setTiles": (command) => {
        worldTiles = deserializeTiles(command.tiles);
        tileWindowPos = createPosFromJson(command.pos);
        tileWindowSize = command.windowSize;
    },
    
    "setEntities": (command) => {
        worldEntities = [localPlayerEntity];
        command.entities.map((entityData) => {
            const entity = createEntityFromJson(entityData);
            entity.addToWorld();
            worldEntities.push(entity);
        });
    },
    
    "setPos": (command) => {
        localPlayerEntity.pos = createPosFromJson(command.pos);
        localPlayerEntity.addToWorld();
        updateCameraPos();
    }
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
        canvasSpriteSize = Math.round(canvasWidth / spritePixelSize);
        new ConstantsRequest((data) => {
            tileSerialIntegers = data.tileSerialIntegers;
            initializeTileMap();
            initializeSpriteSheet(done);
        });
    }
    
    setLocalPlayerInfo(command) {
        localPlayerEntity.name = command.username;
    }
    
    addCommandsBeforeUpdateRequest() {
        messenger.getState();
    }
    
    timerEvent() {
        clearCanvas();
        drawWorldTiles();
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


