
import ostracodMultiplayer from "ostracod-multiplayer";
import { Pos } from "./pos.js";
import { Player, CommandListener, ClientCommand } from "./interfaces.js";
import { PlayerEntity } from "./entity.js";
import { world } from "./world.js";

const { gameUtils } = ostracodMultiplayer;

export class Messenger<T extends ClientCommand = ClientCommand> {
    inputCommand: T;
    playerEntity: PlayerEntity;
    outputCommands: ClientCommand[];
    
    constructor(
        inputCommand: T,
        playerEntity: PlayerEntity,
        outputCommands: ClientCommand[],
    ) {
        this.inputCommand = inputCommand;
        this.playerEntity = playerEntity;
        this.outputCommands = outputCommands;
    }
    
    addCommand(name, data: { [key: string]: any } = null) {
        const command: ClientCommand = { commandName: name };
        if (data !== null) {
            for (const key in data) {
                command[key] = data[key];
            }
        }
        this.outputCommands.push(command);
    }
    
    setTiles() {
        this.addCommand("setTiles");
    }
}

// Each key may have one of the following formats:
// "(name)" = Synchronous command listener
// "async (name)" = Asynchronous command listener
const commandListeners: { [key: string]: CommandListener } = {
    
    "getState": (messenger) => {
        // TODO: Send tiles to the client.
        messenger.setTiles();
    },
};

for (const key in commandListeners) {
    const terms = key.split(" ");
    let commandName: string;
    let isSynchronous = true;
    if (terms.length === 2) {
        if (terms[0] === "async") {
            isSynchronous = false;
            commandName = terms[1];
        } else {
            throw new Error(`Invalid command handler key "${key}".`);
        }
    } else if (terms.length === 1) {
        commandName = terms[0];
    } else {
        throw new Error(`Invalid command handler key "${key}".`);
    }
    const commandListener = commandListeners[key];
    gameUtils.addCommandListener(
        commandName,
        isSynchronous,
        (
            inputCommand: ClientCommand,
            player: Player,
            outputCommands: ClientCommand[],
        ) => {
            const messenger = new Messenger(
                inputCommand,
                world.getPlayerEntity(player),
                outputCommands,
            );
            return commandListener(messenger);
        },
    );
}

class GameDelegate {
    
    constructor() {
        // Do nothing.
    }
    
    playerEnterEvent(player: Player): void {
        if (player.username in world.playerEntityMap) {
            return;
        }
        const pos = new Pos(-10, 10);
        new PlayerEntity(world, pos, player);
    }
    
    playerLeaveEvent(player: Player): void {
        const playerEntity = world.playerEntityMap[player.username];
        if (typeof playerEntity !== "undefined") {
            playerEntity.remove();
        }
    }
    
    async persistEvent(): Promise<void> {
        // Do nothing.
    }
}

export const gameDelegate = new GameDelegate();


