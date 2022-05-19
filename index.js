const winston = require('winston')
const mineflayer = require('mineflayer')
const shodan = require('shodan-client')
const {Sequelize, DataTypes} = require("sequelize");
// TODO: Accept log level from cmdline args
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: `log_${new Date().toISOString()}.log`})
    ],
});
const sequelize = new Sequelize('sqlite://servers.db', {logging: (msg) => logger.debug(msg)})

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

}, {timestamps: false});

const Whitelist = sequelize.define('whitelisted', {
    id: {
        type: DataTypes.STRING, primaryKey: true
    },
    whitelisted: DataTypes.BOOLEAN
}, {timestamps: false});


async function checkWhitelist(id) {
    logger.info(`Checking whitelist for server with id ${id}`);
    const connInfo = id.split(':');
    const ip = connInfo[0];
    const port = connInfo[1];
    const bot = mineflayer.createBot({
        host: ip,
        port: port,
        username: '',
        password: '',
        auth: 'microsoft'
    });

    bot.on('spawn', () => {
        persistWhitelist(bot, id, false);
        bot.quit();
    });
    bot.on('kicked', () => {
        persistWhitelist(bot, id, true);
        bot.quit();
    });
}

function persistWhitelist(bot, id, isWhitelisted) {
    logger.info(`Server with id ${id} is ${isWhitelisted ? 'whitelisted' : 'not whitelisted'}`);
    Whitelist.create({
        id: id,
        whitelisted: isWhitelisted
    });

}


/**
 * Determines if the specified id is already in the `servers` table
 * @param id The id of the server in the format <ip>:<port>
 * @returns {Promise<boolean>} Whether or not id is unique to the servers table
 */
function isIdUnique(id) {
    return Server.count({where: {id: id}})
        .then(count => {
            return count == 0;
        });
}

function parseResults(results) {
    let servers = []
    results.matches.forEach(element => {
        let id = `${element.ip_str}:${element.port}`;
        // If the id is unique then another server object is created and ORM'd
        isIdUnique(id).then(isUnique => {
            if (isUnique) {
                logger.info(`Found unique server with id ${id}`)
                Server.create({
                    id: id,
                    ip: element.ip_str,
                    timestamp: element.timestamp,
                    org: element.org,
                    isp: element.isp,
                    port: element.port,
                    version: element.version,
                    max_players: element.minecraft.players.max,
                    online_players: element.minecraft.players.online,
                    city: element.location.city,
                    region_code: element.location.region_code,
                    longitude: element.location.longitude,
                    latitude: element.location.latitude,
                    country_code: element.location.country_code,
                    country_name: element.location.country_name
                });
                checkWhitelist(id);
            } else {
                logger.info(`Duplicate server id found skipping... (${id})`);
            }
        });

    });
    return servers;
}

function gatherServers() {
    const query = 'minecraft 1.18'
    logger.info(`Searching shodan for '${query}'`);
    shodan.search(query, 'API_KEY', {page: 1}).then(parseResults);
}

sequelize.sync().then(() => gatherServers());
