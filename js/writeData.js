import fs from 'fs';

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export class WriteData {
    GOOGLE_DRIVE_FOLDER_ID = '1Ew3vTidXfJ2Wc3jPylVGcn60JAh320Ej';
    GOOGLE_SHEETS_VERSION = 'v4';
    GOOGLE_DRIVE_VERSION = 'v3';

    constructor({ seasonId, flags }) {
        this.seasonId = seasonId;
        this.flags = flags;
        this.sheets = this.getSheetsClient();
        this.drive = this.getDriveClient();
    }

    /**
     * Returns authentication credentials for instantiating a google api client.
     * 
     * @returns {GoogleAuth} 
     */
    get auth() {
        return new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
        })
    }

    /**
     * Retrieves a Google sheets client.
     * 
     * @returns
     */
    getSheetsClient() {
        return google.sheets({
            version: this.GOOGLE_SHEETS_VERSION,
            auth: this.auth
        });
    }

    /**
     * Retrieves a Google drive client.
     * 
     * @returns 
     */
    getDriveClient() {
        return google.drive({
            version: this.GOOGLE_DRIVE_VERSION,
            auth: this.auth
        });
    }

    /**
     * Upload CSV file to Google drive with conversion to Google sheet.
     * 
     * @return {obj} file Id
     * */
    async uploadCSVAndConvertToGoogleSheet(seasonId) {
        console.log("Uploading CSV and Converting to Google Sheet...");

        const sheetName = `${seasonId}_team_stats`;
        const readStreamPath = `./exports/${seasonId}/${sheetName}.csv`;
        const fileMetadata = {
            name: sheetName,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            convert: true,
            parents: [this.GOOGLE_DRIVE_FOLDER_ID]
        };
        const media = {
            mimeType: 'text/csv',
            body: fs.createReadStream(readStreamPath)
        };
    
        try {
            const file = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media
            });
            console.log('File Id:', file);
            return file.data.id;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Returns the spreadsheetId for the newly created google sheet.
     * 
     * @param {string} seasonId 
     * @returns {string} 
     */
    async createNewGoogleSheet(seasonId) {
        console.log(`Creating ${seasonId} google sheet...`);

        const sheetName = `${seasonId}_team_stats`;
        const sheetCreateOptions = {
            resource: {
                properties: {
                  title: sheetName
                }
            }
        };
        const result = await this.sheets.spreadsheets.create(sheetCreateOptions);

        if (result.status < 200 || result.status >= 300) {
            console.error(`The API returned an error: ${err}`);
            throw new Error(err);
        }
        
        console.log('Created a new spreadsheet:')
        console.log(result.data);
        return result.data.spreadsheetId;
    }

    /**
     * Moves the specified sheet into the Google drive folder.
     * 
     * @param {string} sheetId 
     */
    moveSheetToDrive(sheetId) {
        console.debug(sheetId)
        const driveMoveOption = {
            fileId: sheetId,
            addParents: this.GOOGLE_DRIVE_FOLDER_ID
        };

        this.drive.files.update(driveMoveOption, (err, response) => {
            if (err) {
              console.error(err);
              return;
            }

            return console.log(response);
        });
    }

    async write() {
        await this.uploadCSVAndConvertToGoogleSheet(this.seasonId);
    }
}