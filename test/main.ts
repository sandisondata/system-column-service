import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Database } from 'database';
import { Debug, MessageType } from 'node-debug';
import { Row as Table, service as tableService } from 'system-table-service';
import { service } from '../dist';

describe('main', (suiteContext) => {
  Debug.initialize(true);
  let database: Database;
  let table: Table;
  let uuid: string;

  before(async () => {
    const debug = new Debug(`${suiteContext.name}.before`);
    debug.write(MessageType.Entry);
    database = Database.getInstance();
    table = (await tableService.create(database.query, {
      name: 'widgets',
      singular_name: 'widget',
    })) as Table;
    debug.write(MessageType.Exit);
  });

  it('create', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      const row = await service.create(query, {
        table_uuid: table.uuid,
        column_type: 'base',
        name: 'name',
        data_type: 'varchar',
        length_or_precision: 30,
      });
      uuid = row.uuid;
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });

  it('find', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await service.find(database.query);
    debug.write(MessageType.Exit);
    assert.ok(true);
  });

  it('findOne', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await service.findOne(database.query, { uuid: uuid });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });

  it('update', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await service.update(
        query,
        { uuid: uuid },
        {
          name: 'new_name',
        },
      );
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });

  it('delete', async (testContext) => {
    const debug = new Debug(`${suiteContext.name}.test.${testContext.name}`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await service.delete(query, { uuid: uuid });
    });
    debug.write(MessageType.Exit);
    assert.ok(true);
  });

  after(async () => {
    const debug = new Debug(`${suiteContext.name}.after`);
    debug.write(MessageType.Entry);
    await database.transaction(async (query) => {
      await tableService.delete(query, { uuid: table.uuid });
    });
    await database.disconnect();
    debug.write(MessageType.Exit);
  });
});
