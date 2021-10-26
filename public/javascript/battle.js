
let battleTurnIndex = null;
let localPlayerHasTurn = false;
let battleIsFinished = false;
let battleTurnTimeout = null;
let battleActionMessages = [];
let battleRewardMessage = null;
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
    const displayMessage = (message) => {
        context.fillText(message, posX, posY);
        posY += 40;
    };
    battleActionMessages.forEach((message) => {
        displayMessage(message);
    });
    let turnMessage;
    if (battleIsFinished) {
        if (opponentEntity === null) {
            turnMessage = "Your opponent logged out!";
        } else {
            const names = [];
            if (localPlayerEntity.isDead()) {
                names.push("You");
            }
            if (opponentEntity.isDead()) {
                names.push(opponentEntity.name);
            }
            if (names.length <= 0) {
                turnMessage = "The battle ended in peace!";
            } else {
                turnMessage = `${names.join(" and ")} passed out!`;
            }
        }
    } else {
        if (localPlayerHasTurn) {
            turnMessage = "It's your turn!";
        } else {
            turnMessage = `Waiting for ${opponentEntity.name}...`;
        }
        if (battleTurnTimeout !== null) {
            turnMessage += ` (Timeout: ${battleTurnTimeout})`;
        }
    }
    displayMessage(turnMessage);
    if (battleRewardMessage !== null) {
        displayMessage(battleRewardMessage);
    }
};


