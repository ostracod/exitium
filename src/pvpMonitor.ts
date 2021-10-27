
import { Entity, PlayerEntity } from "./entity.js";

const maximumRewardAmount = 2;
const maximumVictoryAge = 60 * 60 * 24;

// The goal of this class is to prevent
// people from gaining a lot of XP by
// repeatedly defeating an alt account.
export class PvpMonitor {
    // Each array of numbers stores timestamps
    // when one player was awared XP for
    // defeating another player.
    victoryMap: { [winnerName: string]: { [loserName: string]: number[] } };
    garbageCollectTime: number;
    
    constructor() {
        this.victoryMap = {};
        this.garbageCollectTime = 0;
    }
    
    // Returns whether the winner should receive XP.
    registerVictory(winner: Entity, loser: Entity): boolean {
        if (!(winner instanceof PlayerEntity) || !(loser instanceof PlayerEntity)) {
            return true;
        }
        const winnerName = winner.player.username;
        const loserName = loser.player.username;
        if (!(winnerName in this.victoryMap)) {
            this.victoryMap[winnerName] = {};
        }
        const tempMap = this.victoryMap[winnerName];
        if (!(loserName in tempMap)) {
            tempMap[loserName] = [];
        }
        const timestamps = tempMap[loserName];
        if (timestamps.length >= maximumRewardAmount) {
            return false;
        }
        timestamps.push(Date.now() / 1000);
        return true;
    }
    
    garbageCollect(): void {
        const currentTime =  Date.now() / 1000;
        for (const winnerName in this.victoryMap) {
            const tempMap = this.victoryMap[winnerName];
            let loserCount = 0;
            for (const loserName in tempMap) {
                let timestamps = tempMap[loserName];
                timestamps = timestamps.filter((timestamp) => (
                    timestamp > currentTime - maximumVictoryAge
                ));
                if (timestamps.length > 0) {
                    tempMap[loserName] = timestamps;
                    loserCount += 1;
                } else {
                    delete tempMap[loserName];
                }
            }
            if (loserCount <= 0) {
                delete this.victoryMap[winnerName];
            }
        }
        this.garbageCollectTime = currentTime;
    }
    
    timerEvent(): void {
        if (Date.now() / 1000 > this.garbageCollectTime + 60) {
            this.garbageCollect();
        }
    }
}


