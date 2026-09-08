import type { Lead } from './storage';

const letters = (value: string) => value.toLocaleLowerCase('de').replace(/[äöüß]/g, letter => ({ä:'ae',ö:'oe',ü:'ue',ß:'ss'})[letter] || letter);
const phoneDigits = (value: string) => value.replace(/^\s*(?:\+49|0049)/, '0').replace(/\D/g, '');
export function indexLeadSearch(leads: Lead[]) {
  return new Map(leads.map(lead => [lead.id, {
    text: letters([lead.company, lead.contactPerson, lead.email, lead.phone, lead.city, lead.website].filter(Boolean).join('\n')),
    phone: phoneDigits(lead.phone || ''),
  }]));
}
export function leadSearchQuery(query: string) {
  const text = letters(query.trim());
  const phone = /^[\d+\s()./-]+$/.test(query.trim()) ? phoneDigits(query) : '';
  return (entry: { text: string; phone: string } | undefined) => !text || Boolean(entry && (entry.text.includes(text) || (phone.length >= 3 && entry.phone.includes(phone))));
}
