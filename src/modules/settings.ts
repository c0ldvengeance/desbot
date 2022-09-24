import Utils from '../widget/utils.js'
import Config from '../statics/config.js'
import {TKeys} from '../_data/!keys.js'
import {TTwitchRedemptionStatus} from '../interfaces/itwitch_pubsub.js'

export default class Settings {
    static CHANNEL_TROPHY_LABEL: string = 'channel_trophy_label.txt'
    static CHANNEL_TROPHY_STATS: string = 'channel_trophy_stats'
    static LOG_OUTPUT: string = 'log_output.html'
    static QUOTES: string = 'stream_quotes'
    static STEAM_ACHIEVEMENTS: string = 'steam_achievements/'
    static TTS_BLACKLIST: string = 'tts_blacklist'
    static TTS_DICTIONARY: string = 'tts_dictionary'
    static TTS_USER_NAMES: string = 'tts_names'
    static TTS_USER_VOICES: string = 'tts_voices'
    static TWITCH_CLIPS: string = 'twitch_clips'
    static TWITCH_REWARDS: string = 'twitch_rewards'
    static EVENT_COUNTERS_INCREMENTAL: string = 'event_counters_incremental'
    static EVENT_COUNTERS_ACCUMULATING: string = 'event_counters_accumulating'
    static TWITCH_REWARD_REDEMPTIONS: string = 'twitch_reward_redemptions'
    static TWITCH_CREDENTIALS: string = 'twitch_credentials'
    static TWITCH_USER_CHEERS: string = 'twitch_user_cheers'
    static TWITCH_USER_SUBS: string = 'twitch_user_subs'
    static WORLD_SCALE_LABEL: string = 'world_scale_label.txt'

    private static LOG_COLOR: string = 'blue'

    private static _settingsStore: Map<string, any[]> = new Map() // Used for storing settings in memory before saving to disk
    private static _settingsCache: Map<string, any[]> = new Map() // Used to periodic writing of settings that accumulate
    private static _cacheWriteIntervalHandle: number = -1

    /**
     * Will load settings off disk, to an in-memory cache, that will be used next time.
     * @param setting Key for the settings file that will be loaded.
     * @param ignoreCache Will get the value from the local cache and ignore the database.
     * @returns
     */
    static async loadSettings<T>(setting:string, ignoreCache:boolean = false):Promise<T[]|undefined> {
        if(!ignoreCache && this._settingsStore.has(setting)) {
            // console.log(`Returning cache for: ${setting}`)
            return <T[]> this._settingsStore.get(setting)
        }
        Utils.logWithBold(`Loading settings for: <${setting}>`, this.LOG_COLOR)
        let url = this.getUrl(setting)      
        let response = await fetch(url, {
            headers: {password: Utils.encode(Config.credentials.PHPPassword)}
        })
        let result: T[]|undefined = response.status >= 300 ? null : await response.json()
        if(result) {
            this._settingsStore.set(setting,  result)
        }
        return result
    }

    /**
     * Will save incoming or cached settings to disk.
     * @param setting Key for the settings file that will be saved.
     * @param settings Settings object or array, null to save cache.
     * @returns 
     */
    static async saveSettings(setting:string, settings:any=null, append:boolean=false):Promise<boolean> {
        let url = this.getUrl(setting)
        if(settings == null) settings = this._settingsStore.get(setting)
        if(settings != null) { // It can still be empty string so need explicit check
            let payload = JSON.stringify(settings)
            payload.replace(/\|/g, '').replace(/;/g, '')
            if(setting != Settings.LOG_OUTPUT) Utils.log(`Saving settings (${payload.length}b): ${setting}`, this.LOG_COLOR)
            let response = await fetch(url, {
                headers: {password: Utils.encode(Config.credentials.PHPPassword)},
                method: append ? 'put' : 'post',
                body: payload
            })
            return response.status < 300
        }
        return false
    }

    /**
     * Try to insert a value into a cached settings array and save it to disk.
     * @param setting The setting set we should try to modify.
     * @param field Match this field in the object to replace it.
     * @param value The actual object that will replace something in the array.
     * @Returns The success as a boolean.
     */
    static async pushSetting(setting:string, field:string, value:any):Promise<boolean> {
        Utils.log(`Pushing setting: ${setting}`, this.LOG_COLOR)
        let settings: any[] = this._settingsStore.get(setting) ?? []
        if(settings == null || !Array.isArray(settings)) settings = []
        let filteredSettings = settings.filter(s => (<any>s)[field] != (<any> value)[field])
        filteredSettings.push(value)
        this._settingsStore.set(setting,  filteredSettings)
        return this.saveSettings(setting)
    }

