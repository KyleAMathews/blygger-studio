import { expect, it } from 'vitest';
import { AuthorizationModel, OAuthModel } from './auth-oracle-model.ts';
  it('calibrates the judgment against plausible wrong results', () => {
    const model = new AuthorizationModel(); model.mint(0, ['owner:draft'], 'api', 10);
    expect(model.judge(0, 'api', ['owner:read'])).toBe(403);
    expect(() => expect(200).toBe(model.judge(0, 'api', ['owner:read']))).toThrow();
    model.advance(10);
    expect(() => expect(200).toBe(model.judge(0, 'api', ['owner:draft']))).toThrow();
    const oauth = new OAuthModel(); oauth.consent('handle', 'browser-a', ['owner:read']);
    expect(oauth.decide('handle', 'browser-b', true)).toBe('rejected');
    expect(oauth.decide('handle', 'browser-a', false)).toBe('denied');
    expect(oauth.decide('handle', 'browser-a', true)).toBe('rejected');
    expect(() => model.advance(-1)).toThrow();
    expect(() => model.mint(1, [], 'api', 1)).toThrow();
  });
