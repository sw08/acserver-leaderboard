const fs = require("fs");
const path = require("path");
const sql = require('sqlite3').verbose();
const ini = require('ini');
const cache = require('node-cache');

class DB {
    init(serverDir, dbFileDir) {
        this.config = ini.parse(fs.readFileSync(path.join(serverDir, 'cfg', 'server_cfg.ini'), 'utf-8'));
        this.connection = [];
        for (let i = 0; i < this.config.SERVER.MAX_CLIENTS; i++) {
            this.connection.push({
                guid: undefined,
                laptime: undefined,
                model: undefined,
                car_id: i,
                laps: undefined,
                name: undefined,
            });
        }
        try {
            const track = JSON.parse(fs.readFileSync(path.join(serverDir, 'content', 'tracks', this.config.SERVER.TRACK, 'ui', 'ui_track.json')));
            this.trackName = track.name;
        } catch {
            this.trackName = this.config.SERVER.TRACK;
        }
        this.db = new sql.Database(path.join(dbFileDir, this.config.SERVER.TRACK + '.db'));
        this.db.serialize(() => {
            this.db.run('create table if not exists record (guid INTEGER PRIMARY KEY, name TEXT, model TEXT, laptime INTEGER, laps INTEGER)');
            this.db.run('create index if not exists laptimeIndex on record(laptime ASC)');
        });
        this.cache = new cache({ stdTTL: 1800 });
        this.ranking = new cache({ stdTTL: 600, checkperiod: 300 });
    }
    addLap(car_id) {
        this.connection[car_id].laps++;
    }
    removeConnection(car_id) {
        this.connection[car_id] = {
            guid: undefined,
            laptime: undefined,
            model: undefined,
            car_id: car_id,
            laps: undefined,
            name: undefined
        };
    }
    addConnection(car_id, guid, laptime, model, laps, name) {
        this.connection[car_id] = {
            guid: guid,
            laptime: laptime,
            model: model,
            car_id: car_id,
            laps: laps,
            name: name
        };
    }
    getConnection(car_id) {
        return this.connection[car_id];
    }
    getRecord(guid) {
        return new Promise((resolve, reject) => {
            const cacheRecord = this.cache.get(guid);
            if (cacheRecord !== undefined) resolve(cacheRecord);
            this.db.get(`select * from record where guid = ${guid}`, (err, row) => {
                this.cache.set(guid, row);
                resolve(row);
            });
        });
    }
    updateUsername(guid, name) {
        return new Promise((resolve, reject) => {
            this.db.run('update record set name=? where guid=?', [name, guid], (err) => {
                resolve();
            });
        });
    }
    addLaptime(car_id, guid, model, laptime) {
        this.connection[car_id].laptime = laptime;
        const conn = this.getConnection(car_id);
        this.db.run('insert into record VALUES (?, ?, ?, ?, ?)', [guid, conn.name, model, laptime, conn.laps])
    }
    updateLaptime(car_id, guid, model, laptime) {
        this.connection[car_id].laptime = laptime;
        this.db.run('update record set laptime=? and model=? where guid=?', [laptime, model, guid]);
        this.cache.del(guid);
    }
    updateLaps(car_id) {
        const conn = this.getConnection(car_id);
        this.db.run('update record set laps=? where guid=?', [conn.laps, conn.guid]);
    }
    getCarName(model) {
        if (!this.carNames.includes(model)) {
            try {
                const car = JSON.parse(fs.readFileSync(path.join(serverDir, 'content', 'cars', model, 'ui', 'ui_car.json')));
                this.carNames[model] = car.name;
            } catch {
                this.carNames[model] = model;
            }
        }
        return this.carNames[model];
    }
    close() {
        this.db.close();
    }
    getRankingByPage(page) {
        return new Promise((resolve, reject) => {
            const cacheRanking = this.ranking.get(page);
            if (cacheRanking !== undefined) resolve(cacheRanking);
            this.db.all(`select name, model, laptime, laps from record order by laptime asc`, (err, rows) => {
                for (let i = 0; i < parseInt(rows.length / 25) + (rows.length % 25 === 0 ? 0 : 1); i++) {
                    if (rows.length < 25 * (i + 1)) this.ranking.set(i, rows.slice(25 * i));
                    else this.ranking.set(i, rows.slice(25 * i, 25 * i + 25));
                }
                resolve(this.ranking.get(page));
            });
        });
    }
}

module.exports = DB;
