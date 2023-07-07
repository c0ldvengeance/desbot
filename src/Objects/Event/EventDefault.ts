import DataMap from '../DataMap.js'
import Data from '../Data.js'
import {OptionEventBehavior} from '../../Options/OptionEventBehavior.js'
import Trigger from '../Trigger.js'
import Action from '../Action.js'
import {OptionEventRun} from '../../Options/OptionEventRun.js'

export class EventDefault extends Data {
    options: EventOptions = new EventOptions()
    triggers: (number|Trigger)[] = []
    actions: EventActionContainer[] = []

    enlist() {
        DataMap.addRootInstance(new EventDefault(),
            'The event that contains triggers and actions.',
            {
                options: 'Set various options for event behavior.',
                triggers: 'Supply in which ways we should trigger this event.',
                actions: 'Provide which actions to execute when this event is triggered.'
            },
            {
                triggers: Data.genericRef('Trigger'),
                actions: EventActionContainer.ref()
            }
        )
    }
}

export class EventOptions extends Data {
    behavior = OptionEventBehavior.All
    accumulationGoal: number = 0
    multiTierTimeout: number = 0
    multiTierMaxLevel: number = 0
    multiTierDoResetActions: boolean = false
    multiTierDisableWhenMaxed: boolean = false
    resetIncrementOnCommand: boolean = false
    resetAccumulationOnCommand: boolean = false // TODO: Add capability to refund accumulations later.
    rewardIgnoreUpdateCommand: boolean = false
    rewardIgnoreClearRedemptionsCommand: boolean = false
    rewardIgnoreAutomaticDiscordPosting: boolean = false
    rewardMergeUpdateConfigWithFirst: boolean = false
    specificIndex: number = 0
    relayCanTrigger: boolean = true

    enlist() {
        DataMap.addSubInstance(new EventOptions(),
            {
                behavior: 'Set this to add special behavior to this event, usually affected by reward redemptions.',
                accumulationGoal: 'The goal to reach if behavior is set to accumulating.',
                multiTierTimeout: 'The duration in seconds before we reset the multi-tier level unless it is triggered again.',
                multiTierMaxLevel: 'The maximum level we can reach with the multi-tier behavior. If this is not provided we will use the count of `triggers.reward`.',
                multiTierDoResetActions: 'Also perform actions when resetting this multi-tier event.\n\nThe level after `multiTierMaxLevel` or the level matching the count of `triggers.reward` plus one will be used.',
                multiTierDisableWhenMaxed: 'Will only allow the last level to be redeemed once before resetting again.',
                resetIncrementOnCommand: 'Will reset an incrementing reward when the reset command is run, resetting the index to 0.',
                resetAccumulationOnCommand: 'Will reset an accumulating reward when the reset command is run, resetting the index to 0.',
                rewardIgnoreUpdateCommand: 'A list of rewards that will only be created, not updated using `!update`.\n\nUsually references from: `Keys.*`, and it\'s recommended to put the channel trophy reward in here if you use it.',
                rewardIgnoreClearRedemptionsCommand: 'Will avoid refunding the redemption when the clear redemptions command is used.',
                rewardIgnoreAutomaticDiscordPosting: 'Ignore the Discord webhook for this reward even if it exists. (might be used for something else)',
                rewardMergeUpdateConfigWithFirst: 'Merge the current reward config onto the first default config in the array.',
                specificIndex: 'Provide an index to use when not using a specific event behavior. This can be overridden at runtime, and it will be respected.',
                relayCanTrigger: 'If this event can be triggered by messages from WSRelay.'
            },
            {
                behavior: OptionEventBehavior.ref()
            }
        )
    }
}
export class EventActionContainer extends Data {
    run = OptionEventRun.immediately
    run_ms: number = 0
    entries: (number|Action)[] = []

    enlist() {
        DataMap.addSubInstance(new EventActionContainer(),
            {
                run: 'Choose when to run this set.',
                entries: 'The actions that will run.'
            },
            {
                run: OptionEventRun.ref(),
                entries: Action.genericRef('Action')
            }
        )
    }
}
