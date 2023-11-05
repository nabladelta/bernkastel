/**
 * @packageDocumentation
 *
 * `@helia/buffers` makes working with buffers {@link https://github.com/ipfs/helia Helia} simple & straightforward.
 *
 * See the {@link EncryptedBuffers Buffers interface} for all available operations.
 *
 * @example
 *
 * ```typescript
 * import { createHelia } from 'helia'
 * import { buffers } from '@helia/buffers'
 * import { CID } from 'multiformats/cid'
 *
 * const str = buffers(helia)
 * const cid = await str.put('hello world')
 * const string = await str.get(cid)
 *
 * console.info(string)
 * // hello world
 * ```
 */

import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Blocks, GetBlockProgressEvents, PutBlockProgressEvents } from '@helia/interface/blocks'
import type { AbortOptions } from '@libp2p/interfaces'
import type { BlockCodec } from 'multiformats/codecs/interface'
import type { MultihashHasher } from 'multiformats/hashes/interface'
import type { ProgressOptions } from 'progress-events'
import { Crypter } from '@nabladelta/lambdadelta'

export interface BuffersComponents {
  blockstore: Blocks
}

export interface AddOptions extends AbortOptions, ProgressOptions<PutBlockProgressEvents> {
  hasher: MultihashHasher
  codec: BlockCodec<any, unknown>
}

export interface GetOptions extends AbortOptions, ProgressOptions<GetBlockProgressEvents> {
  codec: BlockCodec<any, unknown>
}

/**
 * The Buffers interface provides a simple and intuitive way to add/get buffers
 * with your Helia node and is a great place to start learning about IPFS.
 */
export interface EncryptedBuffers {
  /**
   * Add a string to your Helia node and get a CID that refers to the block the
   * string has been stored as.
   *
   * @example
   *
   * ```typescript
   * import { buffers } from '@helia/buffers'
   *
   * const str = buffers(helia)
   * const cid = await str.add('hello world')
   *
   * console.info(cid)
   * // CID(bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e)
   * ```
   */
  add(str: Uint8Array, options?: Partial<AddOptions>): Promise<CID>

  /**
   * Get a string from your Helia node, either previously added to it or to
   * another node on the network.
   *
   * @example
   *
   * ```typescript
   * import { buffers } from '@helia/buffers'
   * import { CID } from 'multiformats/cid'
   *
   * const str = buffers(helia)
   * const cid = CID.parse('bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e')
   * const string = await str.get(cid)
   *
   * console.info(string)
   * // hello world
   * ```
   */
  get(cid: CID, options?: Partial<GetOptions>): Promise<Uint8Array>
}

class DefaultBuffers implements EncryptedBuffers {
  private readonly components: BuffersComponents
  private readonly encryption?: Crypter

  constructor (components: BuffersComponents, encryption?: Crypter) {
    this.components = components
    this.encryption = encryption
  }

  async add (data: Uint8Array, options: Partial<AddOptions> = {}): Promise<CID> {
    const buf = this.encryption ? this.encryption.encrypt(data) : data
    const hash = await (options.hasher ?? sha256).digest(buf)
    const codec = options.codec ?? raw
    const cid = CID.createV1(codec.code, hash)

    await this.components.blockstore.put(cid, buf, options)

    return cid
  }

  async get (cid: CID, options: Partial<GetOptions> = {}): Promise<Uint8Array> {
    const buf = await this.components.blockstore.get(cid, options)
    const data = this.encryption ? this.encryption.decrypt(buf) : buf
    return data
  }
}

/**
 * Create a {@link EncryptedBuffers} instance for use with {@link https://github.com/ipfs/helia Helia}
 */
export function encBuffers (helia: { blockstore: Blocks }, encryption?: Crypter): EncryptedBuffers {
  return new DefaultBuffers(helia, encryption)
}