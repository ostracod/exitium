
let speciesList;
let speciesMap;
let speciesRequestStartPos = null;
const speciesRequestSpacing = new Pos(18, 30);
let selectedSpecies = null;
let selectedEntityColor = null;
let speciesRequestButtonBounds = null;
let tileActionOffsets;
let worldEntities = [];
let localPlayerEntity = null;
let opponentEntity = null;

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
        if (gameMode !== gameModes.chunk) {
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
        if (gameMode === gameModes.chunk) {
            const output = this.pos.copy();
            output.subtract(cameraPos);
            output.scale(spriteSize);
            return output;
        } else {
            return this.pos.copy();
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

const initializeSpeciesMap = () => {
    speciesMap = {};
    speciesList.forEach((species) => {
        speciesMap[species.serialInteger] = species;
    });
}

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

const drawSpeciesRequest = () => {
    if (speciesRequestStartPos === null) {
        speciesRequestStartPos = new Pos(
            Math.floor((canvasPixelSize - ((entityColorAmount - 1) * speciesRequestSpacing.x + spriteSize)) / 2),
            42,
        );
    }
    context.font = "bold 40px Arial";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    const titlePosY = 120;
    context.fillText(
        "SELECT YOUR CHARACTER",
        speciesRequestStartPos.x * pixelSize,
        titlePosY,
    );
    context.font = "30px Arial";
    const pos = new Pos(0, 0);
    for (let species = 0; species < speciesAmount; species++) {
        pos.y = speciesRequestStartPos.y + species * speciesRequestSpacing.y;
        const { name, description } = speciesList[species];
        context.fillStyle = "#000000";
        context.fillText(
            `${capitalize(name)} \u2013 ${description}`,
            speciesRequestStartPos.x * pixelSize,
            pos.y * pixelSize - 50,
        );
        for (let color = 0; color < entityColorAmount; color++) {
            pos.x = speciesRequestStartPos.x + color * speciesRequestSpacing.x;
            if (species === selectedSpecies && color === selectedEntityColor) {
                const squareSize1 = (spriteSize + 4) * pixelSize;
                const squareSize2 = (spriteSize + 2) * pixelSize;
                context.fillStyle = "#000000";
                context.fillRect(
                    (pos.x - 2) * pixelSize, (pos.y - 2) * pixelSize,
                    squareSize1, squareSize1,
                );
                context.fillStyle = "#FFFFFF";
                context.fillRect(
                    (pos.x - 1) * pixelSize, (pos.y - 1) * pixelSize,
                    squareSize2, squareSize2,
                );
            }
            entitySpriteSet.draw(context, pos, species, color, pixelSize, false);
        }
    }
    if (selectedSpecies !== null && selectedEntityColor !== null) {
        speciesRequestButtonBounds = drawButton(new Pos(922, titlePosY), "Confirm");
    } else {
        speciesRequestButtonBounds = null;
    }
}

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

const speciesRequestClickEvent = (pos) => {
    pos.scale(2);
    const pixelPosX = pos.x / pixelSize;
    const pixelPosY = pos.y / pixelSize;
    if (speciesRequestStartPos === null) {
        return;
    }
    const offsetX = pixelPosX - speciesRequestStartPos.x;
    const offsetY = pixelPosY - speciesRequestStartPos.y;
    const color = Math.floor(offsetX / speciesRequestSpacing.x);
    const species = Math.floor(offsetY / speciesRequestSpacing.y);
    if (species >= 0 && species < speciesAmount && color >= 0 && color < entityColorAmount
            && offsetX % speciesRequestSpacing.x < spriteSize
            && offsetY % speciesRequestSpacing.y < spriteSize) {
        selectedSpecies = species;
        selectedEntityColor = color;
    }
    if (speciesRequestButtonBounds !== null
            && posIsInBounds(pos, speciesRequestButtonBounds)
            && selectedSpecies !== null && selectedEntityColor !== null) {
        messenger.setSpecies(selectedSpecies, selectedEntityColor);
    }
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


