// Fit test: the app's Drizzle schema declares the abbreviation rules tables (the starter table is gone).
import { getTableName } from 'drizzle-orm';
import * as schema from '../../../../src/db/schema';

it('the schema declares the rules tables and no starter table', () => {
  const names = [schema.sexes, schema.radiologists, schema.tags, schema.tagOptions, schema.tagRuleHistory].map((t) => getTableName(t));
  expect(names).toEqual(['sexes', 'radiologists', 'tags', 'tag_options', 'tag_rule_history']);
  expect(Object.keys(schema)).not.toContain('settings');
});
