import {expect,it} from 'vitest';
import {oauthErrorMessage} from './api';
it('explains an assigned account and scope rejection without reflecting arbitrary provider text',()=>{
  expect(oauthErrorMessage('assigned')).toContain('anderen CRM-Benutzer');
  expect(oauthErrorMessage('scopes')).toContain('Berechtigungen');
  expect(oauthErrorMessage('state')).toContain('CRM-Tab');
  expect(oauthErrorMessage('untrusted private provider detail')).not.toContain('untrusted');
  expect(typeof oauthErrorMessage('constructor')).toBe('string');
});
