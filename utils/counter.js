const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../counters.json');

function getCounter(guildId) {
    if (fs.existsSync(COUNTER_FILE)) {
        const counters = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
        return counters[guildId] || { count: 0, lastUser: null, channelId: null };
    } else {
        return { count: 0, lastUser: null, channelId: null };
    }
}

function setCounter(guildId, count, lastUser, channelId) {
    let counters = {};
    if (fs.existsSync(COUNTER_FILE)) {
        counters = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    }
    counters[guildId] = { count, lastUser, channelId };
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counters, null, 2));
}

module.exports = { getCounter, setCounter };
