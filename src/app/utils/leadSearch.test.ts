import { describe, expect, it } from 'vitest';
import type { Lead } from './storage';
import { indexLeadSearch, leadSearchQuery } from './leadSearch';

const index = indexLeadSearch([{id:'one', company:'Müller Autoteile', contactPerson:'Jörg Weiß', city:'Brühl', phone:'+49 (2232) 555-123', email:'kontakt@example.de', website:'https://teile.example.de'} as Lead]);
describe('Lead search', () => {
  it.each(['mueller', 'MÜLLER', 'joerg weiss', 'bruehl', 'Brühl', '02232 555123', '+49 2232 555123', '00492232555123', 'teile.example.de'])('finds a contact with %s', query => {
    expect(leadSearchQuery(query)(index.get('one'))).toBe(true);
  });
  it.each(['Hamburg', 'Firma 555', '+49 2232 999999'])('does not match unrelated text or numbers: %s', query => {
    expect(leadSearchQuery(query)(index.get('one'))).toBe(false);
  });
});
