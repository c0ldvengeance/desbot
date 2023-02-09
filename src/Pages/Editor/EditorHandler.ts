import DataBaseHelper from '../../Classes/DataBaseHelper.js'
import Utils from '../../Classes/Utils.js'
import JsonEditor from './JsonEditor.js'
import BaseDataObject from '../../Objects/BaseDataObject.js'
import DataObjectMap from '../../Objects/DataObjectMap.js'
import ImportDataObjectClasses from '../../Objects/ImportDataObjectClasses.js'

export default class EditorHandler {
    private _state = new EditorPageState()

    private readonly _labelSaveButton = '💾 Save (ctrl+s)'
    private readonly _labelSaveNewButton = '✨ Save New (ctrl+s)'
    private readonly _labelDeleteButton = '💥 Delete'
    private _unsavedChanges: boolean = false

    static readonly MainKey = 'Main'
    public constructor() {
        ImportDataObjectClasses.init()
        const queryString = window.location.search
        const urlParams = new URLSearchParams(queryString)
        if(urlParams.has('k')) this._state.groupKey = decodeURIComponent(urlParams.get('k') ?? '')
        if(urlParams.has('c')) this._state.groupClass = decodeURIComponent(urlParams.get('c') ?? '')
        let group = urlParams.get('g') ?? this._state.groupClass.substring(0,1).toLowerCase()
        switch(group) {
            case 's': this._state.likeFilter = 'Setting'; break
            case 'c': this._state.likeFilter = 'Config'; this._state.forceMainKey = true; break
            case 'p': this._state.likeFilter = 'Preset'; break
            case 'e': this._state.likeFilter = 'Event'; break
            default: group = ''
        }
        this._state.group = group

        this.updateSideMenu().then()
        if(this._state.groupClass.length > 0) this.showListOfItems(this._state.groupClass, this._state.groupKey).then()

        window.onkeydown = (event)=>{
            if(event.key == 's' && event.ctrlKey) {
                if(event.cancelable) event.preventDefault()
                this._editorSaveButton?.click()
            }
        }
        window.onpopstate = (event)=>{
            if(event.state) {
                this._state = event.state
                this.updateSideMenu().then()
                this.showListOfItems(this._state.groupClass, this._state.groupKey, true).then()
            }
        }
    }

    private _sideMenuDiv: HTMLDivElement|undefined
    async updateSideMenu() {
        if(!this._sideMenuDiv) {
            this._sideMenuDiv = document.querySelector('#side-bar') as HTMLDivElement
        }
        const classesAndCounts = await DataBaseHelper.loadClasses(this._state.likeFilter)
        for(const className of DataObjectMap.getNames(this._state.likeFilter)) {
            if(!classesAndCounts.hasOwnProperty(className)) {
                // Add missing classes so they can still be edited
                classesAndCounts[className] = 0
            }
        }

        const title = document.createElement('h3') as HTMLHeadingElement
        title.innerHTML = 'List' // TODO: Customizable?
        this._sideMenuDiv.replaceChildren(title)
        for(const [group,count] of Object.entries(classesAndCounts).sort()) {
            const link = document.createElement('span') as HTMLSpanElement
            const name = Utils.camelToTitle(group, true)
            const a = document.createElement('a') as HTMLAnchorElement
            a.href = '#'
            a.innerHTML = `${name}</a>: <strong>${count}</strong>`
            a.onclick = (event: Event) => {
                if(event.cancelable) event.preventDefault()
                this.showListOfItems(group).then()
            }
            link.appendChild(a)
            link.appendChild(document.createElement('br') as HTMLBRElement)
            this._sideMenuDiv.appendChild(link)
        }
    }

