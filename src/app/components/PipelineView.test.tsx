import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineView } from './PipelineView';

const api = vi.hoisted(() => ({ leads: vi.fn(), save: vi.fn() }));
vi.mock('../utils/storage', () => ({
  getLeads: api.leads, saveLead: api.save, deleteLead: vi.fn(),
  getCurrentUser: () => ({ id: 'pipeline-test', username: 'Aaron' }),
  getSettings: () => ({ pipelineStages: [
    { id: 'new', name: 'Neu', category: 'open', color: '#194bf0', isActive: true, order: 0, probability: 20 },
    { id: 'qualified', name: 'Qualifiziert', category: 'open', color: '#067640', isActive: true, order: 1 },
  ] }),
}));
vi.mock('./LeadDetailModal', () => ({ LeadDetailModal: () => null }));
vi.mock('./LeadModal', () => ({ LeadModal: () => null }));
const leads = ['Nord', 'Süd'].map((company, index) => ({ id: String(index), company, status: 'Neu', contactPerson: 'Kontakt', email: '', value: 100, tags: [], createdAt: '2026-09-01', updatedAt: '2026-09-01', stageEnteredAt: index === 0 ? '2026-01-01T10:00:00Z' : undefined }));

describe('Pipeline interactions', () => {
  afterEach(cleanup);
  beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); api.leads.mockResolvedValue(leads); });
  it('keeps the old phase until the server confirms and disables competing moves', async () => {
    let finish!: () => void;
    api.save.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<PipelineView />);
    const select = await screen.findByRole('combobox', { name: 'Phase für Nord' });
    fireEvent.change(select, { target: { value: 'Qualifiziert' } });
    expect(api.save).toHaveBeenCalledWith({ id: '0', status: 'Qualifiziert' });
    expect(select).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Phase für Süd' })).toBeDisabled();
    expect(within(screen.getByRole('region', { name: 'Neu' })).getByRole('button', { name: /Nord/ })).toBeInTheDocument();
    finish();
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Qualifiziert' })).getByRole('button', { name: /Nord/ })).toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Phase für Süd' })).toBeEnabled();
  });
  it('keeps the card in place if saving fails', async () => {
    api.save.mockRejectedValue(new Error('offline'));
    render(<PipelineView />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Phase für Nord' }), { target: { value: 'Qualifiziert' } });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Phase für Nord' })).toBeEnabled());
    expect(within(screen.getByRole('region', { name: 'Neu' })).getByRole('button', { name: /Nord/ })).toBeInTheDocument();
  });
  it('does not claim there are no configured stages while data is loading', () => {
    api.leads.mockReturnValue(new Promise(() => {}));
    render(<PipelineView />);
    expect(screen.getByText('Pipeline wird geladen…')).toBeInTheDocument();
    expect(screen.queryByText('Noch keine aktiven Phasen')).not.toBeInTheDocument();
  });
  it('keeps large board columns bounded without hiding their remaining leads', async () => {
    api.leads.mockResolvedValue(Array.from({length:80}, (_,i)=>({...leads[0],id:String(i),company:`Firma ${i}`})));
    render(<PipelineView />);
    const region = await screen.findByRole('region', {name:'Neu'});
    await waitFor(()=>expect(within(region).getAllByRole('combobox')).toHaveLength(25));
    fireEvent.click(within(region).getByRole('button', {name:/25 weitere Leads anzeigen/}));
    expect(within(region).getAllByRole('combobox')).toHaveLength(50);
  });
  it('exposes old open opportunities as a concrete work queue with a transparent plan value', async () => {
    render(<PipelineView />);
    expect(await screen.findByText('Gewichtete Planung')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Seit 14\+ Tagen in Phase/ }));
    expect(within(screen.getByRole('region', { name: 'Neu' })).getByRole('button', { name: /Nord/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Neu' })).queryByRole('button', { name: /Süd/ })).not.toBeInTheDocument();
  });
});
