export {
    setVisualisationValue,
    setVisualisationColour,
    setVisualisationsGmOnly,
    addVisualisation,
    removeVisualisation,
    getVisualisation,
    hideVisualisation
};

import OBR, { buildText } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./util.js";

const VISUALISATION = "VISUALISATION";
const VISUALISATION_HEIGHT = 50;

async function setVisualisationValue(token, counterIndex, value) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    OBR.scene.items.updateItems(visualisation, (items) => {
        for (let item of items) {
            item.text.plainText = String(value);
        }
    });
}

async function setVisualisationColour(token, counterIndex, colour) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    OBR.scene.items.updateItems(visualisation, (items) => {
        for (let item of items) {
            item.text.style.fillColor = colour;
        }
    });
}

async function setVisualisationsGmOnly(token, gmOnly) {
    let visualisations = await getVisualisations(token);
    if(!visualisations.length) {
        return;
    }

    OBR.scene.items.updateItems(visualisations, (items) => {
        for (let item of items) {
            item.visible = !gmOnly;
        }
    });
}

async function getVisualisation(token, counterIndex) {
    let visualisation = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id
            && i.metadata[getPluginId("role")] === VISUALISATION
            && i.metadata[getPluginId("counterIndex")] === counterIndex
    );
    return visualisation;
}

async function getVisualisations(token, startIndex) {
    startIndex = startIndex || 0;
    let visualisations = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id
            && i.metadata[getPluginId("role")] === VISUALISATION
            && i.metadata[getPluginId("counterIndex")] >= startIndex
    );
    return visualisations;
}

async function createVisualisation(token, counterIndex) {
    let metadata = token.metadata[getPluginId("counters")][counterIndex];
    let item = buildText()
        .textType("PLAIN")
        .plainText(String(metadata.value))
        .fontSize(VISUALISATION_HEIGHT)
        .fontWeight(700)
        .fillColor(metadata.colour)
        .strokeColor("black")
        .strokeWidth(2)
        .attachedTo(token.id)
        .locked(true)
        .metadata({
            [getPluginId("role")]: VISUALISATION,
            [getPluginId("counterIndex")]: counterIndex
        })
        .build();
    await OBR.scene.items.addItems([item]);
}

async function rearangeVisualisations(token) {
    let gridDpi = await OBR.scene.grid.getDpi();
    // TODO: Make position work with offset that isn't half of width
    // and height.
    let imageWidth = (token.image.width / token.grid.dpi) * gridDpi;
    let x = token.position.x - (imageWidth / 2) * token.scale.x;
    let imageHeight = (token.image.height / token.grid.dpi) * gridDpi;
    let y = token.position.y - (imageHeight / 2) * token.scale.y;

    let visualisations = await getVisualisations(token);
    visualisations.sort((a, b) => a.metadata[getPluginId("counterIndex")] - b.metadata[getPluginId("counterIndex")]);
    let index = 0;
    OBR.scene.items.updateItems(
        visualisations,
        (items) => {
            for(let item of items) {
                item.position.x = x;
                item.position.y = y + VISUALISATION_HEIGHT * index;
                index ++;
            }
        }
    );
}

async function addVisualisation(token, counterIndex) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(visualisation.length) {
        return;
    }

    await createVisualisation(token, counterIndex);
    rearangeVisualisations(token);
}

async function hideVisualisation(token, counterIndex) {
    let visualisation = await getVisualisation(token, counterIndex);
    if(!visualisation.length) {
        return;
    }

    let ids = visualisation.map(i => i.id);
    await OBR.scene.items.deleteItems(ids);
    rearangeVisualisations(token);
}

async function removeVisualisation(token, counterIndex) {
    hideVisualisation(token, counterIndex);

    // Subtract one from the index of all visualisations after the one
    // deleted to keep them in sync.
    let visualisationsAfter = await getVisualisations(token, counterIndex + 1);
    OBR.scene.items.updateItems(
        visualisationsAfter,
        items => items.forEach(i => i.metadata[getPluginId("counterIndex")] -= 1)
    );
}
