
import { World } from "./world.js";
import { Entity } from "./entity.js";

export class Battle {
    entities: [Entity, Entity];
    world: World;
    turnIndex: number;
    
    // entity1 and entity2 must belong to the same World.
    constructor(entity1: Entity, entity2: Entity) {
        this.entities = [entity1, entity2];
        this.world = this.entities[0].world;
        this.turnIndex = 0;
        this.entities.forEach((entity) => {
            entity.removeFromChunk();
            entity.battle = this;
            entity.points.energy.setValue(5);
            entity.points.damage.setValue(5);
        });
        this.world.battles.add(this);
    }
    
    getOpponent(entity: Entity): Entity {
        const index = (entity === this.entities[0]) ? 1 : 0;
        return this.entities[index];
    }
}


