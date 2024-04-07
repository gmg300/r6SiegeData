import { FetchData } from "../js/fetchData.js";

if (!process.env.npm_config_season) {
    console.error('Please input a valid season');
    process.exit(1);
}

const email = process.env.email;
const password = process.env.password;
const seasonId = process.env.npm_config_season;

const flags = {
    append: !!process.env.npm_config_append
};

const client = new FetchData({ email, password, seasonId, flags });
client.fetch();