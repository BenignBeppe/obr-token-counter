import OBR, { buildText } from "@owlbear-rodeo/sdk";

const VISUALISATION = "VISUALISATION";

function log(...message) {
    console.log(`${getPluginId()}:`, ...message);
}

function getPluginId(path) {
    return path ? `eu.sebber.token-counter/${path}` : "eu.sebber.token-counter";
}

/**
 * Get the first token from item ids
 *
 * A "token" is here defined as an item on the character layer.
 */
async function getToken(itemIds) {
    if(!itemIds) {
        return;
    }

    let tokens = await OBR.scene.items.getItems(
        i => itemIds.includes(i.id) && i.layer === "CHARACTER"
    );
    if(!tokens.length) {
        return
    }

    return tokens[0];
}

function updateCounter(token) {
    valueField.value = token.metadata[getPluginId("value")] || 0;
}

async function updateVisualisation(token, value) {
    let visualisation = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id &&
            i.metadata[getPluginId("role")] === VISUALISATION
    );
    if(!visualisation.length) {
        let newVisualisation = await createVisualisation(token);
        visualisation = [newVisualisation];
    }
    OBR.scene.items.updateItems(visualisation, (items) => {
        for (let item of items) {
            item.text.plainText = value;
        }
    });
}

async function createVisualisation(token) {
    let gridDpi = await OBR.scene.grid.getDpi();
    let imageWidth = (token.image.width / token.grid.dpi) * gridDpi;
    let x = token.position.x - (imageWidth / 2) * token.scale.x;
    let imageHeight = (token.image.height / token.grid.dpi) * gridDpi;
    let y = token.position.y - (imageHeight / 2) * token.scale.y;
    let position = {x: x, y: y};
    let item = buildText()
        .textType("PLAIN")
        .plainText("0")
        .position(position)
        .fontSize(40)
        .fontWeight(700)
        .strokeColor("black")
        .strokeWidth(1)
        .attachedTo(token.id)
        .locked(true)
        .metadata({[getPluginId("role")]: VISUALISATION})
        .build();
    await OBR.scene.items.addItems([item]);
    return item;
}

let valueField = document.querySelector("#value");
valueField.addEventListener("change", async () => {
    let selectedIds = await OBR.player.getSelection();
    let token = await getToken(selectedIds);
    if(!token) {
        return;
    }

    let value = valueField.value;
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("value")] = value;
        }
    });
    updateVisualisation(token, value);
});

OBR.onReady(() => {
    OBR.player.onChange(async (player) => {
        let selection = player.selection;
        let token = await getToken(player.selection);
        if(!token) {
            return;
        }

        updateCounter(token);
    });
});
