import puppeteer from "puppeteer";

import { urls } from '../config/r6stats.js';
import { seasons } from "../config/seasonConfig.js";

export class FetchData {
    EMAIL_INPUT_HOOK = '#AuthEmail';
    PWD_INPUT_HOOK = '#AuthPassword';
    LOGIN_BUTTON_HOOK = '.btn.btn-primary.btn-block';
    CONSOLE_BUTTON_HOOK = '.g2w_groupSwitch__option';
    DATE_RANGE_DROPDOWN_HOOK = '.g2w_seasonal-picker__dropdown-date';
    MONTH_HOOK = '.rdrMonth';
    MONTH_NAME_HOOK = '.rdrMonthName';
    DATE_NUMBER_HOOK = '.rdrDayNumber';
    DATE_RANGE_DONE_BUTTON_HOOK = '.g2w_button';

    MONTH_MAP = {
        'Jan': '1',
        'Feb': '2',
        'Mar': '3',
        'Apr': '4',
        'May': '5',
        'Jun': '6',
        'Jul': '7',
        'Aug': '8',
        'Sep': '9',
        'Oct': '10',
        'Nov': '11',
        'Dec': '12'
    };

    constructor({ email, password, seasonId, flags }) {
        this.email = email;
        this.password = password;
        this.season = seasons[seasonId];
        this.startDate = this.parseDateToObject(this.season.startDate),
        this.endDate = this.parseDateToObject(this.season.endDate),
        this.flags = flags;
        this.loginUrl = urls.login_url;
        this.compareStatsUrl = urls.compare_stats_url;
        this.browser = null;
        this.page = null;
    }

    /**
     * Returns a object version of a string formatted date.
     *
     * @param {*} date A string in YYYYMMDD format
     * @returns  {object}
     */
    parseDateToObject(date) {
        if (!date) {
            const today = new Date;
            return {
                year: today.getFullYear().toString(),
                month: (today.getMonth() + 1).toString(),
                day: today.getDate().toString(),
            };
        }

        const year = Math.abs(date.substring(0, 4)).toString();
        const month = Math.abs(date.substring(4, 6)).toString();
        const day = Math.abs(date.substring(6, 8)).toString();

        return { year, month, day };
    }

    async select(hook) {
        await this.page.waitForSelector(hook);
        return await this.page.$(hook);
    }

    async click(hook) {
        const elem = await this.select(hook);
        await elem.click();
    }

    async launchBrowser(headless = false) {
        this.browser = await puppeteer.launch({
            headless,
            defaultViewport: null,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        });
        this.page = await this.browser.newPage();

        if (!headless) {
            await this.page.setViewport({width: 1200, height: 720});
        }   
    }

    async navigateToSite(url) {
        await this.page.goto(url, { waitUntil: 'networkidle0' });
    }

    async login() {
        await this.page.waitForSelector(this.EMAIL_INPUT_HOOK);
        const emailInput = await this.page.$(this.EMAIL_INPUT_HOOK);
        await emailInput.type(this.email);

        await this.page.waitForSelector(this.PWD_INPUT_HOOK);
        const passwordInput = await this.page.$(this.PWD_INPUT_HOOK);
        await passwordInput.type(this.password);

        await this.click(this.LOGIN_BUTTON_HOOK);
        await this.page.waitForNavigation();
    }

    async clickDayInRange(parentElem, dateObj) {
        const childElems = await parentElem.$$(this.DATE_NUMBER_HOOK);
        for (const elem of childElems) {
            const day = await elem.evaluate(e => e.textContent);
            if (day === dateObj.day) {
                await elem.click();
            }
        }
    }

    async setDateRange() {
        await this.page.waitForSelector(this.DATE_RANGE_DROPDOWN_HOOK);
        const [
            seasonSelector,
            dateRangeSelector
        ] = await this.page.$$(this.DATE_RANGE_DROPDOWN_HOOK);
        await dateRangeSelector.click();

        await this.page.waitForSelector(this.MONTH_HOOK);
        const monthElems = await this.page.$$(this.MONTH_HOOK);

        let startDateElem;
        let endDateElem;

        for (const elem of monthElems) {
            const date = await elem.$eval(this.MONTH_NAME_HOOK, e => e.textContent);
            const month = this.MONTH_MAP[date.substring(0, 3)];

            if (month === this.startDate.month) {
                startDateElem = elem;
            }

            if (month === this.endDate.month) {
                endDateElem = elem;
            }
        }

        await this.clickDayInRange(startDateElem, this.startDate);
        await this.clickDayInRange(endDateElem, this.endDate);

        const [
            cancelButton,
            doneButton
        ] = await this.page.$$(this.DATE_RANGE_DONE_BUTTON_HOOK);
        await doneButton.click();
    }

    async setPlayerCompare() {

    }

    async setupPage() {
        await this.click(this.CONSOLE_BUTTON_HOOK);
        await this.setDateRange();
        await this.setPlayerCompare();
    }

    async fetch() {
        await this.launchBrowser();
        await this.navigateToSite(this.loginUrl);
        await this.login();
        await this.navigateToSite(this.compareStatsUrl);
        await this.setupPage();
    }
}
