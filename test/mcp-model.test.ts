import { it, expect } from 'vitest';
import { expectedTools } from './mcp-oracle-model.ts';
  it('rejects a wrong capability list in the checker', () => {
    expect(() => expect([...expectedTools(['owner:draft']), 'publishItem']).toEqual(expectedTools(['owner:draft']))).toThrow();
  });
