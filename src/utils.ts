import { Post } from "./protobuf/msgTypes"

export function serializePost(post: IPost) {
    return Buffer.from(Post.toBinary(Post.create(post)))
}

export function deserializePost(buf: Buffer): IPost {
    return Post.clone(Post.fromBinary(buf))
}