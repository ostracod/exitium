
let tileSerialIntegers;
let maximumEnergyPoints;
let maximumDamagePoints;
// Map from serial integer to Tile.
let tileMap;
let chunkTiles = [];
let chunkWindowPos = new Pos(0, 0);
let chunkWindowSize = 0;
let cameraPos = new Pos(0, 0);
let worldEntities = [];
let localPlayerEntity = null;
let opponentEntity = null;

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
    
    constructor(name, level) {
        super();
        this.name = name;
        this.level = level;
        this.pos = null;
        this.sprite = new Sprite(entitySpriteSet, 0, 0);
        this.spriteMirrorX = null;
        
        this.health = null;
        this.maximumHealth = null;
        this.energy = null;
        this.damage = null;
        this.experience = null;
        this.gold = null;
        this.score = null;
    }
    
    readHealthFromJson(data) {
        this.health = data.health;
        this.maximumHealth = data.maximumHealth;
    }
    
    isDead() {
        return (this.health <= 0);
    }
    
    getSprite() {
        return this.sprite;
    }
    
    getSpriteMirrorX() {
        return this.spriteMirrorX;
    }
    
    addToChunk() {
        setChunkTile(this.pos, this);
    }
    
    removeFromChunk() {
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
            this.removeFromChunk();
            this.pos.set(nextPos);
            this.addToChunk();
        }
    }
    
    getScreenPos() {
        if (isInBattle) {
            return this.pos.copy();
        } else {
            const output = this.pos.copy();
            output.subtract(cameraPos);
            output.scale(spriteSize);
            return output;
        }
    }
    
    drawSprite() {
        const pos = this.getScreenPos();
        this.draw(pos);
    }
    
    drawName() {
        if (this.name === null) {
            return;
        }
        const pos = this.getScreenPos();
        pos.scale(pixelSize);
        pos.x += spritePixelSize / 2;
        pos.y -= spritePixelSize / 5;
        context.font = "bold 30px Arial";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillStyle = "#000000";
        context.fillText(
            `${this.name} (${this.level})`,
            Math.floor(pos.x),
            Math.floor(pos.y),
        );
    }
    
    drawStats(posX) {
        const posY = canvasHeight / 3;
        context.font = "bold 30px Arial";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        drawPoints("HP", this.health, this.maximumHealth, posX, posY - 80);
        drawPoints("EP", this.energy, maximumEnergyPoints, posX, posY - 40);
        drawPoints("DP", this.damage, maximumDamagePoints, posX, posY);
    }
}

const loadingTile = new LoadingTile();
const emptyTile = new EmptyTile();
const barrier = new Barrier();

const addEntityFromJsonHelper = (data) => {
    if (data === null) {
        return null;
    }
    const output = new Entity(data.name, data.level);
    const { isLocal } = data;
    if (typeof isLocal !== "undefined" && isLocal) {
        output.readHealthFromJson(data);
        output.experience = data.experience;
        output.gold = data.gold;
        output.score = data.score;
        localPlayerEntity = output;
        displayLocalPlayerStats();
    }
    worldEntities.push(output);
    return output;
};

const addEntityFromChunkJson = (data) => {
    const entity = addEntityFromJsonHelper(data);
    if (entity === null) {
        return null;
    }
    entity.pos = createPosFromJson(data.pos);
    entity.spriteMirrorX = data.spriteMirrorX;
    entity.addToChunk();
};

const addEntityFromBattleJson = (data) => {
    const entity = addEntityFromJsonHelper(data);
    if (entity === null) {
        return null;
    }
    entity.readHealthFromJson(data);
    entity.energy = data.energy;
    entity.damage = data.damage;
    if (entity !== localPlayerEntity) {
        opponentEntity = entity;
    }
};

const addEntitiesFromJson = (dataList, handle) => {
    worldEntities = [];
    opponentEntity = null;
    dataList.forEach((data) => {
        handle(data);
    });
};

const updateCameraPos = () => {
    if (localPlayerEntity === null) {
        return;
    }
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

const updateBattleAnimations = () => {
    const centerPosY = Math.round((canvasPixelSize - spriteSize) / 2);
    
    localPlayerEntity.pos = new Pos(
        Math.round(canvasPixelSize / 3 - spriteSize / 2),
        centerPosY,
    );
    localPlayerEntity.spriteMirrorX = false;
    
    if (opponentEntity !== null) {
        opponentEntity.pos = new Pos(
            Math.round(2 * canvasPixelSize / 3 - spriteSize / 2),
            centerPosY,
        );
        opponentEntity.spriteMirrorX = true;
    }
};

const drawEntitySprites = () => {
    worldEntities.forEach((entity) => {
        entity.drawSprite();
    });
};

const drawEntityNames = () => {
    worldEntities.forEach((entity) => {
        entity.drawName();
    });
};

const displayLocalPlayerStats = () => {
    ["level", "experience", "health", "maximumHealth", "gold", "score"].forEach((name) => {
        const value = localPlayerEntity[name];
        document.getElementById("localPlayer" + capitalize(name)).innerHTML = value;
    });
};

const drawPoints = (name, value, maximumValue, posX, posY) => {
    const ratio = value / maximumValue;
    if (ratio <= 0.2) {
        context.fillStyle = "#FF0000";
    } else if (ratio >= 0.8) {
        context.fillStyle = "#00AA00";
    } else {
        context.fillStyle = "#000000";
    }
    context.fillText(`${name}: ${value} / ${maximumValue}`, posX, posY);
};

const drawBattleStats = () => {
    localPlayerEntity.drawStats(canvasWidth / 6);
    if (opponentEntity !== null) {
        opponentEntity.drawStats(5 * canvasWidth / 6);
    }
};

const displayLocalPlayerPos = () => {
    if (localPlayerEntity === null) {
        return null;
    }
    const { pos } = localPlayerEntity;
    document.getElementById("localPlayerPosX").innerHTML = pos.x;
    document.getElementById("localPlayerPosY").innerHTML = pos.y;
};

const localPlayerWalk = (offset, shouldSendCommand = true) => {
    if (localPlayerEntity === null) {
        return;
    }
    localPlayerEntity.walk(offset);
    if (shouldSendCommand) {
        messenger.walk(offset);
    }
};


