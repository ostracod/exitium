
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

export interface ClientCommand {
    commandName: string;
}

export interface WalkClientCommand extends ClientCommand {
    offset: PosJson;
}

export type CommandListener = (messenger: Messenger) => void | Promise<void>;


