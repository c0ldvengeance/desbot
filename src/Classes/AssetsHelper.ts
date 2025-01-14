import Utils from './Utils.js'

/**
 * Gets filled with all the filepaths from the `_assets` folder, to be referenced in configs.
 */
export default class AssetsHelper {
    static _filePaths: string[] = []
    static _filePathCache: IAssetFilesCache = {}

    /**
     * Load a selection of the available asset file-paths.
     * @param start The start of the filepath string, usually `_assets/SOMETHING/`.
     * @param end The ends of the filepath string, usually a selection of extensions.
     * @returns A string array with matching file-paths.
     */
    static async get(start: string, end: string[]): Promise<string[]> {
        await this.getAll() // Make sure list is loaded.
        const leading = start.toLowerCase()
        const trailing = end.map((e) => e.toLowerCase())
        const key = `${leading}|${trailing.join('&')}`
        let files: string[]
        if(this._filePathCache.hasOwnProperty(key)) {
            // Return cache
            files = this._filePathCache[key]
        } else {
            // Create cache
            files = this._filePaths.filter((filePath) => {
                const filePathLowerCase = filePath.toLowerCase()
                if(!filePathLowerCase.startsWith(leading)) return false
                for(const extension of end) {
                    if(filePathLowerCase.endsWith(extension.toLowerCase())) {
                        return true
                    }
                }
                return false
            })
            this._filePathCache[key] = files
        }
        return files
    }

    static async getAll(): Promise<string[]> {
        if(this._filePaths.length == 0) {
            const response = await fetch('_assets.php')
            if(response.ok) {
                const json = response.json()
                this._filePaths = await json
            }
        }
        return this._filePaths
    }

    static async replaceWildcardPaths(paths: string[]): Promise<string[]> {
        let i = 0
        for(let path of paths) {
            //  Then load files from that and replaces the entry with the found files.
            if(path.endsWith('/')) path += '*'
            if(path.includes('*') ) {
                const start = path.split('*')[0]
                const end = path.split('*').pop() ?? ''
                const files = await AssetsHelper.get(start, [end])
                if(files.length > 0) paths.splice(i, 1, ...files)
            }
            i++
        }
        return paths
    }
}

export interface IAssetFilesCache {
    [key: string]: string[]
}