import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Database } from 'database';
import { Debug, MessageType } from 'node-debug';
import * as lookupService from 'repository-lookup-service';
import { create, delete_, find, findOne, update } from '../dist';

import { v4 as uuidv4 } from 'uuid';

describe('main', (suiteContext) => {
  Debug.initialise(true);
  let database: Database;
  let lookupUUID: string;
  let uuid: string;
  before(async () => {
    const debug = new Debug(`${suiteContext.name}.before`);
    debug.write(MessageType.Entry);
    database = Database.getInstance();
    lookupUUID = uuidv4();
    await lookupService.create(database.query, {
      lookup_uuid: lookupUUID,
      lookup_type: 'status',
      meaning: 'Status meaning',
      description: 'Status description',
    });
    uuid = uuidv4();
    debug.write(MessageType.Exit);
  });
  it('create', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await create(query, {
        lookup_value_uuid: uuid,
        lookup_uuid: lookupUUID,
        lookup_code: 'open',
        meaning: 'Open meaning',
        description: 'Open description',
      });
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });
  it('find', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await find(database.query);
    debug.write(MessageType.Exit);
    assert.ok(true);
  });
  it('findOne', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await findOne(database.query, { lookup_value_uuid: uuid });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });
  it('update', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await update(
        query,
        { lookup_value_uuid: uuid },
        { lookup_code: 'open2', description: null },
      );
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });
  it('delete', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await delete_(query, { lookup_value_uuid: uuid });
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });
  after(async () => {
    const debug = new Debug(`${suiteContext.name}.after`);
    debug.write(MessageType.Entry);
    await lookupService.delete_(database.query, { lookup_uuid: lookupUUID });
    await database.shutdown();
    debug.write(MessageType.Exit);
  });
});
