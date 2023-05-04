import crossFetch from 'cross-fetch';
import { Encoder } from '@tbd54566975/dwn-sdk-js';
import { v4 as uuidv4 } from 'uuid';

import { createJsonRpcRequest } from './json-rpc.js';
import { parseJson } from '../utils.js';
import { Transport } from './transport.js';

/**
 * Supports fetch in: browser, browser extensions, Node, and React Native.
 * In node, it uses node-fetch, and in a browser or React Native, it uses
 * Github's whatwg-fetch.
 * 
 * WARNING for browser extension background service workers:
 * 'cross-fetch' is a ponyfill that uses `XMLHTTPRequest` under the hood.
 * `XMLHTTPRequest` cannot be used in browser extension background service
 * workers.  Browser extensions get even more strict with `fetch` in that it
 * cannot be referenced indirectly.
 */
const fetch = globalThis.fetch ?? crossFetch;

export class HttpTransport extends Transport {
  DWN_MESSAGE_HEADER = 'dwn-request';
  DWN_RESPONSE_HEADER = 'dwn-response';
  WEB5_RESPONSE_HEADER = 'WEB5-RESPONSE';

  async encodeMessage(message) {
    return JSON.stringify(message);
  }

  async decodeMessage(message) {
    return parseJson(message);
  }

  async send(endpoint, request) { // override
    // Construct a JSON RPC Request.
    const requestId = uuidv4();
    const dwnRequest = createJsonRpcRequest(requestId, 'dwn.processMessage', {
      ...request.message,
      author: request.author,
      target: request.target,
    });

    // Transmit the JSON RPC Request to an agent or DWN server and receive the response.
    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        [this.DWN_MESSAGE_HEADER]: await this.encodeMessage(dwnRequest),
      },
      body: request.data,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    // Attemp to read the serialized JSON RPC message from either a Web5 User Agent or DWN server, if present.
    const dwnResponseHeader = response.headers.get(this.DWN_RESPONSE_HEADER);
    const web5ResponseHeader = response.headers.get(this.WEB5_RESPONSE_HEADER);

    if (web5ResponseHeader) {
      // TODO: Remove after `desktop-agent` refactor is completed.
      // RecordsRead responses return `message` and `status` as header values, with a `data` ReadableStream in the body.
      const { entries = null, message, record, status } = Encoder.base64UrlToObject(web5ResponseHeader);
      return { entries, message, record: { ...record, data: response.body }, status };

    } else if (dwnResponseHeader) {
      // RecordsRead responses return `message` and `status` as header values, with a `data` ReadableStream in the body.
      const responseJson = await this.decodeMessage(dwnResponseHeader);
      const { entries = null, message, record, status } = responseJson.result.reply;
      return { entries, message, record: { ...record, data: response.body }, status };

    } else {
      // All other DWN responses return `entries`, `message`, and `status` as stringified JSON in the body.
      const responseJson = await response.json();
      return responseJson.result.reply;
    }
  }
}
