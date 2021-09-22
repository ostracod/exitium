
import { Player } from "./interfaces.js";

export abstract class Points {
    minimumValue: number;
    maximumValue: number;
    
    constructor(minimumValue: number, maximumValue: number) {
        this.minimumValue = minimumValue;
        this.maximumValue = maximumValue;
    }
    
    abstract getValue(): number;
    
    abstract setValue(value: number): void;
    
    clampValue(value: number): number {
        return Math.min(Math.max(this.minimumValue, value), this.maximumValue);
    }
}

export class TempPoints extends Points {
    value: number;
    
    constructor(minimumValue: number, maximumValue: number, value: number) {
        super(minimumValue, maximumValue);
        this.value = value;
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValue(value: number): void {
        this.value = this.clampValue(value);
    }
}

export class PlayerPoints extends Points {
    player: Player;
    fieldName: string;
    
    constructor(
        minimumValue: number,
        maximumValue: number,
        player: Player,
        fieldName: string,
        defaultValue: number,
    ) {
        super(minimumValue, maximumValue);
        this.player = player;
        this.fieldName = fieldName;
        const value = this.getValue();
        if (value === null) {
            this.setValue(defaultValue);
        }
    }
    
    getValue(): number {
        return this.player.extraFields[this.fieldName];
    }
    
    setValue(value: number): void {
        this.player.extraFields[this.fieldName] = this.clampValue(value);
    }
}


