import { WriteData } from "../js/writeData.js";

if (!process.env.npm_config_season) {
    console.error('Please input a valid season');
    process.exit(1);
}

const seasonId = process.env.npm_config_season;

const flags = {
    append: !!process.env.npm_config_append
};

const client = new WriteData({ seasonId, flags });
client.write();