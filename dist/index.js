import winston from 'winston';
import mineflayer from 'mineflayer';
import { Sequelize, DataTypes } from 'sequelize';
import shodan from 'shodan-client';
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `log_${new Date().toISOString()}.log` })
    ],
});
const sequelize = new Sequelize('sqlite://servers.db', { logging: (msg) => logger.debug(msg) });
const Server = sequelize.define('servers', {
    id: {
        type: DataTypes.STRING, primaryKey: true
    },
    ip: DataTypes.STRING,
    timestamp: DataTypes.STRING,
    org: DataTypes.STRING,
    isp: DataTypes.STRING,
    port: DataTypes.NUMBER,
    version: DataTypes.STRING,
    max_players: DataTypes.NUMBER,
    online_players: DataTypes.NUMBER,
    city: DataTypes.STRING,
    region_code: DataTypes.STRING,
    longitude: DataTypes.FLOAT,
    latitude: DataTypes.FLOAT,
    country_code: DataTypes.STRING,
    country_name: DataTypes.STRING
}, { timestamps: false });
const Whitelist = sequelize.define('whitelisted', {
    id: {
        type: DataTypes.STRING, primaryKey: true
    },
    whitelisted: DataTypes.BOOLEAN
}, { timestamps: false });
function persistWhitelist(id, isWhitelisted) {
    logger.info(`Server with id ${id} is ${isWhitelisted ? 'whitelisted' : 'not whitelisted'}`);
    const model = Whitelist.create({
        id: id,
        whitelisted: isWhitelisted
    });
}
function checkWhitelist(id) {
    logger.info(`Checking whitelist for server with id ${id}`);
    const connectionInfo = id.split(':');
    const ipAddress = connectionInfo[0];
    const port = Number(connectionInfo[1]);
    if (port != 25565) {
        return;
    }
    const bot = mineflayer.createBot({
        host: ipAddress,
        port: port,
        username: '',
        password: '',
        auth: 'microsoft'
    });
    (async () => await bot.on('spawn', () => {
        console.log('spawned');
        persistWhitelist(id, false);
        bot.quit();
    }))();
    (async () => await bot.on('kicked', () => {
        console.log('kicked');
        persistWhitelist(id, true);
        bot.quit();
    }))();
}
/**
 * Determines if the specified id is already in the `servers` table
 * @param id The id of the server in the format <ip>:<port>
 * @returns {Promise<boolean>} Whether or not id is unique to the servers table
 */
function isIdUnique(id) {
    return Server.count({ where: { id: id } })
        .then(count => {
        return count == 0;
    });
}
async function parseResult(result) {
    let id = `${result.ip_str}:${result.port}`;
    if (await isIdUnique(id)) {
        logger.info(`Found unique server with id ${id}`);
        const model = await Server.create({
            id: id,
            ip: result.ip_str,
            timestamp: result.timestamp,
            org: result.org,
            isp: result.isp,
            port: result.port,
            version: result.version,
            max_players: result.minecraft.players.max,
            online_players: result.minecraft.players.online,
            city: result.location.city,
            region_code: result.location.region_code,
            longitude: result.location.longitude,
            latitude: result.location.latitude,
            country_code: result.location.country_code,
            country_name: result.location.country_name
        });
    }
    else {
        logger.info(`Duplicate server id found skipping... (${id})`);
    }
}
function gatherServers(query, apiKey) {
    logger.info(`Searching shodan for '${query}'`);
    // shodan.search(query, apiKey, {page: 1}).then(parseResults);
    shodan.search(query, apiKey, { page: 1 }).then(res => {
        res.matches.forEach(element => {
            parseResult(element).then(() => checkWhitelist(`${element.ip_str}:${element.port}`));
        });
    });
}
async function test() {
    await sequelize.sync();
    gatherServers('minecraft 1.18', '');
}
test();
//# sourceMappingURL=index.js.map