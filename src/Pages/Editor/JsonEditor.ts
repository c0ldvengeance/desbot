import Utils from '../../Classes/Utils.js'

export default class JsonEditor {
    private _key: string = ''
    private _originalKey: string = ''
    private _data: any
    private _originalData: any
    constructor() {}

    build(key: string, data: object): HTMLElement {
        this._key = key
        this._originalKey = key
        if(data) {
            this._data = Utils.clone(data)
            this._originalData = Utils.clone(data)
        }
        const root = this.buildUL()
        this.stepData(root, this._data, ['<strong>Key</strong>'], key)
        return root
    }

    private stepData(root: HTMLElement, data: any, path: (string|number)[], groupKey: string|undefined = undefined) {
        const type = typeof data
        const thisKey = path[path.length-1] ?? 'root'
        switch(type) {
            case 'string':
                this.buildField(root, EJsonEditorFieldType.String, data, path)
                break
            case 'number':
                this.buildField(root, EJsonEditorFieldType.Number, data, path)
                break
            case 'boolean':
                this.buildField(root, EJsonEditorFieldType.Boolean, data, path)
                break
            case 'object':
                if(data === null) {
                    // TODO: Should this be included to be able to add some kind of
                    //  reference to something not set yet, like a sub structure?
                    this.buildField(root, EJsonEditorFieldType.Null, data, path)
                } else {
                    const newRoot = this.buildLI('')
                    const newUL = this.buildUL()
                    if(Array.isArray(data)) {
                        newRoot.innerHTML += `<strong>${thisKey} []</strong>`
                        for(let i=0; i<data.length; i++) {
                            const newPath = this.clone(path)
                            newPath.push(i)
                            this.stepData(newUL, data[i], newPath)
                        }
                    } else if(data.constructor == Object) {
                        if(path.length == 1) { // Root object generates a key field
                            this.buildField(root, EJsonEditorFieldType.String, `${groupKey ?? ''}`, path)
                        } else {
                            newRoot.innerHTML += `<strong>${thisKey} {}</strong>`
                        }
                        for(const key of Object.keys(data).sort()) {
                            const newPath = this.clone(path)
                            newPath.push(key)
                            this.stepData(newUL, data[key], newPath)
                        }
                    }
                    newRoot.appendChild(newUL)
                    root.appendChild(newRoot)
                }
                break
            default:
                console.warn('Unhandled data type!', data)
        }
    }

    private buildUL(): HTMLUListElement {
        return document.createElement('ul') as HTMLUListElement
    }
    private buildLI(html: string): HTMLLIElement {
        const li = document.createElement('li') as HTMLLIElement
        li.innerHTML = html
        return li
    }

    private buildField(
        root: HTMLElement,
        type: EJsonEditorFieldType,
        value: string|number|boolean|null,
        path:(string|number)[]
    ) {
        const key = path[path.length-1] ?? ''
        const pathStr = JSON.stringify(path)

        // Label
        const label = document.createElement('label') as HTMLLabelElement
        label.innerHTML = `${key}: `
        label.htmlFor = pathStr

        // Item
        const li = document.createElement('li') as HTMLLIElement
        li.appendChild(label)

        // Input
        const input = document.createElement('input') as HTMLInputElement
        input.id = pathStr

        let skip = false
        let update = (event: Event) => {}

        switch (type) {
            case EJsonEditorFieldType.String:
                input.value = `${value}`
                input.type = 'text'
                input.size = 32
                update = (event) => {
                    this.updateValue(input.value, path, label)
                }
                break
            case EJsonEditorFieldType.Boolean:
                input.type = 'checkbox'
                input.checked = value as boolean
                update = (event) => {
                    this.updateValue(input.checked, path, label)
                }
                break
            case EJsonEditorFieldType.Number:
                input.value = `${value}`
                input.type = 'number'
                input.size = 8
                update = (event)=>{
                    this.updateValue(parseFloat(input.value), path, label)
                }
                break
            case EJsonEditorFieldType.Null:
                input.size = 4
                input.disabled = true
                input.value = 'NULL'
                break
            default:
                skip = true
        }
        if(!skip) {
            input.onkeydown = update
            input.onkeyup = update
            input.onchange = update
            input.onblur = update
            li.appendChild(input)
        }
        root.appendChild(li)
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T
    }

    private updateValue(value: string|number|boolean, path: (string | number)[], label: HTMLLabelElement) {
        let current: any = this._data
        let currentOriginal: any = this._originalData
        const highlightColor = 'pink'
        if(path.length == 1) {
            if(value == this._originalKey) {
                // Same as original value
                label.style.backgroundColor = 'transparent'
            } else {
                // New value
                this._key = `${value}`
                label.style.backgroundColor = highlightColor
            }
        } else {
            for(let i = 1; i<path.length; i++) {
                // If we're on the last depth, act on it
                if(i == path.length-1) {
                    // Not same as the stored one
                    if(current[path[i]] != value) {
                        current[path[i]] = value
                        if(currentOriginal[path[i]] == value) {
                            // Same as original value
                            label.style.backgroundColor = 'transparent'
                        } else {
                            // New value
                            label.style.backgroundColor = highlightColor
                        }
                    }
                } else {
                    // Continue to navigate down into the data structure
                    current = current[path[i]]
                    currentOriginal = currentOriginal[path[i]]
                }
            }
        }
    }

    getData(): any {
        return this._data
    }
    getKey(): string {
        return this._key
    }
}
enum EJsonEditorFieldType {
    String,
    Boolean,
    Number,
    Array,
    Dictionary,
    Null
}