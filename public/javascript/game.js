
const pixelSize = 6;
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
        // TODO: Read the command data.
        
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

class ClientDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    initialize() {
        initializeSpriteSheet(() => {
            const entitySprite = new Sprite(entitySpriteSet, 0, 0);
            entitySprite.draw(context, new Pos(spriteSize * 7, spriteSize * 8), pixelSize);
            barrierSprite.draw(context, new Pos(spriteSize * 7, spriteSize * 6), pixelSize);
        });
    }
    
    setLocalPlayerInfo(command) {
        // Do nothing.
    }
    
    addCommandsBeforeUpdateRequest() {
        messenger.getState();
    }
    
    timerEvent() {
        // Do nothing.
    }
    
    keyDownEvent(keyCode) {
        return true;
    }
    
    keyUpEvent(keyCode) {
        return true;
    }
}

clientDelegate = new ClientDelegate();


