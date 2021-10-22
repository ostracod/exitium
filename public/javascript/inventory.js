
const inventoryItems = [];
let selectedInventoryItem = null;
let goldInventoryItem;

class InventoryItem {
    
    constructor(tile, name) {
        this.tile = tile;
        this.name = name;
        this.tag = createOptionRow("inventoryItemsContainer", () => {
            this.select();
        }, this.name, this.tile.getSprite());
        this.updateTextColor();
        inventoryItems.push(this);
    }
    
    unselect() {
        selectedInventoryItem = null;
        this.tag.style.border = "2px #FFFFFF solid";
    }
    
    select() {
        if (selectedInventoryItem !== null) {
            selectedInventoryItem.unselect();
        }
        selectedInventoryItem = this;
        this.tag.style.border = "2px #000000 solid";
    }
    
    canPlace() {
        return this.tile.entityCanPlace(localPlayerEntity);
    }
    
    updateTextColor() {
        this.tag.style.color = this.canPlace() ? "#000000" : "#FF0000";
    }
}

const initializeInventoryItems = () => {
    const redBlock = new InventoryItem(getBlock(0), "Red Block");
    new InventoryItem(getBlock(1), "Green Block");
    new InventoryItem(getBlock(2), "Blue Block");
    goldInventoryItem = new InventoryItem(goldTile, "Gold");
    redBlock.select();
};