    private _contentDiv: HTMLDivElement|undefined
    private _editor: JsonEditor|undefined
    private _editorSaveButton: HTMLButtonElement|undefined
    private async showListOfItems(group: string, selectKey: string = '', skipHistory: boolean = false) {
        if(!this.promptNavigateAway()) return
        this._state.groupClass = group
        this._state.groupKey = selectKey
        if(!skipHistory) {
            this.updateHistory()
        }

        if(!this._contentDiv) {
            this._contentDiv = document.querySelector('#content') as HTMLDivElement
        }

        // Title
        const title = document.createElement('h2') as HTMLHeadingElement
        title.innerHTML = Utils.camelToTitle(group, true)

        // Description
        const description = document.createElement('p') as HTMLParagraphElement
        description.innerHTML = DataObjectMap.getMeta(group)?.description ?? 'No description.'

        // Dropdown & editor
        const editorContainer = document.createElement('div') as HTMLDivElement
        editorContainer.id = 'editor-container'
        this._editor = new JsonEditor()
        this._editor.setModifiedStatusListener(this.updateModifiedState.bind(this))
        let currentKey = selectKey

        const dropdown = document.createElement('select') as HTMLSelectElement
        const dropdownLabel = document.createElement('label') as HTMLLabelElement
        const updateEditor = (event: Event|undefined, clear: boolean = false, markAsDirty: boolean = false, skipHistory: boolean = false, forceNavigation: boolean = false): boolean =>{
            if(!forceNavigation && !this.promptNavigateAway()) return false
            let instance: BaseDataObject|undefined = undefined
            if(clear) {
                currentKey = this._state.forceMainKey ? EditorHandler.MainKey : ''
                instance = DataObjectMap.getInstance(group, {})
                if(!this._state.forceMainKey) editorSaveButton.innerHTML = this._labelSaveNewButton
            } else {
                currentKey = this._state.forceMainKey ? EditorHandler.MainKey : dropdown.value
                if(currentKey.length > 0) {
                    instance = DataObjectMap.getInstance(group, items[currentKey] ?? {}) ?? items[currentKey] // The last ?? is for test settings that has no class.
                } else {
                    instance = DataObjectMap.getInstance(group, {})
                }
                editorSaveButton.innerHTML = this._labelSaveButton
            }
            if(instance) {
                this._state.groupKey = currentKey
                if(!skipHistory) {
                    this.updateHistory()
                }
                editorContainer.replaceChildren(this._editor?.build(currentKey, instance, markAsDirty, this._state.forceMainKey) ?? '')
            }
            return true
        }

        const items = await DataBaseHelper.loadJson(group)
        if(this._state.forceMainKey) {
            dropdown.style.display = 'none'
            dropdownLabel.style.display = 'none'
            updateEditor(undefined, true, false, skipHistory)
        } else {
            dropdown.id = 'dropdown'
            dropdownLabel.htmlFor = dropdown.id
            dropdownLabel.innerText = 'Entries: '
            if(this._contentDiv && items) {
                for(const key of Object.keys(items)) {
                    const option = document.createElement('option') as HTMLOptionElement
                    option.innerText = key
                    option.value = key
                    if(selectKey == key) option.selected = true
                    dropdown.appendChild(option)
                }
            }
            // dropdown.onblur = updateEditor
            dropdown.onclose = updateEditor
            dropdown.onchange = updateEditor
        }

        // New button
        const editorNewButton = document.createElement('button') as HTMLButtonElement
        editorNewButton.classList.add('editor-button', 'new-button')
        editorNewButton.innerHTML = '✨ New'
        editorNewButton.title = 'And new entry'
        editorNewButton.onclick = async (event)=>{
            updateEditor(undefined, true)
        }

        // Reset button
        const editorResetButton = document.createElement('button') as HTMLButtonElement
        editorResetButton.classList.add('editor-button', 'reset-button')
        editorResetButton.innerHTML = '🧼 Reset'
        editorResetButton.title = 'Reset to default values'
        editorResetButton.onclick = async (event)=>{
            updateEditor(undefined, true, this._state.forceMainKey)
        }

        // Reload button
        const editorReloadButton = document.createElement('button') as HTMLButtonElement
        editorReloadButton.classList.add('editor-button', 'reload-button')
        editorReloadButton.innerHTML = '💫 Reload'
        editorReloadButton.title = 'Reload stored values'
        editorReloadButton.onclick = async (event)=>{
            updateEditor(undefined, false, false, false, true)
        }

        // Delete button
        const editorDeleteButton = document.createElement('button') as HTMLButtonElement
        editorDeleteButton.classList.add('editor-button', 'delete-button')
        editorDeleteButton.innerHTML = this._labelDeleteButton
        editorDeleteButton.tabIndex = -1
        editorDeleteButton.onclick = async(event)=>{
            const doDelete = confirm(`Do you want to delete ${group} : ${currentKey}?`)
            if(doDelete) {
                const ok = await DataBaseHelper.deleteJson(group, currentKey)
                if(ok) {
                    // alert(`Deletion of ${group} : ${currentKey} was successful.`)
                    this.updateSideMenu().then()
                    this.showListOfItems(group).then()
                } else {
                    alert(`Deletion of ${group} : ${currentKey} failed.`)
                }
            }
        }

        // Save button
        const editorSaveButton = document.createElement('button') as HTMLButtonElement
        editorSaveButton.classList.add('editor-button', 'save-button')
        editorSaveButton.innerHTML = this._labelSaveButton
        editorSaveButton.onclick = (event)=>{
            this.saveData(currentKey, group).then()
        }
        this._editorSaveButton = editorSaveButton

        // Export button
        const editorExportButton = document.createElement('button') as HTMLButtonElement
        editorExportButton.classList.add('editor-button', 'export-button')
        editorExportButton.innerHTML = '📤 Export'
        editorExportButton.title = 'Export current editor data as JSON to the system clipboard.'
        editorExportButton.onclick = async (event)=>{
            const result = await Utils.writeToClipboard(this._editor?.getData())
            if(!result) alert('Unable to export, clipboard was not updated.')
        }

        // Import button
        const editorImportButton = document.createElement('button') as HTMLButtonElement
        editorImportButton.classList.add('editor-button', 'import-button')
        editorImportButton.innerHTML = '📥 Import'
        editorImportButton.title = 'Import the current system clipboard JSON data into the editor.'
        editorImportButton.onclick = async (event)=>{
            const result = await Utils.readFromClipboard(true)
            if(!result) alert('Unable to import, clipboard unavailable or contains invalid JSON data.')
            else this._editor?.setData(result)
        }

        updateEditor(undefined, false, false, skipHistory)
        this._contentDiv.replaceChildren(title)
        this._contentDiv.appendChild(description)
        if(dropdownLabel) this._contentDiv.appendChild(dropdownLabel)
        this._contentDiv.appendChild(dropdown)
        if(this._state.forceMainKey) this._contentDiv.appendChild(editorResetButton)
        else this._contentDiv.appendChild(editorNewButton)
        this._contentDiv.appendChild(editorReloadButton)
        this._contentDiv.appendChild(document.createElement('hr') as HTMLHRElement)
        this._contentDiv.appendChild(editorContainer)
        this._contentDiv.appendChild(editorDeleteButton)
        this._contentDiv.appendChild(editorSaveButton)
        this._contentDiv.appendChild(document.createElement('hr') as HTMLHRElement)
        this._contentDiv.appendChild(editorExportButton)
        this._contentDiv.appendChild(editorImportButton)
    }

