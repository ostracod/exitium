
let battleTurnIndex = null;
let localPlayerHasTurn = false;
let battleIsFinished = false;
let battleTurnTimeout = null;
let battleMessages = [];
let lingerStates = [];

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

const drawBattleStats = () => {
    localPlayerEntity.drawStats(canvasWidth / 4);
    if (opponentEntity !== null) {
        opponentEntity.drawStats(3 * canvasWidth / 4);
    }
};

const drawBattleSubtitles = () => {
    context.font = "30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    const posX = canvasWidth / 2;
    let posY = 2 * canvasHeight / 3;
    battleMessages.forEach((message) => {
        context.fillText(message, posX, posY);
        posY += 40;
    });
    let subtitle;
    if (battleIsFinished) {
        if (opponentEntity === null) {
            subtitle = "Your opponent logged out!";
        } else {
            const names = [];
            if (localPlayerEntity.isDead()) {
                names.push("You");
            }
            if (opponentEntity.isDead()) {
                names.push(opponentEntity.name);
            }
            subtitle = `${names.join(" and ")} passed out!`;
        }
    } else {
        if (localPlayerHasTurn) {
            subtitle = "It's your turn!";
        } else {
            subtitle = `Waiting for ${opponentEntity.name}...`;
        }
        if (battleTurnTimeout !== null) {
            subtitle += ` (Timeout: ${battleTurnTimeout})`;
        }
    }
    context.fillText(subtitle, posX, posY);
};


