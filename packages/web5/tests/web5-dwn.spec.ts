import type { TestAgent } from './test-user-agent.js';

import { expect } from 'chai';
import { Web5 } from '../src/web5.js';
import { createTestAgent } from './test-user-agent.js';

let testAgent: TestAgent;
let web5: Web5;
let did: string;

describe('web5.dwn', () => {
  before(async () => {
    testAgent = await createTestAgent();
    web5 = new Web5(testAgent.agent);
  });

  beforeEach(async () => {
    await testAgent.clear();
    ({ did } = await testAgent.createTestProfile());
  });

  describe('records', () => {
    describe('write', () => {
      it('works', async () => {
        const result = await web5.dwn.records.write(did, {
          author  : did,
          data    : 'Hello, world!',
          message : {
            schema     : 'foo/bar',
            dataFormat : 'text/plain'
          }
        });

        expect(result.status.code).to.equal(202);
        expect(result.status.detail).to.equal('Accepted');
        expect(result.record).to.exist;

      });
    });

    describe('query', () => {
      xit('works');
    });

    describe('read', () => {
      xit('works');
    });

    describe('delete', () => {
      xit('works');
    });
  });

  describe('protocols', () => {
    describe('configure', () => {
      xit('works');
    });

    describe('query', () => {
      xit('works');
    });
  });
});