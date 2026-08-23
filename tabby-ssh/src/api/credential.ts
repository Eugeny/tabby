export interface SavedCredential {
    id: string
    name: string
    username: string
    privateKeys: string[]
    usePasswordAsKeyPassphrase?: boolean
}
