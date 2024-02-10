

function formatLaptime(time) {
    const ms = time % 1000;
    const s = parseInt(time / 1000) % 60;
    const m = parseInt(parseInt(time / 1000) / 60);
    return `${m}:${addZeroLeft(s, 2)}.${addZeroLeft(ms, 3)}`;
}

function addZeroLeft(string, length) {
    string = string.toString();
    while (length - string.length > 0) {
        string = "0" + string;
    }
    return string;
}

window.addEventListener('load', () => {
    for (const item of document.querySelectorAll('h3.laptimeString')) {
        item.innerText = formatLaptime(Number(item.innerText));
    }
});