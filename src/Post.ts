export interface Post {
    author?: string,
    message?: string,
    quote?: string[],
    attachments?: string[],
    title?: string,
    time: number
    deleted?: [string, string][] // signatures
    delete?: string // command to delete a post
}