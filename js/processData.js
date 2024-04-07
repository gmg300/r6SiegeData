import fs from 'fs';
import { stringify } from 'csv-stringify';
import _ from 'lodash';

import { templates } from '../config/templates.js';

/**
 * 
 */
export class ProcessData {
    RAW_DATA_FOLDER_PATH = './rawData';
    PLAYER_CONFIG_FILE_PATH = './config/playerConfig.json';
    EXPORTS_FOLDER_PATH = './exports';
    TEMPLATES_FOLDER_PATH = './templates';

    constructor({ seasonId, template, flags }) {
        this.template = template;
        this.seasonId = seasonId;
        this.flags = flags;
        this.playerConfig = null;
        this.playerCount = 0;
        this.templatedData = [];
    }

    /**
     * Loads the play config to match raw JSON data to player name and
     * retrieve player count for averages.
     */
    loadPlayerConfig() {
        console.log("Loading Player Config...");
        const data = fs.readFileSync(this.PLAYER_CONFIG_FILE_PATH, 'utf8');
        this.playerConfig = JSON.parse(data);
        this.playerCount = Object.keys(this.playerConfig).length;
        for (const player in this.playerConfig) {
            console.log(`${this.playerConfig[player].name} - ${this.playerConfig[player].id}`)
        }
    }

    /**
     * Loads in a template for structuring the processed data.
     */
    loadTemplate(template) {
        return templates[template];
    }

    /**
     * Parses raw JSON player data from R6 and returns a JS usable array of
     * the parsed data.
     * 
     * @param {string} seasonId 
     * @returns {Array} rawData - An array of all the team member data from the R6 site
     */
    loadData(seasonId) {
        this.loadPlayerConfig();
        // this.loadTemplate();
        console.log(`Loading ${seasonId} Raw Data...`);
        const folderPath = `${this.RAW_DATA_FOLDER_PATH}/${seasonId}`;
        const fileNames = fs.readdirSync(folderPath);

        const rawData = []
        for (const fileName of fileNames) {
            const filePath = `${folderPath}/${fileName}`;
            const json = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(json);
            const { name } = this.playerConfig[data.userId]; 
            rawData.push(Object.assign(data, { name }));
        }

        return rawData;
    }

    /**
     * Transforms the processed data into the chosen data values with
     * display keys. This data can be used create a json or csv.
     * 
     * @param {Object} data Processed data
     * @returns {Object} 
     */
    buildTemplatedData(data, template) {
        console.log(`Building ${data.name}'s Game Data`);
        
        const result = {};
        for (const key in template) {
            const entry = template[key];
            result[key] = data[entry];
        }

        return result;
    }
    /**
     * Totals all processed data and divides by the player count for each
     * value.
     * 
     * @param {Object} data Processed data 
     * @returns {Object}
     */
    buildTeamData(data) {
        console.log('Building Team Data...');
        console.log('Calculating Team Totals...');
        const teamTotals = data.reduce((totals, current) => {
            for (let key in current) {
                if (!(typeof current[key] === 'string')) {
                    if (!_.isNil(current[key].value)) {
                        totals[key].value = totals[key].value + current[key].value;
                    } else {
                        totals[key] = totals[key] + current[key];
                    }
                }
            }

            return totals;
        });

        teamTotals.userId = null;
        teamTotals.name = 'Team Totals';
        teamTotals.template = null;

        console.log('Calculating Team Averages...');
        const teamAverages = {};
        for (const key in teamTotals) {
            teamAverages[key] = (teamTotals[key] / this.playerCount);
        }

        teamAverages.userId = null;
        teamAverages.name = 'Team Averages';
        teamAverages.template = null;

        return [teamTotals, teamAverages];
    }

    /**
     * Takes an array of raw data and returns only the useful entries:
     *    - Name
     *    - Id
     *    - Player stats
     * 
     * @param {Array} rawData 
     * @returns {Array} Returns processedData
     */
    processData(rawData) {
        console.log('Processing Raw Data...');
        return rawData.map(({userId, name, profileData }) => {
            const gameData = (
                profileData[userId].platforms.CONSOLE.gameModes.unranked.teamRoles.all[0]
            );

            const processedData = {};
            for (const key in gameData) {
                processedData[key] = !_.isNil(gameData[key].value) ?
                    gameData[key].value :
                    gameData[key];
            }

            return {
                userId,
                name, 
                ...processedData
            };
        });
    }

    /**
     * Processes then templates raw data to be exported.
     * 
     * @param {Array} rawData 
     * @returns {Array}
     */
    buildData(rawData, template = null) {
        console.log('Starting Data Build...');
        const processedData = this.processData(rawData);
        const templatedData = processedData.map((data) => {
            return this.buildTemplatedData(data, template);
        });
        
        const teamData = this.buildTeamData(processedData);
        teamData.forEach((data) => {
            templatedData.push(this.buildTemplatedData(data, template));
        });
        
        return templatedData;
    }

    /**
     * 
     * @param {*} templatedData 
     * @param {*} folderPath 
     */
    exportIndividualJSONData(templatedData, folderPath) {
        templatedData.forEach((data) => {
            console.log(`Exporting ${data["NAME"]} JSON DATA...`);
            const json = JSON.stringify(data, null, 4);
            const fileName = `${folderPath}/${data["Name"]}.json`;
            fs.writeFileSync(fileName, json);
        });
    }

    /**
     * 
     * @param {*} templatedData 
     * @param {*} folderPath 
     */
    exportTeamCSVData(templatedData, folderPath) {
        console.log('Exporting All Data as CSV...');
        const fileName = `${folderPath}/${this.seasonId}_team_stats.csv`;
        stringify(templatedData, { header: true }, (err, output) => {
            fs.writeFileSync(fileName, output, 'utf8');
        });
    }

    /**
     * 
     * @param {*} templatedData 
     */
    exportData(templatedData) {
        let folderPathSuffix = "";

        if (this.flags.append) {
            const timestamp = new Date().toISOString();
            folderPathSuffix = `_${timestamp}`;
        }
        
        const folderPath = `${this.EXPORTS_FOLDER_PATH}/${this.seasonId}${folderPathSuffix}`;
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        this.exportIndividualJSONData(templatedData, folderPath);
        this.exportTeamCSVData(templatedData, folderPath);
    }

    async run() {
        const rawData = this.loadData(this.seasonId);
        const template = this.loadTemplate(this.template);
        const templatedData = this.buildData(rawData, template);
        this.exportData(templatedData);
    }
}