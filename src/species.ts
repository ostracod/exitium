
import { SpeciesJson } from "./interfaces.js";

export const speciesList: Species[] = [];
export const speciesMap: { [serialInteger: string]: Species } = {};

export class Species {
    serialInteger: number;
    name: string;
    description: string;
    
    constructor(serialInteger: number, name: string, description: string) {
        this.serialInteger = serialInteger;
        this.name = name;
        this.description = description;
        speciesList.push(this);
        speciesMap[this.serialInteger] = this;
    }
    
    toJson(): SpeciesJson {
        return {
            serialInteger: this.serialInteger,
            name: this.name,
            description: this.description,
        }
    }
}

new Species(0, "slime", "Specializes in clearing status effects.");
new Species(1, "spider", "Specializes in causing status effects.");
new Species(2, "mushroom", "Specializes in boosting health points.");
new Species(3, "crystal", "Specializes in boosting energy points.");
new Species(4, "robot", "Specializes in boosting damage points.");


