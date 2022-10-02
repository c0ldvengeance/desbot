import {LOCAL_STORAGE_AUTH_KEY} from '../Classes/data.js'
import Utils from '../widget/utils.js'
import Color from './colors.js'
import SettingBaseObject from '../Classes/settings.js'

export default class DB {
    private static LOG_GOOD_COLOR: string = Color.BlueViolet
    private static LOG_BAD_COLOR: string = Color.DarkRed

    private static _settingsDictionaryStore: Map<string, { [key:string]: any }> = new Map() // Used for storing keyed settings in memory before saving to disk
    private static _settingsArrayStore: Map<string, any[]> = new Map() // Used for storing a list of settings in memory before saving to disk

    static async testConnection(): Promise<boolean> {
        const response = await fetch(this.getSettingsUrl(), {
            method: 'HEAD',
            headers: {
                Authorization: Utils.getAuth()
            }
        })
        return response.ok
    }

    // region Settings

    /**
     * Load settings from the database.
     * @param emptyInstance Main class to load settings for.
     * @param ignoreCache Will ignore the memory cache.
     */
    static async loadSettingsDictionary<T>(emptyInstance: T&SettingBaseObject, ignoreCache: boolean = false): Promise<{ [key: string]: T }|undefined> {
        const className = this.getClassName(emptyInstance)
        if(this.checkAndReportClassError(className, 'loadDictionary')) return undefined
        if(!ignoreCache && this._settingsDictionaryStore.has(className)) {
            return this._settingsDictionaryStore.get(className) as { [key: string]: T }
        }
        let url = this.getSettingsUrl(className)
        const response = await fetch(url, {
            headers: await this.getAuthHeader()
        })
        const result = response.ok ? await response.json() as { [key: string]: T } : undefined;
        if(result) {
            // Convert plain objects to class instances and cache them
            for(const [key, setting] of Object.entries(result)) {
                result[key] = emptyInstance.__new(setting) as T&SettingBaseObject
            }
            this._settingsDictionaryStore.set(className, result)
        }
        return result
    }

    /**
     * Loads an entire array of settings.
     * @param emptyInstance
     * @param ignoreCache
     */
    static async loadSettingsArray<T>(emptyInstance: T&SettingBaseObject, ignoreCache: boolean = false): Promise<T[]|undefined> {
        const className = this.getClassName(emptyInstance)
        if(this.checkAndReportClassError(className, 'loadArray')) return undefined
        if(!ignoreCache && this._settingsArrayStore.has(className)) {
            return this._settingsArrayStore.get(className) as T[]
        }
        let url = this.getSettingsUrl(className)
        const response = await fetch(url, {
            headers: await this.getAuthHeader()
        })
        let result = response.ok ? await response.json() as T[]|{ [key:string]: T }: undefined
        if(result && !Array.isArray(result)) result = Object.values(result) as T[]
        if(result) {
            // Convert plain objects to class instances and cache them
            for(let i=0; i<result.length; i++) {
                result[i] = emptyInstance.__new(result[i]) as T & SettingBaseObject
            }
            this._settingsArrayStore.set(className, result)
        }
        return result
    }

    /**
     * Loads one specific setting from a dictionary of settings.
     * @param emptyInstance
     * @param key Supply a value for this to get one specific post.
     * @param ignoreCache
     */
    static async loadSetting<T>(emptyInstance: T&SettingBaseObject, key: string, ignoreCache: boolean = false): Promise<T|undefined> {
        const className = this.getClassName(emptyInstance)
        if(this.checkAndReportClassError(className, 'loadSingle')) return undefined
        if(!ignoreCache && this._settingsDictionaryStore.has(className)) {
            const dictionary = this._settingsDictionaryStore.get(className) as { [key:string]: T }
            if(dictionary && Object.keys(dictionary).indexOf(key) !== -1) {
                return dictionary[key]
            }
        }
        let url = this.getSettingsUrl(className, key)
        const response = await fetch(url, {
            headers: await this.getAuthHeader()
        })
        let result: T|undefined = response.ok ? await response.json() as T : undefined
        if(result) {
            // Convert plain object to class instance and cache it
            if(!this._settingsDictionaryStore.has(className)) this._settingsDictionaryStore.set(className, {})
            const dictionary = this._settingsDictionaryStore.get(className)
            result = emptyInstance.__new(result) as T&SettingBaseObject
            if(dictionary) dictionary[key] = result
        }
        return result
    }

