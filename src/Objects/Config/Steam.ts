import DataObjectMap from '../DataObjectMap.js'
import BaseDataObject from '../BaseDataObject.js'
import {SettingSteamGame} from '../Setting/Steam.js'

export class ConfigSteam extends BaseDataObject {
    steamWebApiKey: string = ''
    steamUserId: string = ''
    playerSummaryIntervalMs: number = 60000
    achievementsIntervalMs: number = 60000
    ignoreAchievementsOlderThanHours: number = 72
    ignoredAppIds: string[] = []
    achievementDiscordFooter: string = 'Progress: %progress, global rate: %rate'
    achievementTwitchChatMessage: string = '🔓 Achievement %progress unlocked: %name (%text, 🌍 %rate)'
}

DataObjectMap.addRootInstance(
    new ConfigSteam(),
    'Loading player and game data from the Steam Web API requires API keys set in credentials.\nGet your Steam Web API Key here: https://steamcommunity.com/dev\nGet your Steam User ID from https://steamid.io or https://www.steamidfinder.com.',
    {
        steamWebApiKey: 'API Key for loading Steam user data.',
        steamUserId: 'The decimal 64bit ID of the Steam user to load data for.\nSee main description for where to get this.',
        playerSummaryIntervalMs: 'Interval in milliseconds in between loads of the player summary, which will provide the current running app ID for non-VR users.\n\nSet this to 0 to disable.',
        achievementsIntervalMs: 'Interval in milliseconds in between loads of achievements for the currently running game.\n\nSet this to 0 to disable.',
        ignoreAchievementsOlderThanHours: 'How old an achievement can be and still get announced.',
        ignoredAppIds: 'These app IDs will be ignored for all app ID dependent features.',
        achievementDiscordFooter: 'The information in the footer of achievement posting to Discord.\n\nText replacements:\n- current/total achievements unlocked\n- achievement global rate',
        achievementTwitchChatMessage: 'The message written in chat when a new achievement is unlocked.\n\nText replacements:\n- current/total achievements unlocked\n- achievement name\n- achievement description\n- achievement global rate'
    }, {
        steamWebApiKey: 'string|secret',
        steamUserId: 'string|secret',
        ignoredAppIds: SettingSteamGame.refIdKeyLabel('title')
    }
)