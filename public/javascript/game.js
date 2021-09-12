
const pixelSize = 6;

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
        // Do nothing.
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


