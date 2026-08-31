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
discord.once('ready', () => {
    console.log(`Discord bot logged in as ${discord.user?.tag}`)
})

discord.login(process.env.DISCORD_TOKEN);