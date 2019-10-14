import { expect } from 'chai';
import {initIPFS, Thread} from "../src/index"
import { doesNotReject } from 'assert';

describe('IPFS', function() {
    it('starts IPFS', async () => {
      const now = Date.now()
      const ipfsOptions = {
        repo: `./orbitdb/${now}/ipfs`,
        relay: { enabled: true, hop: { enabled: true, active: true } },
        EXPERIMENTAL: {
          pubsub: true,
          dht: true,
        },
        libp2p: {
            config: {
                dht: {
                    enabled: true
                }
            }
        }
      }
      const node = await initIPFS(ipfsOptions)
    }); 
  });