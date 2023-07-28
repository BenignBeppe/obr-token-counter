export { log, getPluginId };

function log(...message) {
    console.log(`${getPluginId()}:`, ...message);
}

function getPluginId(path) {
    return path ? `eu.sebber.token-counter/${path}` : "eu.sebber.token-counter";
}
