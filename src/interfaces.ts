
import { PlayerEntity } from "./entity.js";
import { Messenger } from "./gameDelegate.js";
import { Points } from "./points.js";

export interface Player {
    username: string;
    score: number;
    extraFields: {
        level: number,
        health: number,
        experience: number,
        gold: number,
        learnedActions: string,
        keyActions: string,
    };
}

export interface PointsMap {
    health: Points;
    energy: Points;
    damage: Points;
    experience: Points;
    gold: Points;
}

export interface PosJson {
    x: number;
    y: number;
}

export interface PointsBurstJson {
    offset: number;
    turnCount: number;
}

export interface PointsJson {
    value: number;
    maximumValue: number;
    bursts: PointsBurstJson[];
}

export interface EntityJson {
    id: number;
    name: string;
    level: number;
    isLocal?: boolean; // Default value is false.
    // health, experience, gold, and score will be
    // transmitted if isLocal is true.
    points: {
        [key: string]: PointsJson,
        health?: PointsJson,
        experience?: PointsJson,
        gold?: PointsJson,
    };
    score?: number;
}

export interface EntityChunkJson extends EntityJson {
    pos: PosJson;
    spriteMirrorX: boolean;
}

export interface EntityBattleJson extends EntityJson {
    points: {
        health: PointsJson,
        energy: PointsJson,
        damage: PointsJson,
    };
}

export interface PointsOffsetJson {
    name: string;
}

export interface AbsolutePointsOffsetJson extends PointsOffsetJson {
    value: number;
}

export interface RatioPointsOffsetJson extends PointsOffsetJson {
    ratio: number;
}

export interface PowerPointsOffsetJson extends PointsOffsetJson {
    scale: number;
}

export interface EffectContextJson {
    performerId: number;
    damage: number;
}

export interface EffectJson {
    name: string;
}

export interface PointsEffectJson extends EffectJson {
    pointsName: string;
}

export interface SinglePointsEffectJson extends PointsEffectJson {
    applyToOpponent: boolean;
}

export interface SetPointsEffectJson extends SinglePointsEffectJson {
    value: number;
}

export interface OffsetPointsEffectJson extends SinglePointsEffectJson {
    offset: PointsOffsetJson;
}

export interface BurstPointsEffectJson extends OffsetPointsEffectJson {
    turnAmount: number;
}

export interface TransferPointsEffectJson extends PointsEffectJson {
    opponentIsSource: boolean;
    efficiency: number;
    offset: PointsOffsetJson;
}

export interface LingerEffectJson extends EffectJson {
    turnAmount: number;
    effect: EffectJson;
}

export interface ClearStatusEffectJson extends EffectJson {
    pointsName: string;
    applyToOpponent: boolean;
    direction: number;
}

export interface LingerStateJson {
    context: EffectContextJson;
    effect: EffectJson;
    turnCount: number;
}

export interface ActionJson {
    serialInteger: number;
    name: string;
    energyCost: number;
    effect: EffectJson;
}

export interface LearnableActionJson extends ActionJson {
    minimumLevel: number;
}

export interface ClientCommand {
    commandName: string;
}

export interface GetStateClientCommand extends ClientCommand {
    turnIndex?: number;
}

export interface WalkClientCommand extends ClientCommand {
    offset: PosJson;
}

export interface ActionClientCommand extends ClientCommand {
    serialInteger: number;
}

export interface BindActionClientCommand extends ActionClientCommand {
    keyNumber: number;
}

export interface SetBattleStateClientCommand extends ClientCommand {
    turnIndex: number;
    localPlayerHasTurn: boolean;
    isFinished: boolean;
    turnTimeout: number;
    lingerStates: LingerStateJson[];
    message?: string;
}

export type CommandListener = (messenger: Messenger) => void | Promise<void>;


