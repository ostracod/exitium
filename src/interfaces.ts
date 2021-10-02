
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

export interface EntityJson {
    name: string;
    level: number;
    isLocal?: boolean; // Default value is false.
    // These fields will be transmitted if isLocal is true.
    health?: number;
    maximumHealth?: number;
    experience?: number;
    gold?: number;
    score?: number;
}

export interface EntityChunkJson extends EntityJson {
    pos: PosJson;
    spriteMirrorX: boolean;
}

export interface EntityBattleJson extends EntityJson {
    health: number;
    maximumHeatlh: number;
    energy: number;
    damage: number;
}

export interface EffectJson {
    name: string;
}

export interface PointsEffectJson extends EffectJson {
    pointsName: string;
    applyToOpponent: boolean;
}

export interface SetPointsEffectJson extends PointsEffectJson {
    value: number;
}

export interface OffsetPointsEffectJson extends PointsEffectJson {
    offset: number;
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
    message?: string;
}

export type CommandListener = (messenger: Messenger) => void | Promise<void>;


