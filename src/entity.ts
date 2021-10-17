
import { Player, PointsMap, PointsJson, EntityJson, EntityChunkJson, EntityBattleJson } from "./interfaces.js";
import { pointConstants, learnableActionCapacity, tileActionOffsets, chunkWidth, chunkHeight, restAreaWidth, restAreaSpacing, entityColorAmount } from "./constants.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, emptyTile } from "./tile.js";
import { World, Chunk } from "./world.js";
import { Battle } from "./battle.js";
import { Points, TempPoints, PlayerPoints, getMaximumHealth, getLevelUpCost, getPowerMultiplier, getLevelByPower } from "./points.js";
import { Action, LearnableAction, actionList, actionMap, punchAction } from "./action.js";
import { Species, speciesList, speciesMap } from "./species.js";

export const defaultPlayerSpawnPos = new Pos(restAreaWidth - 3, Math.floor(chunkHeight / 2));
let nextEntityId = 0;

export abstract class Entity extends Tile {
    id: number;
    world: World;
    chunk: Chunk;
    pos: Pos;
    spriteMirrorX: boolean;
    points: PointsMap;
    battle: Battle;
    learnedActions: Set<LearnableAction>;
    
    constructor(world: World, pos: Pos) {
        super();
        this.id = nextEntityId;
        nextEntityId += 1;
        this.world = world;
        this.chunk = null;
        this.pos = pos;
        this.spriteMirrorX = false;
        this.battle = null;
        this.learnedActions = new Set();
        // Subclasses should call initialize() in their constructor.
        // This is because createPointsMap() may depend on subclass properties
        // which cannot be populated before the super constructor.
    }
    
    initialize() {
        this.points = this.createPointsMap();
        for (const name in this.points) {
            const points = this.points[name];
            points.name = name;
        }
        this.restoreHealthIfDead();
        this.world.entities.add(this);
        // TODO: Ensure that the tile at this.pos is empty.
        this.addToChunk();
    }
    
    abstract getName(): string;
    
    abstract getLevel(): number;
    
    abstract setLevel(level: number): void;
    
    abstract getScore(): number;
    
    abstract setScore(score: number): void;
    
    abstract getSpecies(): Species;
    
    abstract getColor(): number;
    
    abstract createPointsMap(): PointsMap;
    
    timerEvent(): void {
        // Do nothing.
    }
    
    isInBattleArea(): boolean {
        return this.world.posIsInBattleArea(this.pos);
    }
    
    canOccupyPos(pos: Pos): boolean {
        return true;
    }
    
    canFight(entity: Entity): boolean {
        return (this.isInBattleArea() && entity.isInBattleArea());
    }
    
    bumpEvent(entity: Entity): void {
        super.bumpEvent(entity);
        if (this.canFight(entity)) {
            new Battle(entity, this);
        }
    }
    
    createPointsMapHelper(): PointsMap {
        return {
            energy: new TempPoints(0, pointConstants.maximumEnergy, 0),
            damage: new TempPoints(0, pointConstants.maximumDamage, 0),
        } as unknown as PointsMap;
    }
    
    getMaximumHealth(): number {
        return getMaximumHealth(this.getLevel());
    }
    
    isDead(): boolean {
        return (this.points.health.getEffectiveValue() <= 0);
    }
    
    restoreHealth(): void {
        const healthPoints = this.points.health;
        healthPoints.setValue(healthPoints.maximumValue);
    }
    
    restoreHealthIfDead(): void {
        if (this.isDead()) {
            this.restoreHealth();
        }
    }
    
    useHospital(): void {
        this.restoreHealth();
    }
    
    gainExperience(amount: number): void {
        this.points.experience.offsetValue(amount);
    }
    
    addToChunk(): void {
        if (this.chunk === null) {
            this.chunk = this.world.getChunk(this.pos, true);
            this.chunk.setTile(this.pos, this);
            this.chunk.entities.add(this);
        }
    }
    
    removeFromChunk(): void {
        if (this.chunk !== null) {
            this.chunk.setTile(this.pos, emptyTile);
            this.chunk.entities.delete(this);
            this.chunk = null;
        }
    }
    
    remove(): void {
        if (this.battle !== null) {
            this.points.health.setValue(0);
            this.battle.checkDefeat();
            this.battle.resetTurnStartTime();
            this.leaveBattle();
        }
        this.removeFromChunk();
        this.world.entities.delete(this);
        this.world = null;
    }
    
