export function log(...message) {
    console.log(`${getPluginId()}:`, ...message);
}

export function getPluginId(path) {
    return path ? `eu.sebber.token-counter/${path}` : "eu.sebber.token-counter";
}
