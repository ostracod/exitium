
const pixelSize = 6;
let canvasSpriteSize;
let messenger;

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
}

messenger = new Messenger();

const commandRepeaters = {
    
};

const commandListeners = {
    
    "setTiles": (command) => {
        worldTiles = deserializeTiles(command.tiles);
        tileWindowPos = createPosFromJson(command.pos);
        tileWindowSize = command.windowSize;
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

class ClientDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    initialize(done) {
        canvasSpriteSize = Math.round(canvasWidth / (spriteSize * pixelSize));
        new ConstantsRequest((data) => {
            tileSerialIntegers = data.tileSerialIntegers;
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
        drawWorldTiles();
    }
    
    keyDownEvent(keyCode) {
        return true;
    }
    
    keyUpEvent(keyCode) {
        return true;
    }
}

clientDelegate = new ClientDelegate();


