import OBR, { buildImage } from "@owlbear-rodeo/sdk";

import { getPluginId } from "./util.js";
import { getSelectedToken } from "./main.js";

async function toggleMarkedDead() {
    let token = await getSelectedToken();
    if(token.metadata[getPluginId("dead")]) {
        unmarkDead(token);
    } else {
        markDead(token);
    }
}

async function unmarkDead(token) {
    let deadImage = await OBR.scene.items.getItems(
        i => i.attachedTo === token.id
            && i.metadata[getPluginId("role")]?.includes("DEAD")
    );

    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("dead")] = false;
            let previousProperties = item.metadata[getPluginId("previousProperties")];
            for(let [property, value] of Object.entries(previousProperties)) {
                item[property] = value;
            }
        }
    });

    if(deadImage) {
        await OBR.scene.items.deleteItems([deadImage[0].id]);
    }
}

function markDead(token) {
    OBR.scene.items.updateItems([token], (items) => {
        for(let item of items) {
            item.metadata[getPluginId("dead")] = true;
            item.metadata[getPluginId("previousProperties")] = {
                layer: item.layer,
                locked: item.locked
            };
            item.layer = "PROP";
            item.locked = true;
        }
    });

    let markerSize = 512;
    let marker = buildImage(
        {
            width: markerSize,
            height: markerSize,
            url: `${window.location.origin}/images/dead-marker.png`,
            mime: "image/png",
        },
        {
            offset: {
                x: token.grid.offset.x / token.image.width * markerSize,
                y: token.grid.offset.y / token.image.height * markerSize
            },
            dpi: token.grid.dpi / token.image.width * markerSize
        }
    )
        .layer("PROP")
        .attachedTo(token.id)
        .position(token.position)
        .scale(token.scale)
        .locked(true)
        .disableHit(true)
        .metadata({
            [getPluginId("role")]: ["DEAD"],
        })
        .build();
    OBR.scene.items.addItems([marker]);
}

export function addMenuItem() {
    OBR.contextMenu.create({
        id: getPluginId("context-menu"),
        icons: [
            {
                icon: "/images/dead.svg",
                label: "Mark as dead",
                filter: {
                    every: [
                        {key: "layer", value: "CHARACTER", coordinator: "||"},
                        {key: "layer", value: "MOUNT"},
                    ],
                },
            },
            {
                icon: "/images/dead.svg",
                label: "Unmark as dead",
                filter: {
                    every: [
                        {key: ["metadata", getPluginId("dead")], value: true}
                    ],
                },
            },
        ],
        onClick() { toggleMarkedDead() }
    });
}
