import { ProcessData } from '../js/processData.js';

if (!process.env.npm_config_season) {
    console.error('Please input a valid season');
    process.exit(1);
}

const seasonId = process.env.npm_config_season;

const template = 'weekly';

const flags = {
    append: !!process.env.npm_config_append
};

const processor = new ProcessData({ seasonId, template, flags });
processor.run();




