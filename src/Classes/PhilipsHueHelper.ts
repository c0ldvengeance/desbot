import Utils from './Utils.js'
import Color from './ColorConstants.js'
import DataBaseHelper from './DataBaseHelper.js'
import {ConfigPhilipsHue} from '../Objects/Config/ConfigPhilipsHue.js'
import {IPhilipsHueLight} from '../Interfaces/iphilipshue.js'
import {PresetPhilipsHueBulb, PresetPhilipsHuePlug} from '../Objects/Preset/PresetPhilipsHue.js'
import {ActionPhilipsHuePlug} from '../Objects/Action/ActionPhilipsHuePlug.js'
import {ActionPhilipsHueBulb} from '../Objects/Action/ActionPhilipsHueBulb.js'

export default class PhilipsHueHelper {
    private static async getBaseUrl() {
        const config = await DataBaseHelper.loadMain(new ConfigPhilipsHue())
        return `${config.serverPath}/api/${config.username}`
    }
    static async loadLights() {
        const baseUrl = await this.getBaseUrl()
        const url = `${baseUrl}/lights`
        const response = await fetch(url)
        if(response.ok) {
            const lights = await response.json() as { [key:string]: IPhilipsHueLight }
            console.log('PhilipsHue lights: ', Object.keys(lights))
            for(const [key, light] of Object.entries(lights)) {
                let preset: PresetPhilipsHueBulb|PresetPhilipsHuePlug|undefined = undefined
                if(light.config.archetype.includes('bulb')) {
                    preset = new PresetPhilipsHueBulb()
                } else if(light.config.archetype.includes('plug')) {
                    preset = new PresetPhilipsHuePlug()
                }
                if(preset != undefined) {
                    preset.name = light.name
                    await DataBaseHelper.save(preset, key)
                }
            }
        } else {
            console.warn('PhilipsHue: Unable to load lights.')
        }
    }
    static runBulbs(ids: string[], brightness: number, hue: number, saturation: number) {
        for(const id of ids) {
            const num = parseInt(id)
            if(!isNaN(num)) {
                this.setLightState(num, brightness, hue, saturation).then()
            }
        }
    }
    static async setLightState(id:number, brightness: number, hue: number, saturation: number): Promise<boolean> {
        const baseUrl = await this.getBaseUrl()
        const url = `${baseUrl}/lights/${id}/state`
        const body = {
            on: true,
            bri: brightness,
            hue: hue,
            sat: saturation
        }
        const response = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        })
        if(response.ok) {
            const result = await response.json()
            let state = true
            for(const r of result) { if(r?.success === undefined) state = false }
            Utils.log(`PhilipsHue: Set light ${id} to brightness: ${brightness}, hue: ${hue}, saturation: ${saturation}`, Color.Green)
            return state
        } else {
            Utils.log(`PhilipsHue: Error setting light ${id}  to brightness: ${brightness}, hue: ${hue}, saturation: ${saturation}, ${response.statusText}`, Color.Red)
            return false
        }
    }

    static runPlugs(ids: string[], state: boolean, originalState: boolean, duration: number = 0) {
        // TODO: Use the response from the set function to see if we should retry.
        //  Possibly also use the get state to make sure it worked.
        for(const id of ids) {
            const num = parseInt(id)
            if(!isNaN(num)) {
                this.setPlugState(num, state).then()
            }
            if(duration) {
                setTimeout(() => {
                    this.setPlugState(num, originalState).then()
                }, duration*1000)
            }
        }
    }
    static async getPlugState(id: number): Promise<boolean> {
        const baseUrl = await this.getBaseUrl()
        const url = `${baseUrl}/lights/${id}`
        const response = await fetch(url)
        if(response.ok) {
            const result = await response.json()
            let state = true
            for(const r of result) { if(r?.success === undefined) state = false }
            Utils.log(`PhilipsHue: Get state for plug ${id}: ${state}`, Color.Green)
            return state
        } else {
            Utils.log(`PhilipsHue: Error getting state for plug ${id}: ${response.statusText}`, Color.Red)
            return false
        }
    }
    static async setPlugState(id: number, state: boolean): Promise<boolean> {
        const baseUrl = await this.getBaseUrl()
        const url = `${baseUrl}/lights/${id}/state`
        const body = {on: state}
        const response = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        })
        if(response.ok) {
            const result = await response.json()
            let state = true
            for(const r of result) { if(r?.success === undefined) state = false }
            Utils.log(`PhilipsHue: Attempted to set plug ${id} to ${state}`, Color.Green)
            return state
        } else {
            Utils.log(`PhilipsHue: Error setting plug ${id} to ${state}: ${response.statusText}`, Color.Red)
            return false
        }
    }
}