const fs = require("fs");
const path = require("path");
const server = require('acserver-plugin');
const db = new (require('./db'))();
const tools = require('./tools');

const config = JSON.parse(fs.readFileSync('./config.json'));
const pluginApp = new server.PluginApp();

db.init(config.SERVERDIR, config.DBDIR);


pluginApp.on(server.PROTOCOLS.NEW_CONNECTION, async (data) => {
    await db.updateUsername(data.guid, data.name);
    const record = await db.getRecord(data.guid) || { laptime: 0, laps: 0 };
    db.addConnection(data.car_id, data.guid, record.laptime, data.model, record.laps, data.name);
});

pluginApp.on(server.PROTOCOLS.CLIENT_LOADED, async (data) => {
    const record = await db.getRecord(db.getConnection(data.car_id).guid);
    if (record && record.laptime !== 0) {
        pluginApp.sendChat(data.car_id, `현재 랩타임: ${tools.formatLaptime(record.laptime)} / ${db.getCarName(record.model)}`);
    }
});

pluginApp.on(server.PROTOCOLS.CHAT, async (data) => {
    if (['!랩타임', "!laptime"].includes(data.message)) {
        const record = await db.getRecord(db.getConnection(data.car_id).guid);
        if (record && record.laptime !== 0) {
            pluginApp.sendChat(data.car_id, `현재 랩타임: ${tools.formatLaptime(car.laptime)} / ${db.getCarName(record.model)}`);
        } else {
            pluginApp.sendChat(data.car_id, '현재 기록된 랩타임이 없습니다.');
        }
    }
});

pluginApp.on(server.PROTOCOLS.CONNECTION_CLOSED, async (data) => {
    db.updateLaps(data.car_id);
    db.removeConnection(data.car_id);
});

pluginApp.on(server.PROTOCOLS.LAP_COMPLETED, async (data) => {
    db.addLap(data.car_id);
    if (data.cuts > 0) return;
    if (data.laptime < config.MINLAPTIME) return;
    const record = db.getConnection(data.car_id);
    if (record.laptime === 0) {
        pluginApp.sendChat(data.car_id, `개인 랩타임 갱신: ${tools.formatLaptime(data.laptime)}`);
        db.addLaptime(data.car_id, record.guid, record.model, data.laptime);
    } else if (data.laptime < record.laptime) {
        pluginApp.sendChat(data.car_id, `개인 랩타임 갱신: ${tools.formatLaptime(data.laptime)} (${(data.laptime - record.laptime) / 1000}s)`);
        db.updateLaptime(data.car_id, record.guid, record.model, data.laptime);
    }
});

pluginApp.on(server.PROTOCOLS.CHAT, async (data) => {
    if (db.getConnection(data.car_id).guid !== config.OWNERGUID) return;
    if (data.message.startsWith('!set')) {
        const guid = data.message.split(' ')[1];
        const laptime = data.message.split(' ')[2];
        const model = data.message.split(' ')[3];
        if (await db.getRecord(guid)) {
            db.db.run('update record set laptime=?, model=? where guid=?', [laptime, model, guid]);
        } else {
            const name = data.message.split(' ')[4];
            db.db.run('insert into record VALUES (?, ?, ?, ?, ?)', [guid, name, model, laptime, 1])
        }
        pluginApp.sendChat(data.car_id, '변경 완료' + (record ? `원 랩타임: ${record.laptime}` : ""));
    } else if (data.message.startsWith('!remove')) {
        const guid = data.message.split(' ')[1];
        const record = await db.getRecord(guid);
        db.db.run('delete from record where guid=?', [guid]);
        pluginApp.sendChat(data.car_id, '삭제 완료' + (record ? `원 랩타임: ${record.laptime}` : ""));
    }
});

pluginApp.run(config.UDPPORT);

process.on('exit', () => {
    db.close();
});


const express = require('express');

const carImages = {};
const carNames = {};

let temp = path.join(config.SERVERDIR, 'content/cars');
for (const car of fs.readdirSync(temp)) {
    try {
        fs.writeFileSync(path.join(temp, car, 'ui/ui_car.json'), fs.readFileSync(path.join(temp, car, 'ui/ui_car.json'), encoding = 'utf8').replaceAll('\\r\\n', '').replaceAll('\t', ''));
    } catch (Err) {
    }
}

if (fs.existsSync(path.join(__dirname, 'carImages'))) {
    for (const img of fs.readdirSync(path.join(__dirname, 'carImages'))) {
        carImages[img.split('.')[0]] = path.join(__dirname, 'carImages', img);
    }
}

const app = express();

app.set('view engine', 'pug');
app.set('views', './');


app.use((err, req, res, next) => {
    console.log(err);
    res.redirect('/0');
});

app.get('/img/:carName', (req, res) => {
    if (req.params.carName in carImages) {
        res.sendFile(carImages[req.params.carName]);
    } else {
        try {
            const route = path.join(config.SERVERDIR, 'content/cars', req.params.carName, 'skins/');
            const skins = fs.readdirSync(route);
            carImages[req.params.carName] = path.join(route, skins[0], 'preview.jpg');
        } catch (err) {
            res.sendFile(path.join(__dirname, 'public', 'default.jpg'));
        }
    }
});

app.get('/', (req, res) => {
    res.redirect('/0');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:page', async (req, res) => {
    if (Number(req.params.page) == NaN) {
        res.redirect('/');
        return;
    }
    const records = await db.getRankingByPage(req.params.page);
    if (records) {
        for (let i = 0; i < records.length; i++) {
            if (!(records[i].model in carNames)) {
                try {
                    const route = path.join(config.SERVERDIR, 'content/cars', records[i].model, 'ui/ui_car.json');
                    const ui_car = JSON.parse((fs.readFileSync(route, encoding = 'utf8')).replaceAll('\n', ''));
                    carNames[records[i].model] = ui_car.name;
                } catch (Err) {
                    carNames[records[i].model] = records[i].model;
                }
            }
            records[i].modelName = carNames[records[i].model];
        }
    }
    if (records === undefined && req.params.page != 0) res.redirect('/');
    else res.render('ranking', { records: records || [], title: config.WEBTITLE, track: db.trackName, page: Number(req.params.page) });
});

app.listen(config.WEBPORT, () => {
    console.log('web listening on port ' + config.WEBPORT);
});
