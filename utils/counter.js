const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../counter.json');

function getCounter() {
    if (fs.existsSync(COUNTER_FILE)) {
        return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    } else {
        return { count: 0, lastUser: null };
    }
}

function setCounter(count, lastUser) {
    const counter = { count, lastUser };
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter, null, 2));
}

module.exports = { getCounter, setCounter };
