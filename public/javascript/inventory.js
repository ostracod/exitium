
const inventoryItems = [];
let selectedInventoryItem = null;

class InventoryItem  {
    
    constructor(tile, name) {
        this.tile = tile;
        this.name = name;
        this.tag = createOptionRow("inventoryItemsContainer", () => {
            this.select();
        }, this.name, this.tile.getSprite());
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
}

const initializeInventoryItems = () => {
    const redBlock = new InventoryItem(getBlock(0), "Red Block");
    new InventoryItem(getBlock(1), "Green Block");
    new InventoryItem(getBlock(2), "Blue Block");
    redBlock.select();
};


