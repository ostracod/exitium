
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

export interface ClientCommand {
    commandName: string;
}

export type CommandListener = (messenger: Messenger) => void | Promise<void>;


