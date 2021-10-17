
let tileActionOffsets;
let tileSerialIntegers;
let restAreaWidth;
let restAreaSpacing;
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

class Hospital extends Tile {
    
    getSprite() {
        return hospitalSprite;
    }
}

class Entity extends Tile {
    
    constructor(data) {
        super();
        this.id = data.id;
        this.name = data.name;
        this.level = data.level;
        this.species = data.species;
        this.color = data.color;
        this.pos = null;
        this.sprite = new Sprite(entitySpriteSet, this.species, this.color);
        this.spriteMirrorX = null;
        
        this.points = {};
        this.score = null;
    }
    
    isDead() {
        return (this.points.health.value <= 0);
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
    
    walk(offsetIndex) {
        if (isInBattle) {
            return;
        }
        const offset = tileActionOffsets[offsetIndex];
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
    
    getLevelUpCost() {
        return getLevelUpCost(this.level);
    }
    
    canLevelUp() {
        return (this.points.experience.value >= this.getLevelUpCost());
    }
    
    getOpponent() {
        return (this === localPlayerEntity) ? opponentEntity : localPlayerEntity;
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
    
    getStatusEffectsDescription() {
        const output = [];
        lingerStates.forEach((state) => {
            const description = state.getShortDescription(this);
            description.forEach((text) => {
                const turnExpression = getNumberExpression(state.turnCount, "turn");
                output.push(text + ` (${turnExpression})`);
            });
        });
        for (const name in this.points) {
            const points = this.points[name];
            points.bursts.forEach((burst) => {
                const verb = capitalize(burst.getVerb());
                const abbreviation = pointsAbbreviationMap[name];
                const offsetText = Math.abs(burst.offset);
                const turnExpression = getNumberExpression(burst.turnCount, "turn");
                output.push(`${verb} ${abbreviation} by ${offsetText} (${turnExpression})`);
            });
        }
        return output;
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
    
    drawPoints(name, posX, posY) {
        const points = this.points[name];
        const ratio = points.value / points.maximumValue;
        if (ratio <= 0.2) {
            context.fillStyle = "#FF0000";
        } else if (ratio >= 0.8) {
            context.fillStyle = "#00AA00";
        } else {
            context.fillStyle = "#000000";
        }
        const abbreviation = pointsAbbreviationMap[name];
        context.fillText(`${abbreviation}: ${points.value} / ${points.maximumValue}`, posX, posY);
    };
    
    drawStats(posX) {
        let posY = canvasHeight / 3;
        context.font = "bold 30px Arial";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        ["damage", "energy", "health"].forEach((name) => {
            this.drawPoints(name, posX, posY);
            posY -= 40;
        });
        posY -= 40;
        context.font = "30px Arial";
        context.fillStyle = "#000000";
        const description = this.getStatusEffectsDescription();
        description.forEach((text) => {
            context.fillText(text, posX, posY);
            posY -= 40;
        });
    }
}

const loadingTile = new LoadingTile();
const emptyTile = new EmptyTile();
const barrier = new Barrier();
const hospital = new Hospital();

const addEntityFromJsonHelper = (data) => {
    if (data === null) {
        return null;
    }
    const output = new Entity(data);
    for (const name in data.points) {
        const points = new Points(data.points[name]);
        points.name = name;
        output.points[name] = points;
    }
    const { isLocal } = data;
    if (typeof isLocal !== "undefined" && isLocal) {
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
        return;
    }
    entity.pos = createPosFromJson(data.pos);
    entity.spriteMirrorX = data.spriteMirrorX;
    entity.addToChunk();
};

const addEntityFromBattleJson = (data) => {
    const entity = addEntityFromJsonHelper(data);
    if (entity === null) {
        return;
    }
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

const getEntityById = (id) => worldEntities.find((entity) => (entity.id === id));

const updateCameraPos = () => {
    if (localPlayerEntity === null) {
        return;
    }
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

const displayLocalPlayerPos = () => {
    if (localPlayerEntity === null) {
        return null;
    }
    const { pos } = localPlayerEntity;
    document.getElementById("localPlayerPosX").innerHTML = pos.x;
    document.getElementById("localPlayerPosY").innerHTML = pos.y;
};

const localPlayerWalk = (offsetIndex, shouldSendCommand = true) => {
    if (localPlayerEntity === null) {
        return;
    }
    localPlayerEntity.walk(offsetIndex);
    if (shouldSendCommand) {
        messenger.walk(offsetIndex);
    }
};

const performTileAction = (offsetX, offsetY) => {
    const offsetIndex = tileActionOffsets.findIndex((offset) => (
        Math.sign(offset.x) === Math.sign(offsetX)
            && Math.sign(offset.y) === Math.sign(offsetY)
    ));
    if (offsetIndex < 0) {
        return;
    }
    localPlayerWalk(offsetIndex);
};


