// @generated by protobuf-ts 2.9.1
// @generated from protobuf file "msgTypes.proto" (syntax proto3)
// tslint:disable
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MESSAGE_TYPE } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
/**
 * @generated from protobuf message Post
 */
export interface Post {
    /**
     * @generated from protobuf field: float time = 3;
     */
    time: number; // UNIX timestamp the post was created
    /**
     * @generated from protobuf field: string com = 4;
     */
    com: string; // Comment
    /**
     * @generated from protobuf field: string sub = 5;
     */
    sub: string; // OP Subject text
    /**
     * @generated from protobuf field: string name = 6;
     */
    name: string; // Name user posted with. Defaults to Anonymous
    /**
     * @generated from protobuf field: string trip = 7;
     */
    trip: string; // The user's tripcode, in format: !tripcode or !!securetripcode
    /**
     * @generated from protobuf field: string resto = 8;
     */
    resto: string; // For replies: this is the ID of the thread being replied to. For OP: this value is zero
    /**
     * @generated from protobuf field: string filename = 11;
     */
    filename: string; // Filename as it appeared on the poster's device
    /**
     * @generated from protobuf field: string ext = 12;
     */
    ext: string; // Filetype
    /**
     * @generated from protobuf field: string tim = 13;
     */
    tim: string; // File ID
    /**
     * @generated from protobuf field: int32 w = 14;
     */
    w: number; // Image width dimension
    /**
     * @generated from protobuf field: int32 h = 15;
     */
    h: number; // Image height dimension
    /**
     * @generated from protobuf field: string sha256 = 16;
     */
    sha256: string; // File hash
    /**
     * @generated from protobuf field: string md5 = 17;
     */
    md5: string; // File hash
    /**
     * @generated from protobuf field: float fsize = 18;
     */
    fsize: number; // File size
    /**
     * @generated from protobuf field: string mime = 19;
     */
    mime: string; // File mime type
}
// @generated message type with reflection information, may provide speed optimized methods
class Post$Type extends MessageType<Post> {
    constructor() {
        super("Post", [
            { no: 3, name: "time", kind: "scalar", T: 2 /*ScalarType.FLOAT*/ },
            { no: 4, name: "com", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "sub", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "name", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "trip", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 8, name: "resto", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 11, name: "filename", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 12, name: "ext", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 13, name: "tim", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 14, name: "w", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 15, name: "h", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 16, name: "sha256", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 17, name: "md5", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 18, name: "fsize", kind: "scalar", T: 2 /*ScalarType.FLOAT*/ },
            { no: 19, name: "mime", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value?: PartialMessage<Post>): Post {
        const message = { time: 0, com: "", sub: "", name: "", trip: "", resto: "", filename: "", ext: "", tim: "", w: 0, h: 0, sha256: "", md5: "", fsize: 0, mime: "" };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<Post>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: Post): Post {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* float time */ 3:
                    message.time = reader.float();
                    break;
                case /* string com */ 4:
                    message.com = reader.string();
                    break;
                case /* string sub */ 5:
                    message.sub = reader.string();
                    break;
                case /* string name */ 6:
                    message.name = reader.string();
                    break;
                case /* string trip */ 7:
                    message.trip = reader.string();
                    break;
                case /* string resto */ 8:
                    message.resto = reader.string();
                    break;
                case /* string filename */ 11:
                    message.filename = reader.string();
                    break;
                case /* string ext */ 12:
                    message.ext = reader.string();
                    break;
                case /* string tim */ 13:
                    message.tim = reader.string();
                    break;
                case /* int32 w */ 14:
                    message.w = reader.int32();
                    break;
                case /* int32 h */ 15:
                    message.h = reader.int32();
                    break;
                case /* string sha256 */ 16:
                    message.sha256 = reader.string();
                    break;
                case /* string md5 */ 17:
                    message.md5 = reader.string();
                    break;
                case /* float fsize */ 18:
                    message.fsize = reader.float();
                    break;
                case /* string mime */ 19:
                    message.mime = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: Post, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* float time = 3; */
        if (message.time !== 0)
            writer.tag(3, WireType.Bit32).float(message.time);
        /* string com = 4; */
        if (message.com !== "")
            writer.tag(4, WireType.LengthDelimited).string(message.com);
        /* string sub = 5; */
        if (message.sub !== "")
            writer.tag(5, WireType.LengthDelimited).string(message.sub);
        /* string name = 6; */
        if (message.name !== "")
            writer.tag(6, WireType.LengthDelimited).string(message.name);
        /* string trip = 7; */
        if (message.trip !== "")
            writer.tag(7, WireType.LengthDelimited).string(message.trip);
        /* string resto = 8; */
        if (message.resto !== "")
            writer.tag(8, WireType.LengthDelimited).string(message.resto);
        /* string filename = 11; */
        if (message.filename !== "")
            writer.tag(11, WireType.LengthDelimited).string(message.filename);
        /* string ext = 12; */
        if (message.ext !== "")
            writer.tag(12, WireType.LengthDelimited).string(message.ext);
        /* string tim = 13; */
        if (message.tim !== "")
            writer.tag(13, WireType.LengthDelimited).string(message.tim);
        /* int32 w = 14; */
        if (message.w !== 0)
            writer.tag(14, WireType.Varint).int32(message.w);
        /* int32 h = 15; */
        if (message.h !== 0)
            writer.tag(15, WireType.Varint).int32(message.h);
        /* string sha256 = 16; */
        if (message.sha256 !== "")
            writer.tag(16, WireType.LengthDelimited).string(message.sha256);
        /* string md5 = 17; */
        if (message.md5 !== "")
            writer.tag(17, WireType.LengthDelimited).string(message.md5);
        /* float fsize = 18; */
        if (message.fsize !== 0)
            writer.tag(18, WireType.Bit32).float(message.fsize);
        /* string mime = 19; */
        if (message.mime !== "")
            writer.tag(19, WireType.LengthDelimited).string(message.mime);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message Post
 */
export const Post = new Post$Type();