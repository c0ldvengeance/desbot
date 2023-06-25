import {Option} from './Option.js'
import {OptionsMap} from './OptionsMap.js'

export class OptionTwitchRewardVisible extends Option {
    static readonly Visible = 100
    static readonly Hidden = 200
}
export class OptionTwitchRewardUsable extends Option {
    static readonly Enabled = 100
    static readonly Disabled = 200

}
export class OptionTwitchSubTier extends Option {
    static readonly Prime = 0
    static readonly Tier1 = 1000
    static readonly Tier2 = 2000
    static readonly Tier3 = 3000
}

OptionsMap.addPrototype(
    OptionTwitchRewardVisible,
    'The visibility of a Twitch reward.',
    {
        Visible: 'The reward will be visible.',
        Hidden: 'The reward will be hidden.'
    }
)
OptionsMap.addPrototype(
    OptionTwitchRewardUsable,
    'The usability of a Twitch reward.',
    {
        Enabled: 'The reward will be available to redeem.',
        Disabled: 'The reward will not be possible to redeem.'
    }
)
OptionsMap.addPrototype(
    OptionTwitchSubTier,
    'The tier of a Twitch subscription.'
)