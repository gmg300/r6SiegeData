import { WebhookClient } from 'discord.js';
import { ProcessData } from './processData.js';

export class SendMessage {
    WEBHOOK_URL = "https://discord.com/api/webhooks/1218372312747737149/HC5AsZs1k0cEfNmCVo5L2y7Lxd5tBL5edQ-vp2BGKruQHrP6jTwXE3N4HlWKiwvf5xi5";
    TEST_WEBHOOK_URL = "https://discord.com/api/webhooks/1218380557168279593/yUz6f8iW5V8QPdD3St36JBxnEvnduOYJC3lRvWk_57893zjiYql57SD7D5X8IiGCYmaO";

    constructor({ test = true, seasonId, flags }) {
        this.seasonId = seasonId;
        this.template = null;
        this.flags = flags;
        this.client = this.getWebhookClient(test);
    }

    getWebhookClient(test) {
        const url = test ? this.TEST_WEBHOOK_URL : this.WEBHOOK_URL;
        return new WebhookClient({ url });
    }

    getData() {
        const processor = new ProcessData({ 
            seasonId: this.seasonId,
            template: 'weekly'
        });
       const rawData = processor.loadData(processor.seasonId);
       this.template = processor.loadTemplate(processor.template);
       return processor.buildData(rawData, this.template);
    }

    buildContent() {
        const title = `# ${this.seasonId} Siege Stats ([Full Stats](https://google.com)):`;
        const data = this.getData();
        let content = '';

        for (const object of data) {
            content += `## __${object["Name"]}__\n`;
            for (const item in object) {
                if (item !== 'Name' && item !== 'Id') {
                    content += `- **${item}:** ${object[item]}\n`;
                }
            }
            content += '\n';
        }
        return `${title}\n${content}`;
    }

    send() {
        console.log("Sending message...");
        this.client.send({
            content: this.buildContent(),
            avatarURL: 'https://i.imgur.com/a/kXRSA',
        });
    }
}