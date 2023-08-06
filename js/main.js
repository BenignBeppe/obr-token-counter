import OBR, { buildText } from "@owlbear-rodeo/sdk";
import { getPluginId, log } from "./util.js";
import * as visualisation from "./visualisation.js";

function showPage(page) {
    pages.forEach(p => p.hidden = p !== page);
}

async function addCounter() {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    if(!(await hasAccess(token))) {
        return;
    }

    await OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            if(!Object.hasOwn(item.metadata, getPluginId("counters"))) {
                item.metadata[getPluginId("counters")] = [];
            }
            item.metadata[getPluginId("counters")].push({
                value: 0,
                maxValue: 0,
                showAs: visualisation.HIDDEN,
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

async function hasAccess(token) {
    if(!token) {
        return false;
    }

    let playerRole = await OBR.player.getRole();
    if(playerRole === "GM") {
        return true;
    }

    let gmOnly = token.metadata[getPluginId("gmOnly")];
    if(gmOnly) {
        return false;
    }

    return true;
}

async function toggleGmOnly() {
    let token = await getSelectedToken();
    if(!token) {
        return;
    }

    let gmOnly = token.metadata[getPluginId("gmOnly")];
    gmOnly = !gmOnly;
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("gmOnly")] = gmOnly;
        }
    });
    visualisation.setGmOnly(token, gmOnly);
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

        let maxValueInput = element.querySelector(".max-value");
        maxValueInput.value = metadata.maxValue;
        maxValueInput.addEventListener(
            "change",
            () => updateMaxValue(token.id, index, maxValueInput)
        );

        let modifyInput = element.querySelector(".modify");
        modifyInput.addEventListener(
            "change",
            () => modifyValue(token.id, index, modifyInput, valueInput)
        );

        let showSettingsButton = element.querySelector(".show-settings");
        let settings = element.querySelector(".settings");
        showSettingsButton.addEventListener(
            "click",
            () => toggleShowSettings(showSettingsButton, settings)
        );

        let hideButton = element.querySelector(".hide");
        if(metadata.showAs === visualisation.HIDDEN) {
            hideButton.classList.add("selected");
        }
        hideButton.addEventListener(
            "click",
            () => updateShowAs(token.id, index, visualisation.HIDDEN)
        );
        let showNumberButton = element.querySelector(".show-number");
        if(metadata.showAs === visualisation.NUMBER) {
            showNumberButton.classList.add("selected");
        }
        showNumberButton.addEventListener(
            "click",
            () => updateShowAs(token.id, index, visualisation.NUMBER)
        );
        let showBarButton = element.querySelector(".show-bar");
        if(metadata.showAs === visualisation.BAR) {
            showBarButton.classList.add("selected");
        }
        showBarButton.addEventListener(
            "click",
            () => updateShowAs(token.id, index, visualisation.BAR)
        );
        for(let showAsButton of [hideButton, showNumberButton, showBarButton]) {
            showAsButton.addEventListener(
                "click",
                () => {
                    let selected = settings.querySelector(".selected");
                    selected.classList.remove("selected");
                    showAsButton.classList.add("selected");
                }
            );
        }

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
    let maxValue = token.metadata[getPluginId("counters")][counterIndex].maxValue;
    visualisation.setValue(token, counterIndex, value, maxValue);
}

async function updateMaxValue(tokenId, counterIndex, maxValueInput) {
    let token = await getItem(tokenId);
    let maxValue = Number(maxValueInput.value);
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")][counterIndex].maxValue = maxValue;
        }
    });
    let value = token.metadata[getPluginId("counters")][counterIndex].value;
    visualisation.setValue(token, counterIndex, value, maxValue);
}

function modifyValue(tokenId, counterIndex, modifyInput, valueInput) {
    let sign = modifyInput.value[0];
    let number = Number(modifyInput.value.slice(1));
    if(Number.isNaN(number)) {
        // Invalid number.
        return;
    }

    let value;
    if(sign === "+") {
        value = Number(valueInput.value) + number;
    } else if(sign === "-") {
        value = Number(valueInput.value) - number;
    } else {
        // Invalid sign.
        return;
    }

    valueInput.value = value;
    updateValue(tokenId, counterIndex, valueInput);
    modifyInput.value = "";
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
    let counterMetadata = token.metadata[getPluginId("counters")][counterIndex];
    if(showAs === counterMetadata.showAs) {
        // Nothing to do if the visualisation type stays the same.
        return;
    }

    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("counters")][counterIndex].showAs = showAs;
        }
    });
    let updatedToken = await getItem(token.id);
    if(showAs === visualisation.HIDDEN) {
        visualisation.hide(updatedToken, counterIndex);
    } else {
        visualisation.add(updatedToken, counterIndex, showAs);
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
    visualisation.setColour(token, counterIndex, colour);
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
    visualisation.remove(updatedToken, counterIndex);
    log(`Removed counter with index ${counterIndex} from token ${token.id} ("${token.name})"`);
}

function clearCounters() {
    let counterList = document.querySelector("#counters");
    counterList.replaceChildren();
}

document.querySelector("#add-counter").addEventListener("click", addCounter);
let gmOnlyButton = document.querySelector("#gm-only");

let controls = document.querySelector("#controls");
let noTokenText = document.querySelector("#no-token-text");
let secretTokenText = document.querySelector("#secret-token-text");
let pages = document.querySelectorAll(".page");

OBR.onReady(async () => {
    let playerRole = await OBR.player.getRole();
    if(playerRole === "GM") {
        gmOnlyButton.hidden = false;
        gmOnlyButton.addEventListener("click", toggleGmOnly);
    }

    OBR.player.onChange(async (player) => {
        let token = await getToken(player.selection);
        if(!token) {
            showPage(noTokenText);
            return;
        }

        if(!(await hasAccess(token))) {
            showPage(secretTokenText);
            return;
        }

        showPage(controls);
        let gmOnly = token.metadata[getPluginId("gmOnly")];
        updateGmOnlyButton(gmOnly);
        updateCounters(token);
    });
});
