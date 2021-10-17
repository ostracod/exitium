
export const speciesList: Species[] = [];
export const speciesMap: { [serialInteger: string]: Species } = {};

export class Species {
    serialInteger: number;
    name: string;
    
    constructor(serialInteger: number, name: string) {
        this.serialInteger = serialInteger;
        speciesList.push(this);
        speciesMap[this.serialInteger] = this;
    }
}

new Species(0, "slime");
new Species(1, "spider");
new Species(2, "mushroom");
new Species(3, "crystal");
new Species(4, "robot");


