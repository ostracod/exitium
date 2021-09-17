
let tileSerialIntegers;
// Map from serial integer to Tile.
let tileMap;
let worldTiles = [];
let tileWindowPos = new Pos(0, 0);
let tileWindowSize = 0;
let cameraPos = new Pos(-10, -5);

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

const loadingTile = new LoadingTile();
const emptyTile = new EmptyTile();
const barrier = new Barrier();

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

const drawWorldTiles = () => {
    const spritePos = new Pos(0, 0);
    const pos = new Pos(0, 0);
    while (spritePos.y < canvasSpriteSize) {
        pos.set(spritePos);
        pos.add(cameraPos);
        pos.subtract(tileWindowPos);
        let tile;
        if (pos.x >= 0 && pos.y >= 0 && pos.x < tileWindowSize && pos.y < tileWindowSize) {
            tile = worldTiles[pos.x + pos.y * tileWindowSize];
        } else {
            tile = loadingTile;
        }
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


