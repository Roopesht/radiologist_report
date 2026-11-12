import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { createOrm, ormProvider } from '../../../../src/db/orm';
import { sexes } from '../../../../src/db/schema';
import { ensureRulesSchema } from '../../../../src/rules/rulesStore';
import { tempDbUrl, removeTempDbs } from '../../../support/tempDb';

afterAll(removeTempDbs);

// The schema's tables are created by the migrations; `sexes` is the simple reference table to exercise the ORM on.
const setup = async () => {
  const client = createClient({ url: tempDbUrl() });
  await ensureRulesSchema(client as any);
  return client;
};

describe('orm contract', () => {
  it('inserts, reads, updates and deletes through the schema', async () => {
    const orm = createOrm(await setup());
    await orm.insert(sexes).values({ code: 'X', label: 'Other', title: 'Dr.' });
    expect(await orm.select().from(sexes).where(eq(sexes.code, 'X'))).toEqual([{ code: 'X', label: 'Other', title: 'Dr.' }]);
    await orm.update(sexes).set({ label: 'Other sex' }).where(eq(sexes.code, 'X'));
    expect((await orm.select().from(sexes).where(eq(sexes.code, 'X')))[0].label).toBe('Other sex');
    await orm.delete(sexes).where(eq(sexes.code, 'X'));
    expect(await orm.select().from(sexes).where(eq(sexes.code, 'X'))).toEqual([]);
  });

  it('values are bound, not interpolated, and constraints are enforced', async () => {
    const orm = createOrm(await setup());
    const evil = "x'; DROP TABLE sexes; --";
    await orm.insert(sexes).values({ code: evil, label: 'v', title: 't' });
    expect((await orm.select().from(sexes).where(eq(sexes.code, evil)))[0].code).toBe(evil);
    await expect(orm.insert(sexes).values({ code: evil, label: 'again', title: 't' })).rejects.toThrow();   // primary key
    expect((await orm.select().from(sexes)).length).toBe(3);                                                // M, F and this one; the table is still there
  });

  it('the provider builds the ORM from app.get("db") and stores it; without a database it explains', async () => {
    const store = new Map<string, unknown>([['db', await setup()]]);
    const app = { set: (k: string, v: unknown) => store.set(k, v), get: (k: string) => store.get(k) };
    const orm = ormProvider(app);
    expect(app.get('orm')).toBe(orm);
    expect((await orm.select().from(sexes)).length).toBe(2);
    expect(() => ormProvider({ set: () => undefined, get: () => undefined })).toThrow(/needs the database provider/);
  });
});
