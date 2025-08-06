const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const puppeteer = require('puppeteer');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const prefix = '!';
let channelId = '';
let embedColor = 0x00FF00; // Default green
let topIcon = 'https://i.imgur.com/exampleTop.png'; // Replace with your icon URL
let bottomIcon = 'https://i.imgur.com/exampleBottom.png'; // Replace with your icon URL
let bottomImage = 'https://i.imgur.com/exampleImage.png'; // Replace with your image URL

async function scrapeSytheVouches(email, password, url) {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--no-zygote'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        const page = await browser.newPage();
        await page.goto('https://www.sythe.org/login', { waitUntil: 'networkidle2' });
        await page.type('#ctrl_username', email);
        await page.type('#ctrl_password', password);
        await page.click('#ctrl_login');
        await page.waitForNavigation({ timeout: 10000 });

        await page.goto(url, { waitUntil: 'networkidle2' });
        const vouches = await page.evaluate(() => {
            const vouchElements = Array.from(document.querySelectorAll('.postbody'));
            return vouchElements.map(el => ({
                text: el.innerText,
                profile: el.querySelector('a.username')?.href || 'Unknown',
                id: el.querySelector('a.username')?.href?.match(/user-(\d+)/)?.[1] || 'Unknown'
            }));
        });

        await browser.close();
        if (vouches.length === 0) {
            console.log('No vouches found on the page.');
        }
        return vouches;
    } catch (error) {
        console.error('Scraping error:', error.message);
        return [];
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setsythechannel') {
        channelId = message.channel.id;
        message.reply('Channel set for Sythe vouches!');
    } else if (command === 'setsythecolor') {
        embedColor = parseInt(args[0], 16) || 0x00FF00;
        message.reply(`Embed color set to ${args[0] || 'default green'}!`);
    } else if (command === 'setsythetopicon') {
        topIcon = args[0] || topIcon;
        message.reply(`Top icon set to ${topIcon}!`);
    } else if (command === 'setsythebottomicon') {
        bottomIcon = args[0] || bottomIcon;
        message.reply(`Bottom icon set to ${bottomIcon}!`);
    } else if (command === 'setsythebottomimage') {
        bottomImage = args[0] || bottomImage;
        message.reply(`Bottom image set to ${bottomImage}!`);
    } else if (command === 'vouchessythe') {
        if (!channelId) return message.reply('Please set a channel with !setsythechannel first!');
        const channel = client.channels.cache.get(channelId);
        if (!channel) return message.reply('Invalid channel!');

        const vouches = await scrapeSytheVouches(process.env.SYTHE_EMAIL, process.env.SYTHE_PASSWORD, process.env.SYTHE_URL);
        if (vouches.length === 0) {
            message.reply('No vouches found or scraping failed. Check console logs or .env settings. Consider hosting adjustments if needed.');
        } else {
            vouches.forEach(vouch => {
                const embed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setAuthor({ name: 'Sythe Vouch', iconURL: topIcon })
                    .setDescription(vouch.text)
                    .addFields(
                        { name: 'Customer Profile', value: vouch.profile, inline: true },
                        { name: 'Customer ID', value: vouch.id, inline: true }
                    )
                    .setImage(bottomImage)
                    .setFooter({ text: 'Sythe Vouch', iconURL: bottomIcon });

                const button = new ButtonBuilder()
                    .setCustomId('vouch_button')
                    .setLabel('View Vouch')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(button);

                channel.send({ embeds: [embed], components: [row] });
            });
        }
    }
});

client.on('interactionCreate', interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'vouch_button') {
        interaction.reply('This is a placeholder for viewing the full vouch details!');
    }
});

client.login(process.env.BOT_TOKEN);
