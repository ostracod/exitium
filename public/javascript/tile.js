
let tileSerialIntegers;
// Map from serial integer to Tile.
let tileMap;
let chunkTiles = [];
let tileWindowPos = new Pos(0, 0);
let tileWindowSize = 0;
let cameraPos = new Pos(0, 0);

class Tile {
    // Concrete subclasses of Tile must implement these methods:
    // getSprite
    
    getSpriteMirrorX() {
        return false;
    }
    
    draw(pos) {
        const sprite = this.getSprite();
        if (sprite !== null) {
            sprite.draw(context, pos, pixelSize, this.getSpriteMirrorX());
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
    
    constructor(name = null) {
        super();
        this.name = name;
        this.pos = null;
        this.spriteMirrorX = false;
        this.sprite = new Sprite(entitySpriteSet, 0, 0);
    }
    
    getSprite() {
        return this.sprite;
    }
    
    getSpriteMirrorX() {
        return this.spriteMirrorX;
    }
    
    addToWorld() {
        setChunkTile(this.pos, this);
    }
    
    removeFromWorld() {
        setChunkTile(this.pos, emptyTile);
    }
    
    walk(offset) {
        if (isInBattle) {
            return;
        }
        if (offset.x > 0) {
            this.spriteMirrorX = false;
        } else if (offset.x < 0) {
            this.spriteMirrorX = true;
        }
        const nextPos = this.pos.copy();
        nextPos.add(offset);
        const tile = getChunkTile(nextPos);
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

const localPlayerEntity = new Entity();
let worldEntities = [localPlayerEntity];

const createEntityFromJson = (data) => {
    return new Entity(data.name);
};

const createEntityFromChunkJson = (data) => {
    const output = createEntityFromJson(data);
    output.pos = createPosFromJson(data.pos);
    output.spriteMirrorX = data.spriteMirrorX;
    return output;
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

const getChunkTileIndex = (pos) => {
    const posX = pos.x - tileWindowPos.x;
    const posY = pos.y - tileWindowPos.y;
    if (posX < 0 || posY < 0 || posX >= tileWindowSize || posY >= tileWindowSize) {
        return null;
    } else {
        return posX + posY * tileWindowSize;
    }
};

const getChunkTile = (pos) => {
    const index = getChunkTileIndex(pos);
    if (index === null) {
        return loadingTile;
    } else {
        return chunkTiles[index];
    }
};

const setChunkTile = (pos, tile) => {
    const index = getChunkTileIndex(pos);
    if (index !== null) {
        chunkTiles[index] = tile;
    }
};

const drawWorldTiles = () => {
    const spritePos = new Pos(0, 0);
    const pos = new Pos(0, 0);
    while (spritePos.y < canvasSpriteSize) {
        pos.set(spritePos);
        pos.add(cameraPos);
        const tile = getChunkTile(pos);
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


