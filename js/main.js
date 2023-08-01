import OBR, { buildText } from "@owlbear-rodeo/sdk";
import { getPluginId, log } from "./util.js";
import {
    setVisualisationValue,
    setVisualisationColour,
    setVisualisationsGmOnly,
    addVisualisation,
    removeVisualisation,
    getVisualisation,
    hideVisualisation
} from "./visualisation.js";

const HIDDEN = "HIDDEN";
const NUMBER = "NUMBER";

async function addCounter() {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    await OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            if(!Object.hasOwn(item.metadata, getPluginId("counters"))) {
                item.metadata[getPluginId("counters")] = [];
            }
            item.metadata[getPluginId("counters")].push({
                value: 0,
                showAs: HIDDEN,
                colour: "#ffffff"
            });
        }
    });

    // We need to get the token again here to get the updated state.
    let updatedToken = await getToken(token.id);
    updateCounters(updatedToken);
    log(`Added counter to token ${token.id} ("${token.name})"`);
}

async function getSelectedToken() {
    let selectedIds = await OBR.player.getSelection();
    let token = await getToken(selectedIds);
    return token;
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
        return;
    }

    return tokens[0];
}

async function getItem(itemId) {
    let items = await OBR.scene.items.getItems([itemId]);
    return items[0];
}

async function toggleGmOnly() {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    let playerRole = await OBR.player.getRole();
    if(playerRole !== "GM") {
        return;
    }

    let gmOnly = token.metadata[getPluginId("gmOnly")];
    gmOnly = !gmOnly;
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("gmOnly")] = gmOnly;
        }
    });
    setVisualisationsGmOnly(token, gmOnly);
    updateGmOnlyButton(gmOnly);
}

function updateGmOnlyButton(gmOnly) {
    if(gmOnly) {
        gmOnlyButton.classList.add("selected");
    } else {
        gmOnlyButton.classList.remove("selected");
    }
}

function updateCounters(token) {
    let counters = token.metadata[getPluginId("counters")] || [];

    let elements = [];
    for(let [index, counter] of counters.entries()) {
        let template = document.querySelector("#templates .counter");
        let element = template.cloneNode(true);
        let metadata = token.metadata[getPluginId("counters")][index];

        let valueInput = element.querySelector(".value");
        valueInput.value = metadata.value;
        valueInput.addEventListener(
            "change",
            () => updateValue(token.id, index, valueInput)
        );

        let showSettingsButton = element.querySelector(".show-settings");
        let settings = element.querySelector(".settings");
        showSettingsButton.addEventListener(
            "click",
            () => toggleShowSettings(showSettingsButton, settings)
        );

        let hideButton = element.querySelector(".hide");
        if(metadata.showAs === HIDDEN) {
            hideButton.classList.add("selected");
        }
        hideButton.addEventListener(
            "click",
            () => {
                updateShowAs(token.id, index, HIDDEN);
                hideButton.classList.add("selected");
                showNumberButton.classList.remove("selected");
            }
        );
        let showNumberButton = element.querySelector(".show-number");
        if(metadata.showAs === NUMBER) {
            showNumberButton.classList.add("selected");
        }
        showNumberButton.addEventListener(
            "click",
            () => {
                updateShowAs(token.id, index, NUMBER);
                hideButton.classList.remove("selected");
                showNumberButton.classList.add("selected");
            }
        );

        let colourInput = element.querySelector(".colour");
        colourInput.value = metadata.colour;
        colourInput.addEventListener(
            "change",
            () => updateColour(token.id, index, colourInput)
        );

        let removeButton = element.querySelector(".remove");
        removeButton.addEventListener(
            "click",
            () => removeCounter(token.id, index)
        );

        elements.push(element);
    }
    let counterList = document.querySelector("#counters");
    counterList.replaceChildren(...elements);
}

async function updateValue(tokenId, counterIndex, valueInput) {
    let token = await getItem(tokenId);
    let value = Number(valueInput.value);
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")][counterIndex].value = value;
        }
    });
    setVisualisationValue(token, counterIndex, value);
}

function toggleShowSettings(showSettingsButton, settings) {
    settings.hidden = !settings.hidden;
    if(settings.hidden) {
        showSettingsButton.classList.remove("selected");
    } else {
        showSettingsButton.classList.add("selected");
    }
}

async function updateShowAs(tokenId, counterIndex, showAs) {
    let token = await getItem(tokenId);
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")][counterIndex].showAs = showAs;
        }
    });
    if(showAs === HIDDEN) {
        hideVisualisation(token, counterIndex);
    } else if(showAs === NUMBER) {
        addVisualisation(token, counterIndex);
    }
}

async function updateColour(tokenId, counterIndex, colourInput) {
    let token = await getItem(tokenId);
    let colour = colourInput.value;
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")][counterIndex].colour = colour;
        }
    });
    setVisualisationColour(token, counterIndex, colour);
}

async function removeCounter(tokenId, counterIndex) {
    let token = await getItem(tokenId);
    await OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")].splice(counterIndex, 1);
        }
    });

    // We need to get the token again here to get the updated state.
    let updatedToken = await getItem(tokenId);
    updateCounters(updatedToken);
    removeVisualisation(updatedToken, counterIndex);
    log(`Removed counter with index ${counterIndex} from token ${token.id} ("${token.name})"`);
}

function clearCounters() {
    let counterList = document.querySelector("#counters");
    counterList.replaceChildren();
}

document.querySelector("#add-counter").addEventListener("click", addCounter);
let gmOnlyButton = document.querySelector("#gm-only");
gmOnlyButton.addEventListener("click", toggleGmOnly);

OBR.onReady(() => {
    OBR.player.onChange(async (player) => {
        let selection = player.selection;
        let token = await getToken(player.selection);
        if(!token) {
            clearCounters();
            updateGmOnlyButton(false);
            return;
        }

        let gmOnly = token.metadata[getPluginId("gmOnly")];
        if(gmOnly) {
            let playerRole = await OBR.player.getRole();
            if(playerRole !== "GM") {
                clearPopover();
                return;
            }
        }

        updateGmOnlyButton(gmOnly);
        updateCounters(token);
    });
});
