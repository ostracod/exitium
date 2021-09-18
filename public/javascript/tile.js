
let tileSerialIntegers;
// Map from serial integer to Tile.
let tileMap;
let worldTiles = [];
let tileWindowPos = new Pos(0, 0);
let tileWindowSize = 0;
let cameraPos = new Pos(0, 0);

class Tile {
    // Concrete subclasses of Tile must implement these methods:
    // getSprite
    
    draw(pos) {
        const sprite = this.getSprite();
        if (sprite !== null) {
            sprite.draw(context, pos, pixelSize);
        }
    }
}

class LoadingTile extends Tile {
    
    getSprite() {
        return loadingSprite;
    }
}

class EmptyTile extends Tile {
    
    getSprite() {
        return null;
    }
}

class Barrier extends Tile {
    
    getSprite() {
        return barrierSprite;
    }
}

class Entity extends Tile {
    
    constructor(pos, name = null) {
        super();
        this.pos = pos;
        this.name = name;
        this.sprite = new Sprite(entitySpriteSet, 0, 0);
    }
    
    getSprite() {
        return this.sprite;
    }
    
    addToWorld() {
        setTile(this.pos, this);
    }
    
    removeFromWorld() {
        setTile(this.pos, emptyTile);
    }
    
    walk(offset) {
        const nextPos = this.pos.copy();
        nextPos.add(offset);
        const tile = getTile(nextPos);
        if (tile instanceof EmptyTile) {
            this.removeFromWorld();
            this.pos.set(nextPos);
            this.addToWorld();
        }
    }
    
    drawName() {
        if (this.name === null) {
            return;
        }
        const pos = this.pos.copy();
        pos.subtract(cameraPos);
        pos.scale(spritePixelSize);
        pos.x += spritePixelSize / 2;
        pos.y -= spritePixelSize / 5;
        context.font = "bold 30px Arial";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillStyle = "#000000";
        context.fillText(
            this.name,
            Math.floor(pos.x),
            Math.floor(pos.y),
        );
    }
}

const loadingTile = new LoadingTile();
const emptyTile = new EmptyTile();
const barrier = new Barrier();

const localPlayerEntity = new Entity(new Pos(-3, 3));
let worldEntities = [localPlayerEntity];

const createEntityFromJson = (data) => {
    const pos = createPosFromJson(data.pos);
    return new Entity(pos, data.name);
};

const updateCameraPos = () => {
    cameraPos.set(localPlayerEntity.pos);
    const tempOffset = Math.floor(canvasSpriteSize / 2);
    cameraPos.x -= tempOffset;
    cameraPos.y -= tempOffset;
};

const initializeTileMap = () => {
    tileMap = {
        [tileSerialIntegers.empty]: emptyTile,
        [tileSerialIntegers.barrier]: barrier,
    };
};

const deserializeTiles = (text) => {
    const output = [];
    let index = 0;
    while (index < text.length) {
        const tempText = text.substring(index, index + 2);
        index += 2;
        const serialInteger = parseInt(tempText, 16);
        output.push(tileMap[serialInteger]);
    }
    return output;
};

const getTileIndex = (pos) => {
    const posX = pos.x - tileWindowPos.x;
    const posY = pos.y - tileWindowPos.y;
    if (posX < 0 || posY < 0 || posX >= tileWindowSize || posY >= tileWindowSize) {
        return null;
    } else {
        return posX + posY * tileWindowSize;
    }
};

const getTile = (pos) => {
    const index = getTileIndex(pos);
    if (index === null) {
        return loadingTile;
    } else {
        return worldTiles[index];
    }
};

const setTile = (pos, tile) => {
    const index = getTileIndex(pos);
    if (index !== null) {
        worldTiles[index] = tile;
    }
};

const drawWorldTiles = () => {
    const spritePos = new Pos(0, 0);
    const pos = new Pos(0, 0);
    while (spritePos.y < canvasSpriteSize) {
        pos.set(spritePos);
        pos.add(cameraPos);
        const tile = getTile(pos);
        pos.set(spritePos);
        pos.scale(spriteSize);
        tile.draw(pos);
        spritePos.x += 1;
        if (spritePos.x >= canvasSpriteSize) {
            spritePos.x = 0;
            spritePos.y += 1;
        }
    }
};

const drawEntityNames = () => {
    worldEntities.forEach((entity) => {
        entity.drawName();
    });
};

const localPlayerWalk = (offset, shouldSendCommand = true) => {
    localPlayerEntity.walk(offset);
    updateCameraPos();
    if (shouldSendCommand) {
        messenger.walk(offset);
    }
};


