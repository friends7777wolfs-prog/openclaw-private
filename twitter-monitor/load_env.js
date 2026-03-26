const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../discord-bridge/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: false });
