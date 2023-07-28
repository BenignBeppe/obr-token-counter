export { updateVisualisation, addVisualistaion, removeVisualisation, getVisualisation };

import OBR, { buildText } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./util.js";

const VISUALISATION = "VISUALISATION";

async function updateVisualisation(token) {
    let visualisation = await getVisualisation(token);
    if(!visualisation.length) {
        return;
    }

    // We need to get the up to date value for the token. The one in
    // the parameter may be anold one.
    token = await OBR.scene.items.getItems([token.id]);
    let value = token[0].metadata[getPluginId("value")];
    OBR.scene.items.updateItems(visualisation, (items) => {
        for (let item of items) {
            item.text.plainText = value;
        }
    });
}

async function getVisualisation(token) {
    let visualisation = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id &&
            i.metadata[getPluginId("role")] === VISUALISATION
    );
    return visualisation;
}

async function createVisualisation(token) {
    let gridDpi = await OBR.scene.grid.getDpi();
    // TODO: Make position work with offset that isn't half of width and height.
    let imageWidth = (token.image.width / token.grid.dpi) * gridDpi;
    let x = token.position.x - (imageWidth / 2) * token.scale.x;
    let imageHeight = (token.image.height / token.grid.dpi) * gridDpi;
    let y = token.position.y - (imageHeight / 2) * token.scale.y;
    let position = {x: x, y: y};
    let item = buildText()
        .textType("PLAIN")
        .position(position)
        .fontSize(40)
        .fontWeight(700)
        .strokeColor("black")
        .strokeWidth(2)
        .attachedTo(token.id)
        .locked(true)
        .metadata({[getPluginId("role")]: VISUALISATION})
        .build();
    await OBR.scene.items.addItems([item]);
}

async function addVisualistaion(token) {
    let visualisation = await getVisualisation(token);
    if(visualisation.length) {
        return;
    }

    await createVisualisation(token);
    updateVisualisation(token);
}

async function removeVisualisation(token) {
    let visualisation = await getVisualisation(token);
    if(!visualisation.length) {
        return;
    }

    let ids = visualisation.map(i => i.id);
    OBR.scene.items.deleteItems(ids);
}
