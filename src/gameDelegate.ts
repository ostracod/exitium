
import ostracodMultiplayer from "ostracod-multiplayer";
import { Pos, createPosFromJson } from "./pos.js";
import { Player, EntityJson, ClientCommand, GetStateClientCommand, WalkClientCommand, PlaceTileClientCommand, ActionClientCommand, SetBattleStateClientCommand, CommandListener, BindActionClientCommand, SetSpeciesClientCommand } from "./interfaces.js";
import { Tile, deserializeTiles } from "./tile.js";
import { Entity, PlayerEntity, defaultPlayerSpawnPos } from "./entity.js";
import { Battle } from "./battle.js";
import { LearnableAction, actionList, actionMap } from "./action.js";
import { world } from "./world.js";

const { gameUtils } = ostracodMultiplayer;

export class Messenger<T extends ClientCommand = ClientCommand> {
    // A command received from the client.
    inputCommand: T;
    // The local player which sent the input command.
    player: Player;
    // Commands which will be sent back to the client.
    outputCommands: ClientCommand[];
    // The entity of the local player.
    playerEntity: PlayerEntity;
    
    constructor(
        inputCommand: T,
        player: Player,
        outputCommands: ClientCommand[],
    ) {
        this.inputCommand = inputCommand;
        this.player = player;
        this.outputCommands = outputCommands;
        this.playerEntity = world.getPlayerEntity(player);
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
    
    requestSpecies(): void {
        this.addCommand("requestSpecies");
    }
    
    setLearnedActions(): void {
        if (this.playerEntity === null) {
            return;
        }
        const actions = Array.from(this.playerEntity.learnedActions);
        this.addCommand("setLearnedActions", {
            serialIntegers: actions.map((action) => action.serialInteger),
        });
    }
    
    setDiscountedActions(): void {
        if (this.playerEntity === null) {
            return;
        }
        const species = this.playerEntity.getSpecies();
        const serialIntegers = [];
        species.discountedActions.forEach((action) => {
            serialIntegers.push(action.serialInteger);
        });
        this.addCommand("setDiscountedActions", { serialIntegers });
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
            lingerStates: battle.lingerStates.map((state) => state.toJson()),
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

const createPlayerEntity = (player: Player): void => {
    if (player.username in world.playerEntityMap) {
        return;
    }
    const { posX, posY } = player.extraFields;
    let pos: Pos;
    if (posX === null || posY === null) {
        pos = defaultPlayerSpawnPos.copy();
    } else {
        pos = new Pos(posX, posY);
    }
    new PlayerEntity(world, pos, player);
};


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
    
    "setSpecies": (messenger: Messenger<SetSpeciesClientCommand>) => {
        const { player } = messenger;
        if (player.extraFields.species !== null) {
            return
        }
        const { species, color } = messenger.inputCommand;
        player.extraFields.species = species;
        player.extraFields.color = color;
        createPlayerEntity(player);
    },
    
    "getLearnedActions": (messenger) => {
        messenger.setLearnedActions();
    },
    
    "getDiscountedActions": (messenger) => {
        messenger.setDiscountedActions();
    },
    
    "getState": (messenger: Messenger<GetStateClientCommand>) => {
        const { player, playerEntity } = messenger;
        if (player.extraFields.species === null) {
            messenger.requestSpecies();
            return;
        }
        
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
        messenger.playerEntity.walk(messenger.inputCommand.offsetIndex);
    },
    
    "placeTile": (messenger: Messenger<PlaceTileClientCommand>) => {
        const { offsetIndex } = messenger.inputCommand;
        const tile = deserializeTiles(messenger.inputCommand.tile)[0];
        messenger.playerEntity.placeTile(offsetIndex, tile);
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
    
    "bindAction": (messenger: Messenger<BindActionClientCommand>) => {
        const { serialInteger, keyNumber } = messenger.inputCommand;
        messenger.playerEntity.bindAction(serialInteger, keyNumber);
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
                player,
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
        if (player.extraFields.level === null) {
            player.extraFields.level = 5;
        }
        if (player.extraFields.species !== null) {
            createPlayerEntity(player);
        }
    }
    
    playerLeaveEvent(player: Player): void {
        const playerEntity = world.playerEntityMap[player.username];
        if (typeof playerEntity !== "undefined") {
            playerEntity.remove();
        }
    }
    
    async persistEvent(): Promise<void> {
        world.iterateOverChunks((chunk) => {
            chunk.persist();
        });
        world.iterateOverPlayerEntities((playerEntity) => {
            playerEntity.persistEvent();
        });
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


