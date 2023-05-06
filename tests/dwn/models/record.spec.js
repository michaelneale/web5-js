import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';
import { DataStream, DwnConstant } from '@tbd54566975/dwn-sdk-js';

import { Web5 } from '../../../src/web5.js';
import { Record } from '../../../src/dwn/models/record.js';
import { dataToBytes } from '../../../src/utils.js';

import { createTimeoutPromise } from '../../test-utils/promises.js';
import { TestDataGenerator } from '../../test-utils/test-data-generator.js';
import { TestDwn } from '../../test-utils/test-dwn.js';

import chatProtocolDefinition from '../../fixtures/protocol-definitions/chat.json' assert { type: 'json' };

chai.use(chaiAsPromised);

describe('Record', async () => {
  let dataBytes, dataFormat, testDwn, web5;
  let alice;

  before(async () => {
    testDwn = await TestDwn.create();
    web5 = new Web5({ dwn: { node: testDwn.node } });
    
    alice = await web5.did.create('ion');

    await web5.did.manager.set(alice.id, {
      connected: true,
      endpoint: 'app://dwn',
      keys: {
        ['#dwn']: {
          keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
        },
      },
    });
  });

  after(async () => {
    // Close connections to the underlying stores.
    await testDwn.close();
  });

  describe('created from RecordsRead response', () => {
    let jsonWriteResponse;

    describe('when dataSize <= DwnConstant.maxDataSizeAllowedToBeEncoded', () => {
      const dataSize = 10;

      describe('data.json()', async () => {
        let dataJson;

        before(async () => {
          dataJson = TestDataGenerator.generateJson(dataSize);
          ({ dataBytes, dataFormat } = dataToBytes(dataJson));
          jsonWriteResponse = await web5.dwn.records.write(alice.id, {
            author: alice.id,
            data: dataJson,
            message: {
              dataFormat: dataFormat,
            },
          });
        });

        it('should return JSON many times when instantiated with encoded data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            encodedData: dataBytes,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) <= DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is fulfilled before the timeout.
          await chai.assert.isFulfilled(Promise.race([record.data.json(), createTimeoutPromise(5)]));
          // Assert that the third call to record.data.json() is fulfilled before the timeout.
          await chai.assert.isFulfilled(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });

        it('should return JSON once when instantiated without data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) <= DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });
      });
    });

    describe('when dataSize > DwnConstant.maxDataSizeAllowedToBeEncoded', () => {
      const dataSize = DwnConstant.maxDataSizeAllowedToBeEncoded + 1000;
      
      describe('data.json()', async () => {
        let dataJson;

        before(async () => {
          dataJson = TestDataGenerator.generateJson(dataSize);
          ({ dataBytes, dataFormat } = dataToBytes(dataJson));
          jsonWriteResponse = await web5.dwn.records.write(alice.id, {
            author: alice.id,
            data: dataJson,
            message: {
              dataFormat: dataFormat,
            },
          });
        });

        it('should return JSON once when instantiated with a data stream', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            data: DataStream.fromBytes(dataBytes),
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) > DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });

        it('should return JSON once when instantiated without data', async () => {
          const record = new Record(web5.dwn, {
            author: alice.id,
            descriptor: jsonWriteResponse.message.descriptor,
            recordId: jsonWriteResponse.message.recordId,
            target: alice.id,
          });
          
          expect (record.dataSize) > DwnConstant.maxDataSizeAllowedToBeEncoded;

          // The first invocation should succeed.
          await expect(record.data.json()).to.eventually.deep.equal(dataJson);
          // Assert that the second call to record.data.json() is rejected due to the timeout.
          await chai.assert.isRejected(Promise.race([record.data.json(), createTimeoutPromise(5)]));
        });
      });
    });
  });

  describe('created from RecordsWrite response', () => {
    let dataText, textWriteResponse;

    before(async () => {
      dataText = TestDataGenerator.randomString(100);
      ({ dataBytes, dataFormat } = dataToBytes(dataText));
    });

    it('should retain all expected properties when a protocol is specified', async () => {
      const protocolsConfigureResponse = await web5.dwn.protocols.configure(alice.id, {
        author: alice.id,
        message: {
          protocol: 'http://example.org/chat/protocol',
          definition: chatProtocolDefinition,
        }
      });

      const target = alice.id;
      const request = {
        author: alice.id,
        data: dataText,
        message: {
          dataFormat: dataFormat,
          protocol: 'http://example.org/chat/protocol',
          protocolPath: 'message',
          schema: 'http://example.org/chat/schema/message',
        }
      };

      textWriteResponse = await web5.dwn.records.write(target, request);
      
      const record = new Record(web5.dwn, {
        ...textWriteResponse.message,
        encodedData: dataBytes,
        target,
        author: request.author
      });

      // Retained Web5 JS properties.
      expect(record.author).to.equal(alice.id);
      expect(record.target).to.equal(alice.id);

      // Retained RecordsWriteMessage properties.
      expect(record.id).to.equal(textWriteResponse.message.recordId);
      expect(record.contextId).to.equal(textWriteResponse.message.contextId);
      expect(record.dataCid).to.equal(textWriteResponse.message.descriptor.dataCid);
      expect(record.dataFormat).to.equal(textWriteResponse.message.descriptor.dataFormat);
      expect(record.dataSize).to.equal(textWriteResponse.message.descriptor.dataSize);
      expect(record.dateCreated).to.equal(textWriteResponse.message.descriptor.dateCreated);
      expect(record.dateModified).to.equal(textWriteResponse.message.descriptor.dateModified);
      expect(record.interface).to.equal(textWriteResponse.message.descriptor.interface);
      expect(record.method).to.equal(textWriteResponse.message.descriptor.method);
      expect(record.protocol).to.equal(textWriteResponse.message.descriptor.protocol);
      expect(record.protocolPath).to.equal(textWriteResponse.message.descriptor.protocolPath);
      expect(record.recipient).to.equal(textWriteResponse.message.descriptor.recipient);
      expect(record.schema).to.equal(textWriteResponse.message.descriptor.schema);

      // Expected undefined properties.
      expect(record.parentId).to.be.undefined;
      expect(record.datePublished).to.be.undefined;
      expect(record.published).to.be.undefined;
    });

    it('should retain all expected properties for a published record', async () => {
      const target = alice.id;
      const request = {
        author: alice.id,
        data: dataText,
        message: {
          dataFormat: dataFormat,
          published: true,
        }
      };

      textWriteResponse = await web5.dwn.records.write(target, request);
      
      const record = new Record(web5.dwn, {
        ...textWriteResponse.message,
        encodedData: dataBytes,
        target,
        author: request.author
      });

      expect(record.datePublished).to.not.be.undefined;
      expect(record.datePublished).to.equal(textWriteResponse.message.descriptor.datePublished);
      expect(record.published).to.not.be.undefined;
      expect(record.published).to.equal(textWriteResponse.message.descriptor.published);
    });

    it('should retain parentId if specified', async () => {
      const target = alice.id;
      let request = {
        author: alice.id,
        data: dataText,
        message: {
          dataFormat: dataFormat,
        }
      };

      textWriteResponse = await web5.dwn.records.write(target, request);

      request = {
        author: alice.id,
        data: dataText,
        message: {
          dataFormat: dataFormat,
          parentId: textWriteResponse.message.recordId,
        }
      };

      textWriteResponse = await web5.dwn.records.write(target, request);
      
      const record = new Record(web5.dwn, {
        ...textWriteResponse.message,
        encodedData: dataBytes,
        target,
        author: request.author
      });

      expect(record.parentId).to.not.be.undefined;
      expect(record.parentId).to.equal(textWriteResponse.message.descriptor.parentId);
    });

  });
});
