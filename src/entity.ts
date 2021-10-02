
import { Player, PointsMap, EntityJson, EntityChunkJson, EntityBattleJson } from "./interfaces.js";
import { pointConstants } from "./constants.js";
import { Pos } from "./pos.js";
import { Tile, EmptyTile, emptyTile } from "./tile.js";
import { World, Chunk } from "./world.js";
import { Battle } from "./battle.js";
import { Points, TempPoints, PlayerPoints, getMaximumHealth, getLevelUpCost } from "./points.js";
import { Action, LearnableAction, actionList, actionMap } from "./action.js";

export abstract class Entity extends Tile {
    world: World;
    chunk: Chunk;
    pos: Pos;
    spriteMirrorX: boolean;
    points: PointsMap;
    battle: Battle;
    learnedActions: Set<LearnableAction>;
    
    constructor(world: World, pos: Pos) {
        super();
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
    
    abstract createPointsMap(): PointsMap;
    
    timerEvent(): void {
        // Do nothing.
    }
    
    isInBattleArea(): boolean {
        return this.world.posIsInBattleArea(this.pos);
    }
    
    bumpEvent(entity: Entity): void {
        super.bumpEvent(entity);
        if (this.isInBattleArea() && entity.isInBattleArea()) {
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
        return (this.points.health.getValue() <= 0);
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
    
    walk(offset: Pos): void {
        if (this.chunk === null) {
            return;
        }
        if (offset.x > 0) {
            this.spriteMirrorX = false;
        } else if (offset.x < 0) {
            this.spriteMirrorX = true;
        }
        const nextPos = this.pos.copy();
        nextPos.add(offset);
        const tile = this.world.getChunkTile(nextPos);
        if (tile instanceof EmptyTile) {
            this.removeFromChunk();
            this.pos.set(nextPos);
            this.addToChunk();
        } else {
            tile.bumpEvent(this);
        }
    }
    
    canPerformAction(action: Action): boolean {
        if (action instanceof LearnableAction && !this.learnedActions.has(action)) {
            return false;
        }
        return (this.battle !== null && this.battle.entityHasTurn(this)
            && !this.battle.isFinished && this.points.energy.getValue() >= action.energyCost);
    }
    
    canLearnAction(action: LearnableAction): boolean {
        return (this.battle === null && !this.learnedActions.has(action)
            && this.points.experience.getValue() >= action.getExperienceCost(this));
    }
    
    canForgetAction(action: LearnableAction): boolean {
        return this.learnedActions.has(action);
    }
    
    canLevelUp(): boolean {
        return (this.points.experience.getValue() >= getLevelUpCost(this.getLevel()));
    }
    
    performAction(action: Action): void {
        if (!this.canPerformAction(action)) {
            return;
        }
        const opponent = this.battle.getOpponent(this);
        action.perform(this, opponent);
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
        this.leaveBattleHelper();
    }
    
    addHealthToJson(data: EntityJson): void {
        const healthPoints = this.points.health;
        data.health = healthPoints.getValue();
        data.maximumHealth = healthPoints.maximumValue;
    }
    
    toJson(isLocal: boolean): EntityJson {
        const output = {
            name: this.getName(),
            level: this.getLevel(),
        } as EntityJson;
        if (isLocal) {
            output.isLocal = true;
            this.addHealthToJson(output);
            output.experience = this.points.experience.getValue();
            output.gold = this.points.gold.getValue();
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
        this.addHealthToJson(output);
        output.energy = this.points.energy.getValue();
        output.damage = this.points.damage.getValue();
        return output;
    }
}

export class EnemyEntity extends Entity {
    level: number;
    
    constructor(world: World, pos: Pos) {
        super(world, pos);
        // TODO: Enemy level should depend on spawn pos.
        this.level = 3;
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
    
    timerEvent(): void {
        if (this.battle !== null && this.battle.entityHasTurn(this)) {
            const currentTime = Date.now() / 1000;
            if (currentTime > this.battle.turnStartTime + 1) {
                const action = actionList[Math.floor(Math.random() * 2) * 3];
                this.performAction(action);
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
    
    getScore(): number {
        return this.player.score;
    }
    
    setScore(score: number): void {
        this.player.score = score;
    }
    
    setLevel(level: number): void {
        this.player.extraFields.level = level;
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
    
    gainExperience(amount: number): void {
        super.gainExperience(amount);
        this.player.score += amount;
    }
    
    persistEvent(): void {
        const serialIntegers = [];
        this.learnedActions.forEach((action) => {
            serialIntegers.push(action.serialInteger)
        });
        this.player.extraFields.learnedActions = JSON.stringify(serialIntegers);
    }
    
    defeatEvent(): void {
        super.defeatEvent();
        this.pos.x = 64;
        this.pos.y = 3;
    }
    
    leaveBattleHelper(): void {
        super.leaveBattleHelper();
        this.restoreHealthIfDead();
        this.addToChunk();
    }
    
    remove(): void {
        delete this.world.playerEntityMap[this.player.username];
        super.remove();
    }
}


