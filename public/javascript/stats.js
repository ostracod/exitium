
const pointsAbbreviationMap = {
    health: "HP",
    energy: "EP",
    damage: "DP",
    experience: "XP",
    gold: "GP",
};
let pointConstants;

const getPowerMultiplier = (level) => (
    pointConstants.powerMultiplierCoefficient * level + pointConstants.powerMultiplierBase ** level - pointConstants.powerMultiplierOffset
)

const getExperienceMultiplier = (level) => pointConstants.experienceMultiplierOffset + level;

const getLevelUpCost = (level) => (
    Math.round(getExperienceMultiplier(level) * pointConstants.levelUpCostBase ** level)
);

const getActionLearnCost = (level) => (
    Math.round(pointConstants.actionLearnCostCoefficient * getExperienceMultiplier(level) * (level + pointConstants.actionLearnCostOffset))
);

const levelUp = () => {
    if (localPlayerEntity !== null && localPlayerEntity.canLevelUp()) {
        messenger.levelUp();
    }
}

const displayLocalPlayerStats = () => {
    ["level", "experience", "health", "maximumHealth", "gold", "score"].forEach((name) => {
        const value = localPlayerEntity[name];
        document.getElementById("localPlayer" + capitalize(name)).innerHTML = value;
    });
    document.getElementById("levelUpCost").innerHTML = localPlayerEntity.getLevelUpCost();
    const tag = document.getElementById("levelUpButton");
    tag.className = localPlayerEntity.canLevelUp() ? "" : "redButton";
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


