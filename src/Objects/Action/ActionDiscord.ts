import BaseDataObject from '../BaseDataObject.js'
import DataObjectMap from '../DataObjectMap.js'
import {EnumEntryType} from '../../Enums/EntryType.js'
import {ActionChat} from './ActionChat.js'

export class ActionDiscord extends BaseDataObject{
    entries: string[] = []
    entriesType = EnumEntryType.First
}

DataObjectMap.addRootInstance(
    new ActionDiscord(),
    'Send a message to a Discord channel, make sure to set a webhook URL in DiscordWebhooks for the same key.',
    {},
    {
        entries: 'string',
        entriesType: EnumEntryType.ref()
    }
)