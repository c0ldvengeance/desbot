class ImageLoader {
    // TODO: Maybe limit cache to 100 images or something? To avoid memory issues.
    static _imageCache: Record<string, string> = {}

    private static async getBlob(url:string):Promise<Blob> {
        const response = await fetch(`${url}?${Math.random()*100000}`) // This has problems with caching otherwise... hmm.
        const blob = await response.blob()
        console.log(`ImageLoader: Loaded remote blob from -> ${url}`)
        return blob
    }

    /**
     * Will load a remote image into a b64 string
     * @param url Url to image
     * @param callback Will be called after finished loading
     * @param useCache Will load/store cached data
     */
    static async getDataUrl(url:string, useCache:boolean=true):Promise<string> {
        const urlb64 = btoa(url)
        const cache = (useCache && this._imageCache.hasOwnProperty(urlb64)) 
            ? this._imageCache[urlb64] 
            : null
        if(cache != null) {
            console.log('ImageLoader: Returning cached')
            return new Promise<string>((resolve) => { 
                resolve(cache) 
            })
        } else {
            // Load image from the internet
            const blob = await this.getBlob(url)
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = async() => {
                    const base64data = reader.result;
                    const imageb64 = base64data.toString()
                    const headerIndex = imageb64.indexOf(',')
                    const header = imageb64.substring(0, headerIndex)
                    console.log(`ImageLoader: base64 header: ${header}`)
                    if(!this.isImage(header)) {
                        reject(new Error('ImageLoader: Not an image'))
                    } else {
                        // It was already .png
                        ImageLoader._imageCache[urlb64] = imageb64
                        resolve(imageb64)
                    }
                }
                reader.onerror = reject
                reader.readAsDataURL(blob) 
            })
        }
    }
    
    /**
     * Will check if the header belongs to an image
     * @param header Header to check
     */
    static isImage(header:string):boolean {
        return header.indexOf('image/png') != -1 || header.indexOf('image/jpeg') != -1 || header.indexOf('image/jpg') != -1 || header.indexOf('image/gif') != -1 || header.indexOf('image/bmp') != -1
    }
}
