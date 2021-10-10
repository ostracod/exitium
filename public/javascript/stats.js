
const pointsAbbreviationMap = {
    health: "HP",
    energy: "EP",
    damage: "DP",
    experience: "XP",
    gold: "GP",
};
let pointConstants;

class PointsBurst {
    
    constructor(data) {
        this.offset = data.offset;
        this.turnCount = data.turnCount;
    }
}

class Points {
    
    constructor(data) {
        this.value = data.value;
        this.maximumValue = data.maximumValue;
        this.bursts = data.bursts.map((burstData) => new PointsBurst(burstData));
    }
}

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
    const nameValueMap = {
        maximumHealth: localPlayerEntity.points.health.maximumValue,
    };
    ["level", "score"].forEach((name) => {
        nameValueMap[name] = localPlayerEntity[name];
    });
    ["experience", "health", "gold"].forEach((name) => {
        nameValueMap[name] = localPlayerEntity.points[name].value;
    });
    for (const name in nameValueMap) {
        const value = nameValueMap[name];
        document.getElementById("localPlayer" + capitalize(name)).innerHTML = value;
    }
    document.getElementById("levelUpCost").innerHTML = localPlayerEntity.getLevelUpCost();
    const tag = document.getElementById("levelUpButton");
    tag.className = localPlayerEntity.canLevelUp() ? "" : "redButton";
};


