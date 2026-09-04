import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Client, GatewayIntentBits } from 'discord.js';
import { rateLimit } from 'express-rate-limit';
import { createUser, getUserByToken } from './db.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


////////     Discord bot 
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

const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback'

////////

////////  Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
});
////////

//////// Redirect to Discord OAuth
app.get('auth/discord', (_req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify'
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
})
////////

//////// Discord OAuth callback
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
            grant_type: 'authorization_code',
            code: code as string,
            redirect_uri: REDIRECT_URI,
        })
    });
    const tokenData = await tokenResponse.json() as { access_token: string }
    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json() as { id: string, username: string }

    const userToken = crypto.randomBytes(32).toString('hex');

    createUser(userData.id, userToken, userData.username)

    res.redirect(`huddy://auth?token=${userToken}&username=${userData.username}`)
})
////////

////////  Event endpoint
app.post('/event', async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const user = getUserByToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const discordId = user.discord_id
    const { type, data } = req.body

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
////////

//////// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
////////

////////    Rate limiters
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    message: { error: 'Too many requests' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 h
    max: 10,
    message: {
        error: 'Too many attempts'
    }
});
app.use(globalLimiter);
app.use('/auth', authLimiter);

///////
