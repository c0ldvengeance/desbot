import {IActionUser} from './iactions.js'
import {ITwitchPubsubRewardMessage} from './itwitch_pubsub.js'
import {ITwitchEmote, ITwitchMessageCmd} from './itwitch_chat.js'
import {TKeys} from '../_data/!keys.js'
import {IEventOptions} from './ievents.js'
import {ActionHandler} from '../widget/actions.js'

/**
 * Settings for various Twitch functions, like chat and rewards.
 */
export interface ITwitchConfig {
    /**
     * Prefix for triggering chat commands.
     */
    commandPrefix: string
    /**
     * Prefix for triggering remote chat commands.
     */
    remoteCommandPrefix: string
    /**
     * Set this to a Twitch channel name if you want to allow remote commands from a different channel.
     */
    remoteCommandChannel: string
    /**
     * Only allow remote command for these specific users.
     */
    remoteCommandAllowedUsers: string[]
    /**
     * If you are using any bots that writes in chat, you can allow them to announce things using the TTS, provide their names here.
     * 
     * It will only announce things that are using the triggers in `anouncerTriggers`.
     */
    announcerNames: string[]
    /**
     * The triggers that the announcer will use to announce things. 
     * 
     * These could be referenced in `Keys.*` and also used to trigger sound effects, as with automatic rewards.
     */
    announcerTriggers: string[]

    /**
     * Subscription types to announce in chat.
     */
    announceSubs: IAnnounceSubConfig[],

    /**
     * Cheer levels to announce in chat.
     */
    announceCheers: IAnnounceCheerConfig[],

    /**
     * The Twitch category that will be used if a game title cannot be automatically matched.
     */
    defaultGameCategory: string,

    /**
     * Manual override of game title to Twitch category for when a match is faulty or missing.
     */
    gameTitleToCategoryOverride: { [title:string]: string }

    /**
     * When using a chat proxy service, like Restream, you can use this to read the messges coming in from that bot as if it were the original user.
     */
    proxyChatBotName: string
    /**
     * A regular expression to extraxt the username and message from the proxy chat message.
     * There should be three capture groups, in order: `botname, username, message`
     * 
     * Example meant to be used with Restream: `/\[(\w*):\s(.+)\]\s(.+)/`
     */
    proxyChatFormat: RegExp
    
    /**
     * List of moderators that should not be able to execute commands, useful for bots.
     */
    ignoreModerators: string[]

    /**
     * These rewards will be switched on at widget load as well as on game change.
     * 
     * The only override is if they are also listed in {@link ITwitchConfig.alwaysOffRewards}.
     */
    alwaysOnRewards: TKeys[]
    /**
     * These rewards will always be switched off at widget load as well as on game change.
     */
    alwaysOffRewards: TKeys[]
    
    /**
     * Default for turning rewards on or off depending on Steam game.
     * Applied when no specific profile is found
     */
    rewardProfileDefault: ITwitchRewardProfileConfig
    /**
     * Default for turning rewards on or off depending on SteamVR game.
     * Applied when no specific profile is found
     */
    rewardProfileDefaultVR: ITwitchRewardProfileConfig
    /**
     * Turn rewards on or off if there is no game,
     * will be applied on top of the default profile, the configs are merged.
     */
    rewardProfileNoGame: ITwitchRewardProfileConfig

    /**
     * Turn rewards on or off depending on which SteamVR game is detected,
     * will be applied on top of the default profile, the configs are merged.
     */
    rewardProfilePerGame: { [key: string]: ITwitchRewardProfileConfig }
    /**
     * Turn on rewards depending on if a game is running, else off, if the key has not been set yet (used in a profile).
     */
    turnOnRewardForGames: IToggleRewardsOnGame
    /**
     * Turn off rewards depending on if a game is running, else on, if the key has not been set yet (used in a profile).
     */
    turnOffRewardForGames: IToggleRewardsOnGame
    /**
     * Turn on rewards for specific overlays, can be used to toggle rewards on 
     * things like LIV running as it has an overlay that is always enabled.
     */
    turnOnRewardForOverlays: { [key: string]: TKeys[] }

    /**
     * The default options values for an event if it needs to be reset on change to unlisted game.
     */
    eventOptionsDefault: IEventOptionsOverrides
    /**
     * Change the event options and update the reward (if there is one) depending on the game.
     */
    eventOptionsPerGame: { [game: string]: IEventOptionsOverrides }
}