    walk(offsetIndex: number): void {
        if (this.chunk === null) {
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
        const tile = this.world.getChunkTile(nextPos);
        if (tile instanceof EmptyTile) {
            if (this.canOccupyPos(nextPos)) {
                this.removeFromChunk();
                this.pos.set(nextPos);
                this.addToChunk();
            }
        } else {
            tile.bumpEvent(this);
        }
    }
    
    canPerformAction(action: Action): boolean {
        if (action instanceof LearnableAction && !this.learnedActions.has(action)) {
            return false;
        }
        const energyAmount = this.points.energy.getEffectiveValue();
        return (this.battle !== null && this.battle.entityHasTurn(this)
            && !this.battle.isFinished && energyAmount >= action.energyCost);
    }
    
    canLearnAction(action: LearnableAction): boolean {
        const experienceAmount = this.points.experience.getEffectiveValue();
        return (this.battle === null && !this.learnedActions.has(action)
            && this.learnedActions.size < learnableActionCapacity
            && experienceAmount >= action.getExperienceCost(this)
            && this.getLevel() >= action.minimumLevel);
    }
    
    canForgetAction(action: LearnableAction): boolean {
        return this.learnedActions.has(action);
    }
    
    canLevelUp(): boolean {
        const experienceAmount = this.points.experience.getEffectiveValue();
        return (experienceAmount >= getLevelUpCost(this.getLevel()));
    }
    
    getOpponent(): Entity {
        return this.battle.getOpponent(this);
    }
    
    performAction(action: Action): void {
        if (!this.canPerformAction(action)) {
            return;
        }
        action.perform(this);
        this.battle.message = `${this.getName()} used ${action.name}!`;
        this.battle.finishTurn();
    }
    
    learnAction(action: LearnableAction): void {
        if (!this.canLearnAction(action)) {
            return;
        }
        this.learnedActions.add(action);
        const experienceCost = action.getExperienceCost(this);
        this.points.experience.offsetValue(-experienceCost);
    }
    
    forgetAction(action: LearnableAction): void {
        if (!this.canForgetAction(action)) {
            return;
        }
        this.learnedActions.delete(action);
    }
    
    levelUp(): void {
        if (!this.canLevelUp()) {
            return
        }
        const level = this.getLevel();
        this.setLevel(level + 1);
        const experienceCost = getLevelUpCost(level);
        this.points.experience.offsetValue(-experienceCost);
    }
    
    defeatEvent(): void {
        // Do nothing.
    }
    
    leaveBattleHelper(): void {
        // Do nothing.
    }
    
    leaveBattle(): void {
        if (this.battle === null) {
            return;
        }
        const index = this.battle.entities.indexOf(this);
        this.battle.entities[index] = null;
        this.battle = null;
        this.removeAllPointsBursts();
        this.leaveBattleHelper();
    }
    
    processPointsBursts(): void {
        for (const name in this.points) {
            this.points[name].processBursts();
        }
        this.battle.checkDefeat();
    }
    
    removeAllPointsBursts(): void {
        for (const name in this.points) {
            this.points[name].bursts = [];
        }
    }
    
    populatePointsJson(destination: { [key: string]: PointsJson }, names: string[]): void {
        names.forEach((name) => {
            destination[name] = this.points[name].toJson();
        });
    };
    
    toJson(isLocal: boolean): EntityJson {
        const species = this.getSpecies();
        const color = this.getColor();
        const output = {
            id: this.id,
            name: this.getName(),
            level: this.getLevel(),
            species: (species === null) ? 0 : species.serialInteger,
            color: (color === null) ? 0 : color,
            points: {},
        } as EntityJson;
        if (isLocal) {
            output.isLocal = true;
            this.populatePointsJson(output.points, ["health", "experience", "gold"]);
            output.score = this.getScore();
        }
        return output;
    }
    
    toChunkJson(isLocal: boolean): EntityChunkJson {
        const output = this.toJson(isLocal) as EntityChunkJson;
        output.pos = this.pos.toJson();
        output.spriteMirrorX = this.spriteMirrorX;
        return output;
    }
    
    toBattleJson(isLocal: boolean): EntityBattleJson {
        const output = this.toJson(isLocal) as EntityBattleJson;
        this.populatePointsJson(output.points, ["health", "energy", "damage"]);
        return output;
    }
}

export class EnemyEntity extends Entity {
    level: number;
    species: Species;
    color: number;
    frameCount: number;
    
