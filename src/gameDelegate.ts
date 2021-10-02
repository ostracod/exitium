
import ostracodMultiplayer from "ostracod-multiplayer";
import { Pos, createPosFromJson } from "./pos.js";
import { Player, EntityJson, ClientCommand, GetStateClientCommand, WalkClientCommand, ActionClientCommand, SetBattleStateClientCommand, CommandListener } from "./interfaces.js";
import { Tile } from "./tile.js";
import { Entity, PlayerEntity } from "./entity.js";
import { Battle } from "./battle.js";
import { LearnableAction, actionMap } from "./action.js";
import { world } from "./world.js";

const { gameUtils } = ostracodMultiplayer;

export class Messenger<T extends ClientCommand = ClientCommand> {
    // A command received from the client.
    inputCommand: T;
    // The local player entity which sent the input command.
    playerEntity: PlayerEntity;
    // Commands which will be sent back to the client.
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
    
    addCommand(name, data: { [key: string]: any } = null): void {
        const command: ClientCommand = { commandName: name };
        if (data !== null) {
            for (const key in data) {
                command[key] = data[key];
            }
        }
        this.outputCommands.push(command);
    }
    
    setLearnedActions(): void {
        const actions = Array.from(this.playerEntity.learnedActions);
        this.addCommand("setLearnedActions", {
            serialIntegers: actions.map((action) => action.serialInteger),
        });
    }
    
    setChunkTiles(tiles: Tile[], pos: Pos, windowSize: number): void {
        this.addCommand("setChunkTiles", {
            tiles: tiles.map((tile) => tile.serialize()).join(""),
            pos: pos.toJson(),
            windowSize,
        });
    }
    
    setBattleState(battle: Battle) {
        const { turnIndex } = battle;
        let timeout = battle.getTurnTimeout();
        if (timeout !== null) {
            timeout = Math.max(Math.floor(timeout), 0);
        }
        const commandData = {
            turnIndex: battle.turnIndex,
            localPlayerHasTurn: battle.entityHasTurn(this.playerEntity),
            isFinished: battle.isFinished,
            turnTimeout: timeout,
        } as SetBattleStateClientCommand;
        if (this.playerEntity.lastTurnIndex !== turnIndex) {
            commandData.message = battle.message;
        }
        this.addCommand("setBattleState", commandData);
    }
    
    setEntities(
        commandName: string,
        entities: Entity[],
        convertEntity: (entity: Entity, isLocal: boolean) => EntityJson,
    ): void {
        const dataList = entities.map((entity) => {
            if (entity === null) {
                return null;
            } else {
                return convertEntity(entity, (entity === this.playerEntity));
            }
        });
        this.addCommand(commandName, { entities: dataList });
    }
    
    setChunkEntities(entities: Entity[]): void {
        this.setEntities("setChunkEntities", entities, (entity, isLocal) => (
            entity.toChunkJson(isLocal)
        ));
    }
    
    setBattleEntities(entities: Entity[]): void {
        this.setEntities("setBattleEntities", entities, (entity, isLocal) => (
            entity.toBattleJson(isLocal)
        ));
    }
}

const handleLearnableAction = (
    messenger: Messenger<ActionClientCommand>,
    handle: (learnableAction: LearnableAction) => void,
): void => {
    const action = actionMap[messenger.inputCommand.serialInteger];
    if (action instanceof LearnableAction) {
        handle(action);
    }
    messenger.setLearnedActions();
}

// Each key may have one of the following formats:
// "(name)" = Synchronous command listener
// "async (name)" = Asynchronous command listener
const commandListeners: { [key: string]: CommandListener } = {
    
    "getLearnedActions": (messenger) => {
        messenger.setLearnedActions();
    },
    
    "getState": (messenger: Messenger<GetStateClientCommand>) => {
        const { playerEntity } = messenger;
        const { turnIndex } = messenger.inputCommand;
        if (typeof turnIndex === "undefined") {
            playerEntity.lastTurnIndex = null;
        } else {
            playerEntity.lastTurnIndex = turnIndex;
        }
        
        const { battle } = playerEntity;
        if (battle !== null) {
            messenger.setBattleState(battle);
            messenger.setBattleEntities(battle.entities);
            return;
        }
        
        const windowSize = 21;
        const centerOffset = Math.floor(windowSize / 2);
        const pos = playerEntity.pos.copy();
        pos.x -= centerOffset;
        pos.y -= centerOffset;
        const tiles = world.getChunkTilesInWindow(pos, windowSize, windowSize);
        messenger.setChunkTiles(tiles, pos, windowSize);
        
        const entities = tiles.filter((tile) => (tile instanceof Entity)) as Entity[];
        messenger.setChunkEntities(entities);
    },
    
    "walk": (messenger: Messenger<WalkClientCommand>) => {
        const offset = createPosFromJson(messenger.inputCommand.offset);
        messenger.playerEntity.walk(offset);
    },
    
    "performAction": (messenger: Messenger<ActionClientCommand>) => {
        const action = actionMap[messenger.inputCommand.serialInteger];
        messenger.playerEntity.performAction(action);
    },
    
    "learnAction": (messenger: Messenger<ActionClientCommand>) => {
        handleLearnableAction(messenger, (learnableAction) => {
            messenger.playerEntity.learnAction(learnableAction);
        });
    },
    
    "forgetAction": (messenger: Messenger<ActionClientCommand>) => {
        handleLearnableAction(messenger, (learnableAction) => {
            messenger.playerEntity.forgetAction(learnableAction);
        });
    },
    
    "levelUp": (messenger) => {
        messenger.playerEntity.levelUp();
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
        const pos = new Pos(63, 3);
        new PlayerEntity(world, pos, player);
    }
    
    playerLeaveEvent(player: Player): void {
        const playerEntity = world.playerEntityMap[player.username];
        if (typeof playerEntity !== "undefined") {
            playerEntity.remove();
        }
    }
    
    async persistEvent(): Promise<void> {
        for (const username in world.playerEntityMap) {
            const playerEntity = world.playerEntityMap[username];
            playerEntity.persistEvent();
        }
    }
    
    getOnlinePlayerText(player) {
        return `${player.username} (${player.extraFields.level})`;
    }
}

export const gameDelegate = new GameDelegate();

const timerEvent = () => {
    world.timerEvent();
};

setInterval(timerEvent, 100);