export interface IToggleRewardsOnGame extends Partial<Record<TKeys, string[]>> {}
export interface IEventOptionsOverrides extends Partial<Record<TKeys, IEventOptions>> {}

export interface ITwitchReward {
    id?: string
    handler?: ActionHandler
}
export interface ITwitchCheer {
    bits: number
    handler?: ActionHandler
}

/**
 * The most basic command, used for remote execution.
 * 
 * Note: The actual command trigger is filled in at registration from the key used for the event.
 */
export interface ITwitchActionRemoteCommandConfig {
    /**
     * The command or commands that can be used with this trigger.
     */
    entries: string|string[]
    /**
     * Optional: The number of seconds before this can be used again, by anyone.
     */
    globalCooldown?: number
    /**
     * Optional: The number of seconds before this can be used again, by the same user.
     */
    userCooldown?: number
}
/**
 * A standard chat command.
 * 
 * Note: The actual command trigger is filled in at registration from the key used for the event.
 */
export interface ITwitchActionCommandConfig extends ITwitchActionRemoteCommandConfig {
    /**
     * The command or commands that can be used with this trigger.
     */
    entries: string|string[]
    /**
     * Permission for who can execute this command.
     */
    permissions?: ICommandPermissions
    /**
     * Optional: Require this command to include a user tag to get triggered.
     */
    requireUserTag?: boolean
    /**
     * Optional: Require this command to include exactly this number of words to get triggered.
     */
    requireExactWordCount?: number
    /**
     * Optional: Require this command to include at least this number of words to get triggered.
     */
    requireMinimumWordCount?: number
    /**
     * Optional: A title that is used when posting all help to Discord, is inserted above this command.
     */
    helpTitle?: string
    /**
     * Optional: Input values for the command, used to build the help text.
     */
    helpInput?: string[]
    /**
     * Optional: Description that is used for help documentation.
     */
    helpText?: string
}
/**
 * All these properties are added before registering the command with the Twitch class.
 */
export interface ITwitchCommandConfig extends ITwitchActionCommandConfig {
    /**
     * The command that is matched from the chat.
     */
    trigger: string
    /**
     * Optional: The handler that the command runs.
     */
    handler?: ActionHandler
    /**
     * Optional: A handler that can only be run once in every `cooldown` seconds.
     * 
     * Note: The broadcaster is exempt from cooldowns.
     */
    cooldownHandler?: ActionHandler
    /**
     * Optional: A handler that can only be run once in every `cooldown` seconds per user.
     *
     * Note: The broadcaster is exempt from cooldowns.
     */
    cooldownUserHandler?: ActionHandler
    /**
     * Optional: Only allow this command for these specific users, used for remote commands.
     */
    allowedUsers?: string[]
}

/**
 * Permission regarding who can trigger this command in the chat.
 */
export interface ICommandPermissions {
    /**
     * The channel owner/streamer.
     */
    streamer?: boolean
    /**
     * Moderators for the channel.
     */
    moderators?: boolean
    /**
     * People set to VIP in the channel.
     */
    VIPs?: boolean
    /**
     * People subscribed to the channel.
     */
    subscribers?: boolean
    /**
     * Absolutely anyone at all.
     */
    everyone?: boolean
}
export interface ITwitchAnnouncement {
    userNames: string[]
    triggers: string[]
    callback: ITwitchAnnouncementCallback
}

export interface ITwitchRewardProfileConfig {
    [key: string]: boolean
}
// Callbacks
export interface ITwitchChatCallback { // In Twitch
    (user: IActionUser, messageData: ITwitchMessageData): void
}
export interface ITwitchChatMessageCallback {
    (message: ITwitchMessageCmd): void
}
export interface ITwitchCommandCallback {
    (user: IActionUser): void
}
export interface ITwitchAnnouncementCallback {
    (user: IActionUser, messageData: ITwitchMessageData, firstWord: string): void
}
export interface ITwitchChatCheerCallback {
    (user: IActionUser, messageData: ITwitchMessageData): void
}
export interface ITwitchRewardRedemptionCallback {
    (message: ITwitchPubsubRewardMessage): void
}

// Callback data
export interface ITwitchMessageData {
    text: string
    bits: number
    isAction: boolean
    emotes: ITwitchEmote[]
}
// Announcements
export interface IAnnounceSubConfig {
    tier: number
    gift: boolean
    multi: boolean
    message: string
}
export interface IAnnounceCheerConfig {
    bits: number
    message: string
}