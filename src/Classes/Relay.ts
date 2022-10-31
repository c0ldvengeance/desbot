import WebSockets from './WebSockets.js'
import Config from '../ClassesStatic/Config.js'
import Utils from '../ClassesStatic/Utils.js'
import Color from '../ClassesStatic/Colors.js'

export default class Relay {
    private readonly _logColor = Color.ForestGreen
    private readonly _socket: WebSockets
    private _authorized: boolean = false
    private readonly _prefix = ':::'
    private readonly _channel: string
    private readonly _password: string
    private readonly _onMessageCallback: IOnRelayMessageCallback = (result)=>{ console.warn(`Unhandled Relay message: ${JSON.stringify(result)}`) }
    constructor(channel: string, password: string, onMessageCallback: IOnRelayMessageCallback) {
        this._channel = channel
        this._password = password
        this._onMessageCallback = onMessageCallback
        this._socket = new WebSockets(`ws://localhost:${Config.relay.port}`, 10, true)
        this._socket._onOpen = this.onOpen.bind(this)
        this._socket._onClose = this.onClose.bind(this)
        this._socket._onMessage = this.onMessage.bind(this)
        this._socket._onError = this.onError.bind(this)
    }
    init() {
        this._socket.init()
    }

    private onOpen(evt: Event) {
        Utils.log(`Connected to Relay, joining #${this._channel}...`, this._logColor)
        this._socket.send(`${this._prefix}CHANNEL:${this._channel}`)
    }
    private onMessage(evt: MessageEvent) {
        let message = evt.data as string
        if(message.startsWith(this._prefix)) {
            // Check if command
            message = message.substring(3) // Remove prefix
            const messageArr = message.split(':')
            if(messageArr.length == 3 && messageArr[1].length > 0) {
                switch(messageArr[0]) {
                    case 'SUCCESS':
                        const code = parseInt(messageArr[1])
                        if(code < 20) {
                            // 10: Connected to channel
                            // 11: Already connected to a channel
                            Utils.log(`Entered #${this._channel}, doing authorization...`, this._logColor)
                            this._socket.send(`${this._prefix}PASSWORD:${this._password}`)
                        } else if(code < 30) {
                            // 20: Password created
                            // 21: Authorized
                            // 22: Already authorized
                            this._authorized = true
                            Utils.log('Relay authorized, ready for use!', this._logColor, true)
                        }
                        break
                    case 'ERROR':
                        console.warn("Relay Error", messageArr)
                        this._authorized = false
                        this._socket.disconnect() // Just start the flow over, hope for the best!
                        break
                    default: console.error(messageArr)
                }
            } else {
                Utils.log(`Relay received unhandled command response: ${message}`, Color.Red)
            }
            return
        }

        let json: any = undefined
        try {
            json = JSON.parse(message)
        } catch (e) {
            console.warn(`Relay got garbage: ${message}`)
        }
        if(json != undefined) {
            this._onMessageCallback(json)
        }
    }
    private onError(evt: Event) {
        // console.table(evt)
    }

    private onClose(event: Event) {
        this._authorized = false
    }
}

export interface IRelayConfig {
    port: number
    streamDeckChannel: string
}

export interface IOnRelayMessageCallback {
    (result: any): void
}