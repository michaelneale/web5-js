import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';
import { DataStream, DwnConstant, DwnInterfaceName, DwnMethodName, Jws, KeyDerivationScheme, RecordsWrite } from '@tbd54566975/dwn-sdk-js';

import { Web5 } from '../../../src/web5.js';
import { Record } from '../../../src/dwn/models/record.js';
import { dataToBytes } from '../../../src/utils.js';

import { createTimeoutPromise } from '../../test-utils/promises.js';
import { TestDataGenerator } from '../../test-utils/test-data-generator.js';
import { TestDwn } from '../../test-utils/test-dwn.js';

import chatProtocolDefinition from '../../fixtures/protocol-definitions/chat.json' assert { type: 'json' };

chai.use(chaiAsPromised);

describe('Record', async () => {
  let alice, dataBytes, dataFormat, dataText, testDwn, web5;

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

    dataText = TestDataGenerator.randomString(100);
    ({ dataBytes, dataFormat } = dataToBytes(dataText));
  });

  after(async () => {
    // Close connections to the underlying stores.
    await testDwn.close();
  });

  it('should retain all defined properties', async () => {
    // Web5 properties.
    const author = alice.id;
    const target = alice.id;

    // RecordsWriteMessage properties that can be pre-defined.
    const keyId = '#dwn';
    const attestation = Jws.createSignatureInputs([{
      keyId: alice.id + keyId,
      keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
    }]);
    const authorization = Jws.createSignatureInput({
      keyId: alice.id + keyId,
      keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
    });

    const encryptionInput = {
      initializationVector : TestDataGenerator.randomBytes(16),
      key                  : TestDataGenerator.randomBytes(32),
      keyEncryptionInputs  : [
        {
          derivationScheme : KeyDerivationScheme.Protocols,
          publicKey        : alice.keys.find(key => key.id === 'dwn').keyPair.publicJwk // reusing signing key for encryption purely as a convenience
        },
        {
          derivationScheme : KeyDerivationScheme.Schemas,
          publicKey        : alice.keys.find(key => key.id === 'dwn').keyPair.publicJwk // reusing signing key for encryption purely as a convenience
        },
      ]
    };

    // RecordsWriteDescriptor properties that can be pre-defined.
    const protocol = 'http://example.org/chat/protocol';
    const protocolPath = 'message';
    const recipient = alice.id;
    const published = true;
    const schema = 'http://example.org/chat/schema/message';
    const interfaceName = DwnInterfaceName.Records;
    const method = DwnMethodName.Write;

    // Create a parent record to reference in the RecordsWriteMessage used for validation.
    const parentRecorsWrite = await RecordsWrite.create({
      interface: interfaceName,
      method,
      protocol,
      protocolPath,
      schema,
      data: dataBytes,
      dataFormat,
      authorizationSignatureInput: authorization,
    });
    
    // Create a RecordsWriteMessage.
    const recordsWrite = await RecordsWrite.create({
      interfaceName,
      method,
      protocol,
      protocolPath,
      recipient,
      schema,
      parentId: parentRecorsWrite.recordId,
      data: dataBytes,
      published,
      dataFormat,
      attestationSignatureInputs: attestation,
      authorizationSignatureInput: authorization,
      encryptionInput,
    });

    // RecordsWriteMessage top-level properties computed by `dwn-sdk-js`.
    const contextId = recordsWrite.message.contextId; 
    const encryption = recordsWrite.message.encryption;
    const recordId = recordsWrite.message.recordId;
    
    // Create record using test RecordsWriteMessage.
    const record = new Record(web5.dwn, {
      ...recordsWrite.message,
      encodedData: dataBytes,
      target,
      author,
    });

    // Retained Web5 JS properties.
    expect(record.author).to.equal(author);
    expect(record.target).to.equal(target);

    // Retained RecordsWriteMessage top-level properties.
    expect(record.contextId).to.equal(contextId);
    expect(record.id).to.equal(recordId);
    expect(record.encryption).to.not.be.undefined;
    expect(record.encryption).to.deep.equal(encryption);
    expect(record.encryption.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Protocols));
    expect(record.encryption.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Schemas));
    expect(record.attestation).to.not.be.undefined;
    expect(record.attestation).to.have.property('signatures');
    
    // Retained RecordsWriteDescriptor properties.
    expect(record.interface).to.equal(interfaceName);
    expect(record.method).to.equal(method);
    expect(record.protocol).to.equal(protocol);
    expect(record.protocolPath).to.equal(protocolPath);
    expect(record.recipient).to.equal(recipient);
    expect(record.schema).to.equal(schema);
    expect(record.parentId).to.equal(parentRecorsWrite.recordId);
    expect(record.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
    expect(record.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
    expect(record.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
    expect(record.dateModified).to.equal(recordsWrite.message.descriptor.dateModified);
    expect(record.published).to.equal(published);
    expect(record.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
    expect(record.dataFormat).to.equal(dataFormat);
  });

  describe('toJSON()', () => {
    it('should return all defined properties', async () => {
      // Web5 properties.
      const author = alice.id;
      const target = alice.id;

      // RecordsWriteMessage properties that can be pre-defined.
      const keyId = '#dwn';
      const attestation = Jws.createSignatureInputs([{
        keyId: alice.id + keyId,
        keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
      }]);
      const authorization = Jws.createSignatureInput({
        keyId: alice.id + keyId,
        keyPair: alice.keys.find(key => key.id === 'dwn').keyPair,
      });

      const encryptionInput = {
        initializationVector : TestDataGenerator.randomBytes(16),
        key                  : TestDataGenerator.randomBytes(32),
        keyEncryptionInputs  : [
          {
            derivationScheme : KeyDerivationScheme.Protocols,
            publicKey        : alice.keys.find(key => key.id === 'dwn').keyPair.publicJwk // reusing signing key for encryption purely as a convenience
          },
          {
            derivationScheme : KeyDerivationScheme.Schemas,
            publicKey        : alice.keys.find(key => key.id === 'dwn').keyPair.publicJwk // reusing signing key for encryption purely as a convenience
          },
        ]
      };

      // RecordsWriteDescriptor properties that can be pre-defined.
      const protocol = 'http://example.org/chat/protocol';
      const protocolPath = 'message';
      const recipient = alice.id;
      const published = true;
      const schema = 'http://example.org/chat/schema/message';
      const interfaceName = DwnInterfaceName.Records;
      const method = DwnMethodName.Write;

      // Create a parent record to reference in the RecordsWriteMessage used for validation.
      const parentRecorsWrite = await RecordsWrite.create({
        interface: interfaceName,
        method,
        protocol,
        protocolPath,
        schema,
        data: dataBytes,
        dataFormat,
        authorizationSignatureInput: authorization,
      });
      
      // Create a RecordsWriteMessage.
      const recordsWrite = await RecordsWrite.create({
        interfaceName,
        method,
        protocol,
        protocolPath,
        recipient,
        schema,
        parentId: parentRecorsWrite.recordId,
        data: dataBytes,
        published,
        dataFormat,
        attestationSignatureInputs: attestation,
        authorizationSignatureInput: authorization,
        encryptionInput,
      });

      // RecordsWriteMessage top-level properties computed by `dwn-sdk-js`.
      const contextId = recordsWrite.message.contextId; 
      const encryption = recordsWrite.message.encryption;
      const recordId = recordsWrite.message.recordId;
      
      // Create record using test RecordsWriteMessage.
      const record = new Record(web5.dwn, {
        ...recordsWrite.message,
        encodedData: dataBytes,
        target,
        author,
      });

      // Call toJSON() method.
      const recordJson = record.toJSON();

      // Retained Web5 JS properties.
      expect(recordJson.author).to.equal(author);
      expect(recordJson.target).to.equal(target);

      // Retained RecordsWriteMessage top-level properties.
      expect(recordJson.contextId).to.equal(contextId);
      expect(recordJson.recordId).to.equal(recordId);
      expect(recordJson.encryption).to.not.be.undefined;
      expect(recordJson.encryption).to.deep.equal(encryption);
      expect(recordJson.encryption.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Protocols));
      expect(recordJson.encryption.keyEncryption.find(key => key.derivationScheme === KeyDerivationScheme.Schemas));
      expect(recordJson.attestation).to.not.be.undefined;
      expect(recordJson.attestation).to.have.property('signatures');
      
      // Retained RecordsWriteDescriptor properties.
      expect(recordJson.interface).to.equal(interfaceName);
      expect(recordJson.method).to.equal(method);
      expect(recordJson.protocol).to.equal(protocol);
      expect(recordJson.protocolPath).to.equal(protocolPath);
      expect(recordJson.recipient).to.equal(recipient);
      expect(recordJson.schema).to.equal(schema);
      expect(recordJson.parentId).to.equal(parentRecorsWrite.recordId);
      expect(recordJson.dataCid).to.equal(recordsWrite.message.descriptor.dataCid);
      expect(recordJson.dataSize).to.equal(recordsWrite.message.descriptor.dataSize);
      expect(recordJson.dateCreated).to.equal(recordsWrite.message.descriptor.dateCreated);
      expect(recordJson.dateModified).to.equal(recordsWrite.message.descriptor.dateModified);
      expect(recordJson.published).to.equal(published);
      expect(recordJson.datePublished).to.equal(recordsWrite.message.descriptor.datePublished);
      expect(recordJson.dataFormat).to.equal(dataFormat);
    });
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
});
