import DataObjectMap from '../DataObjectMap.js'
import BaseDataObject from '../BaseDataObject.js'
import {PresetPipeCustom} from '../Preset/Pipe.js'
import {SettingTwitchReward} from '../Setting/Twitch.js'
import {ActionAudio} from '../Action/ActionAudio.js'
import {PresetDiscordWebhook} from '../Preset/DiscordWebhook.js'
import {EnumScreenshotFileType} from '../../Enums/EnumScreenshotFileType.js'

export default class ConfigScreenshots extends BaseDataObject {
    SSSVRPort: number = 8807
    callback = new ConfigScreenshotsCallback()
}
export class ConfigScreenshotsCallback extends BaseDataObject {
    discordManualTitle: string = 'Manual Screenshot'
    discordRewardTitle: string = 'Photograph: %text'
    discordRewardInstantTitle: string = 'Instant shot! 📸'
    discordDefaultGameTitle: string = 'N/A'
    discordEmbedImageFormat: string = EnumScreenshotFileType.PNG
    discordWebhooksOBS: number[]|PresetDiscordWebhook[] = []
    discordWebhooksSSSVR: number[]|PresetDiscordWebhook[] = []
    signTitle: string = 'Screenshot'
    signTitle_forMs: number = 5000
    signManualSubtitle: string = 'Manual shot!'
    pipeEnabledForManual: boolean = true
    pipeEnabledForRewards: (number|string)[] = []
    pipePreset: (number|PresetPipeCustom) = 0
    pipePreset_forMs: number = 5000
    captureSoundEffect: (number|ActionAudio) = 0
    // TODO: Add the ability to post discord threads in various ways, see Trello.
}

DataObjectMap.addRootInstance(
    new ConfigScreenshots(),
    'Trigger and transmit screenshots from SuperScreenShotterVR or OBS Studio sources.',
    {
        SSSVRPort: 'Port set in SuperScreenShotterVR.',
        callback: 'Values used when posting things coming in from SSSVR & OBS to Discord etc.'
    }
)
DataObjectMap.addSubInstance(
    new ConfigScreenshotsCallback(),
    {
        discordManualTitle: 'Title for the Discord post for manually taken screenshots.',
        discordRewardTitle: 'Title for the Discord post for redeemed screenshots with a description.\n\n`%text` will be replaced with the description.',
        discordRewardInstantTitle: 'Title for the Discord post for redeemed screenshots without a description.',
        discordDefaultGameTitle: 'Backup game title in the footer when posting to Discord, only used if there is no game registered as running.',
        discordEmbedImageFormat: 'The captured image is usually PNG, if you capture a really high resolution it can go above the Discord upload limit, if so you can convert it to JPG by changing this, although it will introduce a delay due to the additional processing.',
        discordWebhooksOBS: 'Webhooks to post the resulting OBS Studio screenshot to.',
        discordWebhooksSSSVR: 'Webhooks to post the resulting SuperScreenShotterVR screenshot to.',
        signTitle: 'Title of the Sign pop-in, goes above the image, with a duration in milliseconds.',
        signManualSubtitle: 'Sub-title of the Sign pop-in for manual shots, goes beneath the image.\n\nRedeemed shots will have the subtitle be the redeemers username.',
        pipeEnabledForManual: 'Enable manual screenshots to be output to VR through the Pipe.',
        pipeEnabledForRewards: 'Keys for screenshot rewards that should be output to VR through the Pipe.',
        pipePreset: 'The Pipe preset for screenshots. Duration to display the headset overlay for in milliseconds.',
        captureSoundEffect: 'As there is not built in audio effect for OBS screenshots an option for that is provided here.\nWhy this is not relegated to the audio reward is due to the delay and burst options for screenshots which are not compatible with that feature.'
    },
    {
        discordEmbedImageFormat: EnumScreenshotFileType.ref(),
        discordWebhooksOBS: PresetDiscordWebhook.refId(),
        discordWebhooksSSSVR: PresetDiscordWebhook.refId(),
        pipeEnabledForRewards: SettingTwitchReward.refIdKeyLabel(),
        pipePreset: PresetPipeCustom.refId(),
        captureSoundEffect: ActionAudio.refId()
    }
)