    static async loadSettingClasses(): Promise<string[]> {
        const url = this.getSettingsUrl()
        const response = await fetch(url, {
            headers: await this.getAuthHeader()
        })
        return response.ok ? await response.json() : []
    }

    /**
     * Save a setting to the database.
     * @param setting Should be a class instance to work, as the name of the class is used to categorize the setting.
     * @param key
     */
    static async saveSetting<T>(setting: T&SettingBaseObject, key?: string): Promise<boolean> {
        const className = setting.constructor.name
        if(this.checkAndReportClassError(className, 'saveSingle')) return false
        let url = this.getSettingsUrl(className, key)
        const response = await fetch(url, {
            headers: await this.getAuthHeader(true),
            method: 'POST',
            body: JSON.stringify(setting)
        })
        if(response.ok) {
            if(key) {
                if(!this._settingsDictionaryStore.has(className)) this._settingsDictionaryStore.set(className, {})
                const dictionary = this._settingsDictionaryStore.get(className)
                if(dictionary) dictionary[key] = setting
            } else {
                if(!this._settingsArrayStore.has(className)) this._settingsArrayStore.set(className, [])
                const arr = this._settingsArrayStore.get(className)
                if(arr) arr.push(setting)
            }
        }
        Utils.log(response.ok ? `Wrote '${className}' to DB` : `Failed to write '${className}' to DB`, response.ok ? this.LOG_GOOD_COLOR : this.LOG_BAD_COLOR)
        return response.ok
    }

    /**
     * Delete specific setting
     * @param emptyInstanceOrClassName
     * @param key
     */
    static async deleteSetting<T>(emptyInstanceOrClassName: T&SettingBaseObject|string, key: string): Promise<boolean> {
        const className = this.getClassName(emptyInstanceOrClassName)
        let url = this.getSettingsUrl(className, key)
        const response = await fetch(url, {
            headers: await this.getAuthHeader(true),
            method: 'DELETE'
        })
        if(response.ok) {
            const dictionary = this._settingsDictionaryStore.get(className)
            if(dictionary) delete dictionary[key]
        }
        Utils.log(response.ok ? `Deleted '${className}:${key}' from DB` : `Failed to delete '${className}:${key}' from DB`, response.ok ? this.LOG_GOOD_COLOR : this.LOG_BAD_COLOR)
        return response.ok
    }

    /**
     * Returns the relative path to the settings file
     * @param groupClass Main category to load.
     * @param groupKey Specific item to fetch.
     * @returns
     */
    private static getSettingsUrl(groupClass?: string, groupKey?: string): string {
        let url = './db_settings.php'
        const params: string[] = []
        if(groupClass) params.push(`groupClass=${groupClass}`)
        if(groupKey) params.push(`groupKey=${groupKey}`)
        if(params.length > 0) url += '?' + params.join('&')
        return url
    }

    private static getClassName<T>(emptyInstanceOrClassName: T&Object|string): string {
        return typeof emptyInstanceOrClassName === 'string'
            ? emptyInstanceOrClassName
            : emptyInstanceOrClassName.constructor.name
    }

    // endregion

    // region Helpers

    /**
     * Get authorization header with optional JSON content type.
     * @param addJsonHeader
     * @private
     */
    private static async getAuthHeader(addJsonHeader: boolean = false): Promise<HeadersInit> {
        const headers = new Headers()
        headers.set('Authorization', localStorage.getItem(LOCAL_STORAGE_AUTH_KEY) ?? '')
        if (addJsonHeader) headers.set('Content-Type', 'application/json; charset=utf-8')
        return headers
    }

    private static checkAndReportClassError(className: string, action: string): boolean {
        // TODO: Add callstack?
        const isProblem = className == 'Object'
        if(isProblem) {
            Utils.log(`DB: ${action} got ${className} which is invalid.`, Color.DarkRed, true, true)
        }
        return isProblem
    }

    // endregion
}