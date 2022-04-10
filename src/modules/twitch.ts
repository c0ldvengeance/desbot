class Twitch{
    private _twitchChatIn: TwitchChat = new TwitchChat()
    public _twitchChatOut: TwitchChat = new TwitchChat()
    private _twitchPubsub: TwitchPubsub = new TwitchPubsub()
    private _cooldowns: Map<string, number> = new Map()
    private LOG_COLOR_COMMAND: string = 'maroon'

    async init(initChat: boolean = true, initPubsub: boolean = true) {
        if(initChat) {
            this._twitchChatIn.init(Config.twitch.channelName)
            this._twitchChatOut.init(Config.twitch.chatbotName)
        }
        if(initPubsub) this._twitchPubsub.init()
        this._twitchChatIn.registerChatMessageCallback((message) => {
            this.onChatMessage(message)
        })
        this._twitchPubsub.setOnRewardCallback((id, message) => {
            this.onReward(id, message)
        })
    }

    private _rewards: ITwitchReward[] = []
    registerReward(twitchReward: ITwitchReward) {
        const existingRewardIndex = this._rewards.findIndex((reward) => reward.id == twitchReward.id )
        if(existingRewardIndex > -1) this._rewards.splice(existingRewardIndex, 1)
        this._rewards.push(twitchReward)
    }

    private _commands: ITwitchSlashCommand[] = []
    registerCommand(twitchSlashCommand: ITwitchSlashCommand) {
		if(twitchSlashCommand.trigger.length != 0) {
            // Use Default permission if none were provided.
            const permissions = Config.controller.commandPermissionsOverrides[twitchSlashCommand.trigger]
            if(permissions == undefined) twitchSlashCommand.permissions = {}
            twitchSlashCommand.permissions = { ...Config.controller.commandPermissionsDefault, ...permissions, ...twitchSlashCommand.permissions }
           
            // Store the command
            this._commands.push(twitchSlashCommand)
            const who: string[] = []
            if(twitchSlashCommand.permissions.everyone) who.push('everyone')
            if(twitchSlashCommand.permissions.subscribers) who.push('subs')
            if(twitchSlashCommand.permissions.VIPs) who.push('VIPs')
            if(twitchSlashCommand.permissions.moderators) who.push('mods')
            if(twitchSlashCommand.permissions.streamer) who.push('streamer')
            const message = `Registering Slash Command: <${twitchSlashCommand.trigger}> for ${who.join(' + ')}`
            Utils.logWithBold(message, this.LOG_COLOR_COMMAND)
        } else {
            Utils.logWithBold('Skipped registering a slash command!', this.LOG_COLOR_COMMAND)
        }
    }

    private _announcements: ITwitchAnnouncement[] = []
    registerAnnouncers(twitchAnnouncement: ITwitchAnnouncement) {
        this._announcements.push(twitchAnnouncement)
    }

    private _chatCheerCallback: ITwitchChatCheerCallback = (userName, messageData) => { console.warn('Twitch: Unhandled cheer message') }
    setChatCheerCallback(callback: ITwitchChatCheerCallback) {
        this._chatCheerCallback = callback
    }

    private _chatCallback: ITwitchChatCallback = (userData, messageData) => { console.warn('Twitch: Unhandled chat message') }
    setChatCallback(callback: ITwitchChatCallback) {
        this._chatCallback = callback
    }

    private _allChatCallback: ITwitchChatMessageCallback = () => { console.warn('Twitch: Unhandled chat message (all)') }
    setAllChatCallback(callback: ITwitchChatMessageCallback) {
        this._allChatCallback = callback
    }

    private _allRewardsCallback: ITwitchRewardRedemptionCallback = () => { console.warn('Twitch: Unhandled reward redemption (all)') }
    setAllRewardsCallback(callback: ITwitchRewardRedemptionCallback) {
        this._allRewardsCallback = callback
    }
    
    private onReward(id:string, message:ITwitchRedemptionMessage) {
        this._allRewardsCallback(message)
        let reward = this._rewards.find(reward => id == reward.id)
        if(reward?.callback) reward.callback(message)
        else console.warn(`Reward not found: ${id}, the key might not be in Config.twitch.autorewards!`)
    }

    private onChatMessage(messageCmd: ITwitchMessageCmd) {
        let msg = messageCmd.message
        if(msg == null) return
        let userName:string = msg.username?.toLowerCase() ?? ''
        if(userName.length == 0) return
        let text:string = msg.text?.trim() ?? ''
        if(text.length == 0) return
        const isBroadcaster = (messageCmd.properties?.badges ?? <string[]>[]).indexOf('broadcaster/1') > -1
        const isModerator = messageCmd.properties?.mod == '1' && !Config.twitch.ignoreModerators.map(name => name.toLowerCase()).includes(userName)
        const isVIP = messageCmd.properties?.badges?.match(/\b(vip\/\d+)\b/) != null
        const isSubscriber = messageCmd.properties?.badges?.match(/\b(subscriber\/\d+)\b/) != null

        // Chat proxy
        if(Config.twitch.proxyChatBotName.toLowerCase() == userName) {
            const matches = text.match(Config.twitch.proxyChatFormat)
            if(matches && matches.length == 4) {
                userName = matches[2].toLowerCase()
                text = matches[3]
                Utils.log(`Got proxy message from ${matches[1]}: ${userName} [${text.length}]`, 'purple')
            }
        }

        // User data for most callbacks
        const userData:ITwitchUserData = {
            userId: messageCmd.properties["user-id"],
            userName: userName,
            displayName: messageCmd.properties?.["display-name"],
            color: messageCmd.properties?.color,
            isModerator: isModerator,
            isVIP: isVIP,
            isSubscriber: isSubscriber,
            isBroadcaster: isBroadcaster
        }

        // For logging
        this._allChatCallback(messageCmd)
        
        // Rewards
        if(typeof messageCmd.properties['custom-reward-id'] === 'string') {
            console.log("Twitch Chat: Skipped as it's a reward.")
            return
        }

        // Commands
        if(text && text.indexOf('!') == 0) {
            let commandStr = text.split(' ').shift()?.substring(1).toLocaleLowerCase()
            let command = this._commands.find(cmd => commandStr == cmd.trigger.toLowerCase())
            let textStr = Utils.splitOnFirst(' ', text).pop()?.trim() ?? ''

            const allowedRole = command && (
                (command.permissions?.streamer && isBroadcaster)
                || (command.permissions?.moderators && isModerator) 
                || (command.permissions?.VIPs && isVIP) 
                || (command.permissions?.subscribers && isSubscriber)
                || command.permissions?.everyone
            )
            const allowedByCooldown = command != null && (
                isBroadcaster 
                || isModerator 
                || command.cooldown == undefined 
                || new Date().getTime() > (this._cooldowns.get(commandStr ?? '') ?? 0)
            )

            if(command && commandStr) {
                if(allowedRole && command.callback != undefined) {
                    command.callback(userData, textStr)
                }
                if(allowedRole && allowedByCooldown && command.cooldownCallback != undefined) {
                    command.cooldownCallback(userData, textStr)
                }
                if(command.cooldown != undefined) {
                    this._cooldowns.set(commandStr, new Date().getTime()+command.cooldown*1000)
                }
                return
            }
        }

        const bits = Utils.toInt(messageCmd.properties?.bits, 0)
        const messageData:ITwitchMessageData = {
            text: text,
            bits: bits,
            isAction: msg.isAction,
            emotes: messageCmd.properties?.emotes || []
        }

        const announcement = this._announcements.find(a => a.userNames.includes(userName))
        if(announcement) { // Announcement bots
            const firstWord = text.split(' ')[0]
            if(text.length >= 1 && announcement.triggers.indexOf(firstWord) != -1) return announcement.callback(userData, messageData, firstWord)
        } 
        else if(!isNaN(bits) && bits > 0) { // Cheers
            return this._chatCheerCallback(userData, messageData)
        } 
        else { // Normal users
            return this._chatCallback(userData, messageData)
        }
    }

    runCommand(commandStr: string) {
        Utils.log(`Run command: ${commandStr}`, Color.Purple)
        let command = this._commands.find(cmd => commandStr.toLowerCase() == cmd.trigger.toLowerCase())
        if(command?.callback) command.callback()
    }
}