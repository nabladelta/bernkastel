export interface Post {
    author?: string,
    message?: string,
    quote?: string[],
    attachments?: string[],
    time: Date
    deleted?: [string, string][] // signatures
    delete?: string // command to delete a post
}