    /**
     * Push a row to the settings and save it to disk without replacing a previous row.
     * @param setting The setting we should try to modify.
     * @param value  The value we write as a new row.
     * @returns The success as a boolean.
     */
    static async pushRow(setting:string, value:any):Promise<boolean> {
        Utils.log(`Pushing row: ${setting}`, this.LOG_COLOR)
        let settings = this._settingsStore.get(setting)
        if(settings == null || !Array.isArray(settings)) settings = []
        settings.push(value)
        this._settingsStore.set(setting, settings)
        return this.saveSettings(setting)
    }

    static async appendSetting(setting: string, value: any): Promise<boolean> {
        if(!this._settingsStore.has(setting)) this._settingsStore.set(setting, [])
        this._settingsStore.get(setting)?.push(value)
        return this.saveSettings(setting, value, true)
    }

    static async appendSettingAtInterval(setting: string, value: any) {
        // Initiate interval
        if(this._cacheWriteIntervalHandle <= 0) {           
            this._cacheWriteIntervalHandle = setInterval(() => {
                const cacheClone = Utils.clone(this._settingsCache)
                this._settingsCache = new Map()
                Object.keys(cacheClone).forEach(async cacheSetting => {
                    await this.appendSetting(cacheSetting, (cacheClone.get(cacheSetting) ?? []).join('\n'))
                })                
            }, 10000)
        }

        // Add setting to cache
        if(!this._settingsCache.has(setting)) this._settingsCache.set(setting, [])
        else {
            let currentCache = this._settingsCache.get(setting)
            if(currentCache) currentCache.push(value)
            this._settingsCache.set(setting, currentCache ?? [])
        }
    }

    static async pushLabel(setting: string, value: string): Promise<boolean> {
        return this.saveSettings(setting, value)
    }

    /**
     * Try to retrieve a value from a cached settings array.
     * @param setting The setting we will try to access.
     * @param field Match this field to retrieve the object.
     * @param key The value field should match.
     * @returns The object or null if failed.
     */
    static async pullSetting<T>(setting:string, field:string, key:any, ignoreCache:boolean=false):Promise<T|undefined> {
        let settings: any[]|undefined
        if(!ignoreCache && this._settingsStore.hasOwnProperty(setting)) {
            settings = this._settingsStore.get(setting)
        } else {
            settings = await this.loadSettings<T>(setting, ignoreCache)
        }
        if(Array.isArray(settings)) return settings.find(s => s[field] == key)
        else return settings
    }

    /**
     * Returns the relative path to the settings file
     * @param setting 
     * @returns
     */
    private static getUrl(setting:string): string {
        return `./settings.php?setting=${setting}`
    }

    public static getFullSettings<T>(setting:string):T[]|undefined {
        Utils.log(`Pulling full settings: ${setting}`, this.LOG_COLOR)
        return this._settingsStore.get(setting)
    }

    public static getPathFromKey(setting: string, key:string):string {
        return setting+(key.replace(/\./g, '_'))
    }
}

// Settings
export class SettingUserVoice {
    userName: string = ''
    languageCode: string = ''
    voiceName: string = ''
    gender: string = ''
}
export class SettingUserName {
    userName: string = ''
    shortName: string = ''
    editor: string = ''
    datetime: string = ''
}
export interface SettingUserMute {
    userName: string
    active: boolean
    reason: string
}
export class SettingDictionaryEntry {
    original: string = ''
    substitute: string = ''
    editor: string = ''
    datetime: string = ''
}
export class SettingTwitchRewardPair {
    key: TKeys = 'Unknown'
    id: string = ''
}
export class SettingChannelTrophyStat {
    userId: number = 0
    index: number = 0
    cost: number = 0
}
export class SettingTwitchSub {
    userName: string = ''
    totalMonths: number = 0
    streakMonths: number = 0
}
export class SettingTwitchCheer {
    userName: string = '' // TODO: Convert to userId?
    totalBits: number = 0
    lastBits: number = 0
}
export class SettingTwitchClip {
    id: string = ''
}
export class SettingTwitchCredentials {
    userName: string = '' // TODO: Convert to userId?
    accessToken: string = ''
    refreshToken: string = ''
    clientId: string = ''
    clientSecret: string = ''
    updated: string = ''
}
export class SettingStreamQuote {
    submitter: string = ''
    author: string = ''
    quote: string = ''
    datetime: string = ''
    game: string = ''
}
export class SettingTwitchRedemption {
    userId: number = 0
    rewardId: string = ''
    redemptionId: string = ''
    time: string = ''
    status: TTwitchRedemptionStatus = 'UNFULFILLED'
    cost: number = 0
}
class SettingCounterBase {
    key: TKeys = 'Unknown'
    count: number = 0
}
export class SettingAccumulatingCounter extends SettingCounterBase {}
export class SettingIncrementingCounter extends SettingCounterBase {}

export class SettingTwitchClient {
    clientId: string = ''
    clientSecret: string = ''
    redirectUri: string = ''
}
export class SettingTwitchTokens {
    userId: number = 0
    refreshToken: string = ''
    accessToken: string = ''
    scopes: string = ''
}
export class SettingImportStatus {
    done: boolean = false
}