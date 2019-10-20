export interface Post {
    author?: string,
    message?: string,
    quote?: string[],
    attachments?: string[],
    title?: string,
    time: number
    delete?: string // hash of post to delete, include if deleting a post
    // properties that are added by the system. Cannot be set by creator of post.
    deletedBy?: Set<string> // set of public keys that want this deleted
    hide?: true
    own?: true // post made by yourself
}