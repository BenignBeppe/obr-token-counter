import OBR, { buildText } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./util.js";
import { updateVisualisation, addVisualistaion, removeVisualisation, getVisualisation } from "./visualisation.js";

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
        return;
    }

    return tokens[0];
}

async function getSelectedToken() {
    let selectedIds = await OBR.player.getSelection();
    let token = await getToken(selectedIds);
    return token;
}

function updateCounter(token) {
    valueField.value = token.metadata[getPluginId("value")] || 0;
}

async function updateShowButtons(token) {
    let visualisation = await getVisualisation(token);
    if(visualisation.length) {
        hide.classList.remove("selected");
        showNumberButton.classList.add("selected");
    } else {
        hide.classList.add("selected");
        showNumberButton.classList.remove("selected");
    }
}

let valueField = document.querySelector("#value");
valueField.addEventListener("change", async () => {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    let value = valueField.value;
    await OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("value")] = value;
        }
    });
    updateVisualisation(token);
});

let hideButton = document.querySelector("#hide");
hideButton.addEventListener("click", async () => {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    removeVisualisation(token);
});
let showNumberButton = document.querySelector("#show-number");
showNumberButton.addEventListener("click", async () => {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    addVisualistaion(token);
});
for(let button of [hideButton, showNumberButton]) {
    button.addEventListener("click", () => {
        let selected = document.querySelector(".selected");
        if(selected) {
            selected.classList.remove("selected");
        }
        button.classList.add("selected");
    });
}

OBR.onReady(() => {
    OBR.player.onChange(async (player) => {
        let selection = player.selection;
        let token = await getToken(player.selection);
        if(!token) {
            return;
        }

        updateCounter(token);
        updateShowButtons(token);
    });
});
