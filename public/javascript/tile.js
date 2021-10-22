
let tileSerialIntegers;
let restAreaWidth;
let restAreaSpacing;
// Map from serial integer to Tile.
let tileMap;
// Map from sprite ID to Block.
const blockMap = {};
let chunkTiles = [];
let chunkWindowPos = new Pos(0, 0);
let chunkWindowSize = 0;
let cameraPos = new Pos(0, 0);

class Tile {
    // Concrete subclasses of Tile must implement these methods:
    // getSprite
    
    getSerialInteger() {
        return tileSerialIntegers.empty;
    }
    
    entityCanPlace(entity) {
        return false;
    }
    
    entityCanRemove(entity) {
        return false;
    }
    
    entityPlaceEvent(entity) {
        // Do nothing.
    }
    
    entityRemoveEvent(entity) {
        // Do nothing.
    }
    
    walkShouldRemove() {
        return false;
    }
    
    getSpriteMirrorX() {
        return false;
    }
    
    draw(pos) {
        const sprite = this.getSprite();
        if (sprite !== null) {
            sprite.draw(context, pos, pixelSize, this.getSpriteMirrorX());
        }
    }
    
    serialize() {
        const serialInteger = this.getSerialInteger();
        if (serialInteger === null) {
            return null;
        }
        return serialInteger.toString(16).padStart(2, "0");
    }
}

class LoadingTile extends Tile {
    
    getSprite() {
        return loadingSprite;
    }
}

class EmptyTile extends Tile {
    
    entityCanPlace(entity) {
        return true;
    }
    
    entityCanRemove(entity) {
        return true;
    }
    
    getSprite() {
        return null;
    }
}

class Barrier extends Tile {
    
    getSerialInteger() {
        return tileSerialIntegers.barrier;
    }
    
    getSprite() {
        return barrierSprite;
    }
}

class Block extends Tile {
    
    constructor(spriteId) {
        super();
        this.spriteId = spriteId;
        this.sprite = new Sprite(blockSpriteSet, 0, this.spriteId)
    }
    
    getSerialInteger() {
        return tileSerialIntegers.block;
    }
    
    entityCanPlace(entity) {
        return true;
    }
    
    entityCanRemove(entity) {
        return true;
    }
    
    getSprite() {
        return this.sprite;
    }
    
    serialize() {
        return super.serialize() + this.spriteId.toString(16).padStart(8, "0");
    }
}

class Hospital extends Tile {
    
    getSerialInteger() {
        return tileSerialIntegers.hospital;
    }
    
    getSprite() {
        return hospitalSprite;
    }
}

class GoldTile extends Tile {
    
    getSerialInteger() {
        return tileSerialIntegers.gold;
    }
    
    getSprite() {
        return goldSprite;
    }
    
    entityCanPlace(entity) {
        return (entity.points.gold.value > 0);
    }
    
    entityCanRemove(entity) {
        return true;
    }
    
    entityPlaceEvent(entity) {
        entity.points.gold.value -= 1;
        if (entity === localPlayerEntity) {
            displayLocalPlayerStats();
        }
    }
    
    entityRemoveEvent(entity) {
        entity.points.gold.value += 1;
        if (entity === localPlayerEntity) {
            displayLocalPlayerStats();
        }
    }
    
    walkShouldRemove() {
        return true;
    }
}

const loadingTile = new LoadingTile();
const emptyTile = new EmptyTile();
const barrier = new Barrier();
const hospital = new Hospital();
const goldTile = new GoldTile();

const getBlock = (spriteId) => {
    if (!(spriteId in blockMap)) {
        blockMap[spriteId] = new Block(spriteId);
    }
    return blockMap[spriteId];
};

const updateCameraPos = () => {
    cameraPos.set(localPlayerEntity.pos);
    const tempOffset = Math.floor(canvasSpriteSize / 2);
    cameraPos.x -= tempOffset;
    cameraPos.y -= tempOffset;
};

const drawRestAreaBoundaries = () => {
    for (let offsetX = 0; offsetX <= canvasSpriteSize; offsetX += 1) {
        const worldPosX = cameraPos.x + offsetX;
        if (worldPosX <= 0) {
            continue;
        }
        const screenPosX = offsetX * spritePixelSize;
        const restPosX = worldPosX % restAreaSpacing;
        let color1 = null;
        let color2 = null;
        if (restPosX === 0) {
            color1 = "#FF0000";
            color2 = "#00CC00";
        } else if (restPosX === restAreaWidth) {
            color1 = "#00CC00";
            color2 = "#FF0000";
        }
        if (color1 !== null) {
            const lineWidth = pixelSize * 3;
            context.fillStyle = color1;
            context.fillRect(screenPosX - lineWidth, 0, lineWidth, canvasHeight);
            context.fillStyle = color2;
            context.fillRect(screenPosX, 0, lineWidth, canvasHeight);
        }
    }
};

const initializeTileMap = () => {
    tileMap = {
        [tileSerialIntegers.empty]: emptyTile,
        [tileSerialIntegers.barrier]: barrier,
        [tileSerialIntegers.hospital]: hospital,
        [tileSerialIntegers.gold]: goldTile,
    };
};

const deserializeTiles = (text) => {
    const output = [];
    let index = 0;
    while (index < text.length) {
        const tempText = text.substring(index, index + 2);
        index += 2;
        const serialInteger = parseInt(tempText, 16);
        let tile;
        if (serialInteger === tileSerialIntegers.block) {
            const tempText = text.substring(index, index + 8);
            index += 8;
            tile = getBlock(parseInt(tempText, 16));
        } else {
            tile = tileMap[serialInteger];
        }
        output.push(tile);
    }
    return output;
};

const getChunkTileIndex = (pos) => {
    const posX = pos.x - chunkWindowPos.x;
    const posY = pos.y - chunkWindowPos.y;
    if (posX < 0 || posY < 0 || posX >= chunkWindowSize || posY >= chunkWindowSize) {
        return null;
    } else {
        return posX + posY * chunkWindowSize;
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

const drawChunkTiles = () => {
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


