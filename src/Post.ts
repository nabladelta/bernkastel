export interface Post {
    author?: string,
    message?: string,
    quote?: string[],
    attachments?: string[],
    title?: string,
    time: number
    // properties that are added by the system. Cannot be set by creator of post.
    deletedBy?: Set<string> // set of public keys that want this deleted
    delete?: string // hash of post to delete, include if deleting a post
    hide?: true
}