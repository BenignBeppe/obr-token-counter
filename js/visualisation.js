import OBR, { buildText, buildShape } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./util.js";

const VISUALISATION = "VISUALISATION";
export const HIDDEN = "HIDDEN";
export const NUMBER = "NUMBER";
export const BAR = "BAR";
const NUMBER_HEIGHT = 50;
const BAR_HEIGHT = 30;

export async function setValue(token, counterIndex, value, maxValue) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    let counterMetadata = token.metadata[getPluginId("counters")][counterIndex];
    let barWidth;
    if(counterMetadata.showAs === BAR) {
        // Calculate this here since updateItems() doesn't like async
        // functions.
        barWidth = await makeBarWidth(token, value, maxValue);
    }
    OBR.scene.items.updateItems(visualisation, (items) => {
        for(let item of items) {
            if(counterMetadata.showAs === NUMBER) {
                item.text.plainText = makeValueString(value, maxValue);
            } else if(counterMetadata.showAs === BAR) {
                if(!item.metadata[getPluginId("role")].includes(BAR)) {
                    continue;
                }

                item.width = barWidth;
            }
        }
    });
}

async function makeBarWidth(token, value, maxValue) {
    if(maxValue < 1) {
        return 0;
    }

    let tokenWidth = await getTokenWidth(token);
    let width = tokenWidth * (value / maxValue);
    // Keep the bar inside the frame.
    return Math.min(Math.max(width, 0), tokenWidth);
}

async function getTokenWidth(token) {
    let gridDpi = await OBR.scene.grid.getDpi();
    // TODO: Make position work with offset that isn't half of width
    // and height.
    let tokenWidth = (token.image.width / token.grid.dpi) * gridDpi * token.scale.x;
    return tokenWidth;
}

function makeValueString(value, maxValue) {
    let text = `${value}`;
    if(maxValue !== 0) {
        text += `/${maxValue}`;
    }
    return text;
}

export async function setColour(token, counterIndex, colour) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    let counterMetadata = token.metadata[getPluginId("counters")][counterIndex];
    OBR.scene.items.updateItems(visualisation, (items) => {
        for(let item of items) {
            if(counterMetadata.showAs === NUMBER) {
                item.text.style.fillColor = colour;
            } else if(counterMetadata.showAs === BAR) {
                if(!item.metadata[getPluginId("role")].includes(BAR)) {
                    continue;
                }

                item.style.fillColor = colour;
            }
        }
    });
}

export async function setGmOnly(token, gmOnly) {
    let visualisations = await getVisualisations(token);
    if(!visualisations.length) {
        return;
    }

    OBR.scene.items.updateItems(visualisations, (items) => {
        for(let item of items) {
            item.visible = !gmOnly;
        }
    });
}

async function getVisualisation(token, counterIndex) {
    let visualisation = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id
            && i.metadata[getPluginId("role")]?.includes(VISUALISATION)
            && i.metadata[getPluginId("counterIndex")] === counterIndex
    );
    return visualisation;
}

async function getVisualisations(token, startIndex) {
    startIndex = startIndex || 0;
    let visualisations = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id
            && i.metadata[getPluginId("role")]?.includes(VISUALISATION)
            && i.metadata[getPluginId("counterIndex")] >= startIndex
    );
    return visualisations;
}

function buildBase(builder, token, counterIndex) {
    let visible = !token.metadata[getPluginId("gmOnly")];
    return builder
        .attachedTo(token.id)
        .disableAttachmentBehavior(["SCALE", "ROTATION"])
        .layer("ATTACHMENT")
        .visible(visible)
        .locked(true)
        .metadata({
            [getPluginId("role")]: [VISUALISATION],
            [getPluginId("counterIndex")]: counterIndex
        });
}

export async function createNumber(token, counterIndex) {
    let metadata = token.metadata[getPluginId("counters")][counterIndex];
    let item = buildBase(buildText(), token, counterIndex)
        .textType("PLAIN")
        .plainText(makeValueString(metadata.value, metadata.maxValue))
        .fontSize(NUMBER_HEIGHT)
        .lineHeight(1)
        .fontWeight(700)
        .fillColor(metadata.colour)
        .strokeColor("black")
        .strokeWidth(2)
        .build();
    await OBR.scene.items.addItems([item]);
}

export async function createBar(token, counterIndex) {
    let metadata = token.metadata[getPluginId("counters")][counterIndex];
    let tokenWidth = await getTokenWidth(token);
    let frame = buildBase(buildShape(), token, counterIndex)
        .shapeType("RECTANGLE")
        .width(tokenWidth)
        .height(BAR_HEIGHT)
        .strokeColor("black")
        .fillOpacity(0)
        .build();
    await OBR.scene.items.addItems([frame]);
    let width = await makeBarWidth(token, metadata.value, metadata.maxValue);
    let bar = buildBase(buildShape(), token, counterIndex)
        .shapeType("RECTANGLE")
        .width(width)
        .height(BAR_HEIGHT)
        .fillColor(metadata.colour)
        .strokeWidth(0)
        .metadata({
            [getPluginId("role")]: [VISUALISATION, BAR],
            [getPluginId("counterIndex")]: counterIndex
        })
        .build();
    await OBR.scene.items.addItems([bar]);
}

export async function rearrange(token) {
    let gridDpi = await OBR.scene.grid.getDpi();
    let tokenWidth = await getTokenWidth(token);
    let x = token.position.x - tokenWidth / 2;
    // TODO: Make position work with offset that isn't half of width
    // and height.
    let imageHeight = (token.image.height / token.grid.dpi) * gridDpi;
    let y = token.position.y - (imageHeight / 2) * token.scale.y;

    let counters = token.metadata[getPluginId("counters")];
    let offset = 0;
    for(let [counterIndex, counter] of counters.entries()) {
        if(counter.showAs === HIDDEN) {
            continue;
        }

        let parts = await getVisualisation(token, counterIndex);
        OBR.scene.items.updateItems(
            parts,
            (items) => {
                for(let item of items) {
                    item.position.x = x;
                    item.position.y = y + offset;
                }
                if(counter.showAs === NUMBER) {
                    offset += NUMBER_HEIGHT;
                } else if(counter.showAs === BAR) {
                    offset += BAR_HEIGHT + 5;
                }
            }
        );
    }
}

export async function add(token, counterIndex, type) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(visualisation.length) {
        let ids = visualisation.map(i => i.id);
        await OBR.scene.items.deleteItems(ids);
    }

    if(type === NUMBER) {
        await createNumber(token, counterIndex);
    } else if (type === BAR) {
        await createBar(token, counterIndex);
    }
    rearrange(token);
}

export async function hide(token, counterIndex) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    let ids = visualisation.map(i => i.id);
    await OBR.scene.items.deleteItems(ids);
    rearrange(token);
}

export async function remove(token, counterIndex) {
    hide(token, counterIndex);

    // Subtract one from the index of all visualisations after the one
    // deleted to keep them in sync.
    let visualisationsAfter = await getVisualisations(token, counterIndex + 1);
    OBR.scene.items.updateItems(
        visualisationsAfter,
        items => items.forEach(i => i.metadata[getPluginId("counterIndex")] -= 1)
    );
}
