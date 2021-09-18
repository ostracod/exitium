
import { PlayerEntity } from "./entity.js";
import { Messenger } from "./gameDelegate.js";

export interface Player {
    username: string;
    score: number;
    extraFields: {
        // TODO: Specify extra fields.
    };
}

export interface PosJson {
    x: number;
    y: number;
}

export interface EntityJson {
    name: string;
    pos: PosJson;
    spriteMirrorX: boolean;
}

export interface ClientCommand {
    commandName: string;
}

export interface WalkClientCommand extends ClientCommand {
    offset: PosJson;
}

export type CommandListener = (messenger: Messenger) => void | Promise<void>;


