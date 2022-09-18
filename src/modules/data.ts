export default class Data {
    static async writeData(path: string, data: any, password: string): Promise<boolean> {
        const response = await fetch(`data.php?path=${path}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': password,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
        if(!response.ok) console.warn(`Could not write data: ${path}`)
        return response.ok
    }
    static async writeText(path: string, text: string, password: string): Promise<boolean> {
        const response = await fetch(`data.php?path=${path}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': password,
                    'Content-Type': 'plain/text'
                },
                body: text
            })
        if(!response.ok) console.warn(`Could not write text: ${path}`)
        return response.ok
    }
    static async appendText(path: string, text: string, password: string): Promise<boolean> {
        const response = await fetch(`data.php?path=${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': password,
                    'Content-Type': 'plain/text'
                },
                body: text
            })
        if(!response.ok) console.warn(`Could not append text: ${path}`)
        return response.ok
    }
    static async readData<T>(path: string, password: string): Promise<T|string|undefined> {
        const response = await fetch(`data.php?path=${path}`, {
            headers: {'Authorization': password}
        })
        if(!response.ok) {
            console.warn(`Could not read: ${path}`)
            return undefined
        }
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.indexOf("application/json") > -1) {
            return await response.json() as T
        } else {
            return await response.text()
        }
    }
}


// region Data Constants & Classes
export const LOCAL_STORAGE_AUTH_KEY = 'BOLL7708_streaming_widget_auth'
export class AuthData {
    hash: string = ''
}
export class DBData {
    host: string = ''
    port: number = 0
    username: string = ''
    password: string = ''
    database: string = ''
}
// endregion