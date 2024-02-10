function addZeroLeft(string, length) {
    string = string.toString();
    while (length - string.length > 0) {
        string = "0" + string;
    }
    return string;
}

function formatLaptime(time) {
    const ms = time % 1000;
    const s = parseInt(time / 1000) % 60;
    const m = parseInt(parseInt(time / 1000) / 60);
    return `${m}:${addZeroLeft(s, 2)}.${addZeroLeft(ms, 3)}`;
}

module.exports = {
    addZeroLeft: addZeroLeft,
    formatLaptime: formatLaptime
}