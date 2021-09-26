
import { Player } from "./interfaces.js";

export abstract class Points {
    minimumValue: number;
    maximumValue: number;
    
    constructor(minimumValue: number, maximumValue: number) {
        this.minimumValue = minimumValue;
        this.maximumValue = maximumValue;
    }
    
    abstract getValue(): number;
    
    abstract setValueHelper(value: number): void;
    
    setValue(value: number): void {
        this.setValueHelper(this.clampValue(value));
    }
    
    offsetValue(amount: number): number {
        const oldValue = this.getValue();
        this.setValue(this.getValue() + amount);
        return this.getValue() - oldValue;
    }
    
    clampValue(value: number): number {
        let output = value;
        if (this.minimumValue !== null) {
            output = Math.max(this.minimumValue, output);
        }
        if (this.maximumValue !== null) {
            output = Math.min(this.maximumValue, output);
        }
        return output;
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
    
    setValueHelper(value: number): void {
        this.value = value;
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
    
    setValueHelper(value: number): void {
        this.player.extraFields[this.fieldName] = value;
    }
}


