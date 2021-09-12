
const colorSet = {
    black: new Color(0, 0, 0),
    white: new Color(255, 255, 255),
    darkGray: new Color(64, 64, 64),
    gray: new Color(128, 128, 128),
    lightGray: new Color(192, 192, 192),
    darkGreen: new Color(0, 128, 0),
    green: new Color(0, 255, 0),
    darkRed: new Color(128, 0, 0),
    red: new Color(255, 0, 0),
};
const spriteSize = 13;
const spriteSheetTileSize = 20;
const spriteSheetSize = spriteSize * spriteSheetTileSize;
let spritesHaveLoaded = false;
const spriteSets = [];
// Contains all sprites without color.
let spriteSheetImage;
let spriteSheetCanvas;
let spriteSheetContext;
let spriteSheetImageData;
let spriteSheetImageDataList;
// Contains a single sprite with color.
let spriteCanvas;
let spriteContext;
let spriteImageData;
let spriteImageDataList;

class ColorPalette {
    
    // Length of colors must equal 3.
    constructor(colors) {
        this.colors = colors;
    }
}

class SpriteSet {
    
    // startIndex and endIndex are inclusive.
    constructor(startIndex, endIndex, palettes) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.palettes = palettes;
        // Map from "(spriteOffset),(paletteIndex)" to image.
        this.spriteImageMap = {};
        spriteSets.push(this);
    }
    
    initializeSprite(spriteIndex, paletteIndex) {
        const { colors } = this.palettes[paletteIndex];
        const posX = (spriteIndex % spriteSheetTileSize) * spriteSize;
        const posY = Math.floor(spriteIndex / spriteSheetTileSize) * spriteSize;
        let offsetX = 0;
        let offsetY = 0;
        while (offsetY < spriteSize) {
            let index = ((posX + offsetX) + (posY + offsetY) * spriteSheetSize) * 4;
            const colorR = spriteSheetImageDataList[index];
            let color;
            if (colorR < 42) {
                color = colors[0];
            } else if (colorR < 127) {
                color = colors[1];
            } else if (colorR < 212) {
                color = colors[2];
            } else {
                color = null;
            }
            index = (offsetX + offsetY * spriteSize) * 4;
            if (color === null) {
                spriteImageDataList[index + 3] = 0;
            } else {
                spriteImageDataList[index] = color.r;
                spriteImageDataList[index + 1] = color.g;
                spriteImageDataList[index + 2] = color.b;
                spriteImageDataList[index + 3] = 255;
            }
            offsetX += 1;
            if (offsetX >= spriteSize) {
                offsetX = 0;
                offsetY += 1;
            }
        }
        spriteContext.putImageData(spriteImageData, 0, 0);
        const image = new Image();
        image.src = spriteCanvas.toDataURL();
        const spriteOffset = spriteIndex - this.startIndex;
        const key = spriteOffset + "," + paletteIndex;
        this.spriteImageMap[key] = image;
    }
    
    initialize() {
        for (let index = this.startIndex; index <= this.endIndex; index++) {
            for (let tempIndex = 0; tempIndex < this.palettes.length; tempIndex++) {
                this.initializeSprite(index, tempIndex);
            }
        }
    }
    
    hasFinishedLoading() {
        for (const key in this.spriteImageMap) {
            const image = this.spriteImageMap[key];
            if (!image.complete) {
                return false;
            }
        }
        return true;
    }
    
    draw(context, pos, spriteOffset, paletteIndex, scale) {
        const key = spriteOffset + "," + paletteIndex;
        const image = this.spriteImageMap[key];
        context.imageSmoothingEnabled = false;
        context.drawImage(
            image,
            pos.x * scale,
            pos.y * scale,
            spriteSize * scale,
            spriteSize * scale
        );
    }
}

const entityEyeColor = colorSet.black;
const entityColorPairs = [
    [colorSet.darkGreen, colorSet.green],
    [colorSet.darkRed, colorSet.red],
]
const entityColorPalettes = entityColorPairs.map((colorPair) => new ColorPalette([
    entityEyeColor, ...colorPair,
]));
const entitySpriteSet = new SpriteSet(20, 20, entityColorPalettes);

const grayColorPalette = new ColorPalette([colorSet.darkGray, colorSet.gray, colorSet.lightGray]);
const loadingSpriteSet = new SpriteSet(0, 0, [grayColorPalette]);
const barrierSpriteSet = new SpriteSet(1, 1, [grayColorPalette]);

class Sprite {
    
    constructor(spriteSet, spriteOffset, paletteIndex) {
        this.spriteSet = spriteSet;
        this.spriteOffset = spriteOffset;
        this.paletteIndex = paletteIndex;
    }
    
    draw(context, pos, scale) {
        this.spriteSet.draw(context, pos, this.spriteOffset, this.paletteIndex, scale);
    }
}

const loadingSprite = new Sprite(loadingSpriteSet, 0, 0);
const barrierSprite = new Sprite(barrierSpriteSet, 0, 0);

const createCanvasWithSprite = (parentTag, sprite, inputPixelSize) => {
    const output = document.createElement("canvas");
    const size = spriteSize * inputPixelSize;
    output.width = size;
    output.height = size;
    output.style.width = size / 2;
    output.style.height = size / 2;
    parentTag.appendChild(output);
    const context = output.getContext("2d");
    sprite.draw(context, new Pos(0, 0), inputPixelSize);
    return output;
};

spriteSetsHaveLoaded = () => spriteSets.every((spriteSet) => spriteSet.hasFinishedLoading());

const initializeSpriteSheet = (done) => {
    
    spriteSheetCanvas = document.createElement("canvas");
    spriteSheetCanvas.width = spriteSheetSize;
    spriteSheetCanvas.height = spriteSheetSize;
    spriteSheetContext = spriteSheetCanvas.getContext("2d");
    
    spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteSize;
    spriteCanvas.height = spriteSize;
    spriteContext = spriteCanvas.getContext("2d");
    
    spriteSheetImage = new Image();
    spriteSheetImage.onload = () => {
        
        spriteSheetContext.drawImage(spriteSheetImage, 0, 0);
        spriteSheetImageData = spriteSheetContext.getImageData(
            0,
            0,
            spriteSheetSize,
            spriteSheetSize
        );
        spriteSheetImageDataList = spriteSheetImageData.data;
        
        spriteImageData = spriteContext.createImageData(spriteSize, spriteSize);
        spriteImageDataList = spriteImageData.data;
        
        for (const spriteSet of spriteSets) {
            spriteSet.initialize();
        }
        
        const loadWaitInterval = setInterval(() => {
            if (spriteSetsHaveLoaded()) {
                clearInterval(loadWaitInterval);
                spritesHaveLoaded = true;
                done();
            }
        }, 100);
    };
    spriteSheetImage.src = "/images/sprites.png";
};