    constructor(world: World, pos: Pos) {
        super(world, pos);
        const restAreaAmount = 1 + Math.floor(pos.x / restAreaSpacing);
        const centerLevel = 1 + Math.floor((pos.x - restAreaWidth * restAreaAmount) / chunkWidth);
        const centerPower = getPowerMultiplier(centerLevel);
        const getLevelHelper = (scale: number): number => (
            Math.max(1, Math.round(getLevelByPower(centerPower * scale)))
        );
        const minimumLevel = getLevelHelper(0.75);
        const maximumLevel = getLevelHelper(1.25);
        this.level = minimumLevel + Math.floor(Math.random() * (maximumLevel - minimumLevel + 1));
        this.species = speciesList[Math.floor(Math.random() * speciesList.length)];
        this.color = Math.floor(Math.random() * entityColorAmount);
        const possibleActions = actionList.filter((action) => (
            action instanceof LearnableAction && this.level >= action.minimumLevel
        )) as LearnableAction[];
        const actionAmount = Math.min(
            learnableActionCapacity,
            this.level + Math.floor(Math.random() * 3) - 1,
        );
        while (this.learnedActions.size < actionAmount && possibleActions.length > 0) {
            const index = Math.floor(Math.random() * possibleActions.length);
            const action = possibleActions[index];
            possibleActions.splice(index, 1);
            this.learnedActions.add(action);
        }
        this.frameCount = 0;
        this.initialize();
    }
    
    getName(): string {
        return "Enemy";
    }
    
    getLevel(): number {
        return this.level;
    }
    
    setLevel(level: number): void {
        this.level = level;
    }
    
    getScore(): number {
        return 0;
    }
    
    setScore(score: number): void {
        // Do nothing.
    }
    
    getSpecies(): Species {
        return this.species;
    }
    
    getColor(): number {
        return this.color;
    }
    
    createPointsMap(): PointsMap {
        const output = this.createPointsMapHelper();
        const maximumHealth = this.getMaximumHealth();
        let health: number;
        if (Math.random() < 0.5) {
            health = Math.floor((0.5 + 0.5 * Math.random()) * maximumHealth);
        } else {
            health = maximumHealth;
        }
        output.health = new TempPoints(0, maximumHealth, health);
        output.experience = new TempPoints(0, null, 0);
        output.gold = new TempPoints(0, null, Math.floor(Math.random() * 100));
        return output;
    }
    
    leaveBattleHelper(): void {
        super.leaveBattleHelper();
        this.remove();
    }
    
    canOccupyPos(pos: Pos): boolean {
        return this.world.enemyCanOccupyPos(pos);
    }
    
    canFight(entity: Entity): boolean {
        return (super.canFight(entity) && !(entity instanceof EnemyEntity));
    }
    
    findClosestPlayerEntity(): { playerEntity: PlayerEntity, distance: number } {
        let closestPlayerEntity = null;
        let closestDistance = Infinity;
        this.world.iterateOverPlayerEntities((playerEntity) => {
            const distance = playerEntity.pos.getOrthogonalDistance(this.pos);
            if (distance < closestDistance) {
                closestPlayerEntity = playerEntity;
                closestDistance = distance;
            }
        });
        return {
            playerEntity: closestPlayerEntity,
            distance: closestDistance,
        };
    }
    
    walkTowardPos(pos: Pos): void {
        const offsetX = pos.x - this.pos.x;
        const offsetY = pos.y - this.pos.y;
        const shouldWalkHorizontally = (Math.abs(offsetX) > Math.abs(offsetY));
        const offsetIndex = tileActionOffsets.findIndex((offset) => {
            if (shouldWalkHorizontally) {
                return (Math.sign(offset.x) === Math.sign(offsetX));
            } else {
                return (Math.sign(offset.y) === Math.sign(offsetY));
            }
        });
        if (offsetIndex >= 0) {
            this.walk(offsetIndex);
        }
    }
    
    walkRandomly(): void {
        this.walk(Math.floor(Math.random() * tileActionOffsets.length));
    }
    
    performRandomAction(): void {
        const possibleActions = [punchAction];
        this.learnedActions.forEach((action) => {
            if (this.canPerformAction(action)) {
                possibleActions.push(action);
            }
        });
        const index = Math.floor(Math.random() * possibleActions.length);
        this.performAction(possibleActions[index]);
    }
    