    private async saveData(groupKey: string, groupClass: string) {
        if(this._editor) {
            const data = this._editor.getData()
            const newGroupKey = this._editor.getKey()
            const resultingGroupKey = await DataBaseHelper.saveJson(JSON.stringify(data), groupClass, groupKey, newGroupKey)
            if(resultingGroupKey) {
                this.updateSideMenu().then()
                this.showListOfItems(groupClass, resultingGroupKey).then()
                this.updateModifiedState(false)
            } else {
                alert(`Failed to save ${groupClass}:${groupKey}|${newGroupKey}`)
            }
        }
    }

    private updateHistory(replace: boolean = false) {
        const queryParams = window.location.search
        const urlSearch = new URLSearchParams(queryParams)
        let group = urlSearch.get('g') ?? ''
        if(group.length == 0) group = this._state.groupClass.substring(0,1).toLowerCase()
        const newUrl = `?g=${group}&c=${encodeURIComponent(this._state.groupClass)}&k=${encodeURIComponent(this._state.groupKey)}`
        if(replace) {
            history.replaceState(Utils.clone(this._state), '', newUrl)
        } else {
            history.pushState(Utils.clone(this._state), '', newUrl)
        }
    }

    private updateModifiedState(modified: boolean) {
        this._unsavedChanges = Utils.clone(modified)
        if(modified) {
            window.onbeforeunload = (event)=>{
                event.preventDefault()
                return event.returnValue = ''
            }
        } else {
            window.onbeforeunload = null
        }
     }

    private promptNavigateAway(): boolean {
        return this._unsavedChanges
            ? confirm('You will lose your unsaved changes if you continue.')
            : true
    }
}

class EditorPageState {
    group: string = ''
    likeFilter: string = ''
    forceMainKey: boolean = false
    groupClass: string = ''
    groupKey: string = ''
}