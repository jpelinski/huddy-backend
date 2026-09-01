import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const discord = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
    ]
})
discord.once('clientReady', () => {
    console.log(`Discord bot logged in as ${discord.user?.tag}`)
})

discord.login(process.env.DISCORD_TOKEN)

app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/event', async (req, res) => {
    const { type, discordId, data } = req.body
    try {
        const user = await discord.users.fetch(discordId)
        let message = ''
        switch (type) {
            case 'timer_finished':
                message = `Your timer |${data.timerName}| has finished!`
                break;
            case 'process_network_offline':
                message = `Netowrk connection of |${data.processName}| is offline!`
                break;
            case 'process_offline':
                message = `Your process |${data.processName}| is offline!`
                break;
        }
        await user.send(message)
        res.json({ success: true })
    } catch (error) {
        console.error('Error fetching user or sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
})
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})