    timerEvent(): void {
        this.frameCount += 1;
        if (this.battle === null) {
            const { playerEntity, distance } = this.findClosestPlayerEntity();
            if (distance < 5) {
                if (this.frameCount % 5 === 0) {
                    this.walkTowardPos(playerEntity.pos);
                }
            } else {
                if (this.frameCount % 10 === 0) {
                    this.walkRandomly();
                }
            }
        } else if (this.battle.entityHasTurn(this)) {
            const currentTime = Date.now() / 1000;
            if (currentTime > this.battle.turnStartTime + 1) {
                this.performRandomAction();
            }
        }
    }
}

export class PlayerEntity extends Entity {
    player: Player;
    lastTurnIndex: number;
    
    constructor(world: World, pos: Pos, player: Player) {
        super(world, pos);
        this.player = player;
        this.lastTurnIndex = null;
        this.world.playerEntityMap[this.player.username] = this;
        if (this.getLevel() === null) {
            this.setLevel(5);
        }
        const learnedActionsText = this.player.extraFields.learnedActions;
        if (learnedActionsText !== null) {
            const serialIntegers = JSON.parse(learnedActionsText);
            serialIntegers.forEach((serialInteger) => {
                const action = actionMap[serialInteger];
                if (action instanceof LearnableAction) {
                    this.learnedActions.add(action);
                }
            });
        }
        this.initialize();
    }
    
    getName(): string {
        return this.player.username;
    }
    
    getLevel(): number {
        return this.player.extraFields.level;
    }
    
    setLevel(level: number): void {
        this.player.extraFields.level = level;
    }
    
    getScore(): number {
        return this.player.score;
    }
    
    setScore(score: number): void {
        this.player.score = score;
    }
    
    getSpecies(): Species {
        const serialInteger = this.player.extraFields.species;
        return (serialInteger === null) ? null : speciesMap[serialInteger];
    }
    
    getColor(): number {
        return this.player.extraFields.color;
    }
    
    createPointsMap(): PointsMap {
        const output = this.createPointsMapHelper();
        const maximumHealth = this.getMaximumHealth();
        output.health = new PlayerPoints(
            0, maximumHealth, this.player, "health", maximumHealth,
        );
        output.experience = new PlayerPoints(0, null, this.player, "experience", 0);
        output.gold = new PlayerPoints(0, null, this.player, "gold", 0);
        return output;
    }
    
    useHospital(): void {
        super.useHospital();
        this.player.extraFields.spawnPosX = this.pos.x;
        this.player.extraFields.spawnPosY = this.pos.y;
    }
    
    gainExperience(amount: number): void {
        super.gainExperience(amount);
        this.player.score += amount;
    }
    
    copyPosToExtraFields(): void {
        this.player.extraFields.posX = this.pos.x;
        this.player.extraFields.posY = this.pos.y;
    }
    
    persistEvent(): void {
        const serialIntegers = [];
        this.learnedActions.forEach((action) => {
            serialIntegers.push(action.serialInteger)
        });
        this.player.extraFields.learnedActions = JSON.stringify(serialIntegers);
        this.copyPosToExtraFields();
    }
    
    getSpawnPos(): Pos {
        const { spawnPosX, spawnPosY } = this.player.extraFields;
        if (spawnPosX === null || spawnPosY === null) {
            return defaultPlayerSpawnPos;
        } else {
            return new Pos(spawnPosX, spawnPosY);
        }
    }
    
    defeatEvent(): void {
        super.defeatEvent();
        this.pos.set(this.getSpawnPos());
    }
    
    leaveBattleHelper(): void {
        super.leaveBattleHelper();
        this.restoreHealthIfDead();
        this.addToChunk();
    }
    
    bindAction(serialNumber: number, keyNumber: number): void {
        const keySerialNumbersText = this.player.extraFields.keyActions;
        let keySerialNumbers: number[];
        if (keySerialNumbersText === null) {
            keySerialNumbers = [];
        } else {
            keySerialNumbers = JSON.parse(keySerialNumbersText);
        }
        while (keySerialNumbers.length < keyNumber + 1) {
            keySerialNumbers.push(null);
        }
        keySerialNumbers[keyNumber] = serialNumber;
        this.player.extraFields.keyActions = JSON.stringify(keySerialNumbers);
    }
    
    remove(): void {
        delete this.world.playerEntityMap[this.player.username];
        this.copyPosToExtraFields();
        super.remove();
    }
}


