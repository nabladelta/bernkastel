import { Post } from "./protobuf/msgTypes"

export function serializePost(post: IPost) {
    return Post.toBinary(Post.create(post))
}

export function deserializePost(buf: Uint8Array): IPost {
    return Post.clone(Post.fromBinary(buf))
}