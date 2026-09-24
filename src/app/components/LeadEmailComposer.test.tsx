import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LeadEmailComposer} from './LeadEmailComposer';
const api=vi.hoisted(()=>({draft:vi.fn(),preview:vi.fn(),send:vi.fn(),success:vi.fn(),personalize:vi.fn()}));
vi.mock('../utils/crmWorkflow',()=>({personalizeCrmMail:api.personalize}));
vi.mock('sonner',()=>({toast:{success:api.success}}));
vi.mock('../utils/crmMail',async original=>({...await original<typeof import('../utils/crmMail')>(),getCrmMailDraft:api.draft,previewCrmMail:api.preview,sendCrmMail:api.send}));
const draft={connected:true,sender:{name:'Elias Zafar',address:'elias.zafar@partsunion.de'},recipient:'kunde@example.test',subject:'Danke für das Gespräch',body:'Vielen Dank für das nette Gespräch.',html:'<p>Partsunion</p>'};
const close=vi.fn(),sent=vi.fn(),state=vi.fn();
const mount=()=>render(<LeadEmailComposer leadId="lead-1" onClose={close} onSent={sent} onState={state}/>);
beforeEach(()=>{vi.clearAllMocks();api.draft.mockResolvedValue(draft);api.preview.mockResolvedValue({...draft,html:'<p>Bearbeitete Partsunion-Vorlage</p>'});api.send.mockResolvedValue({sender:draft.sender.address,recipient:draft.recipient});});
afterEach(cleanup);
it('shows the personal identity and saved recipient, previews edited text, and sends that draft',async()=>{mount();await screen.findByText('Elias Zafar <elias.zafar@partsunion.de>');expect(screen.getByText('kunde@example.test')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Nachricht'),{target:{value:'Danke, Herr Müller!'}});fireEvent.click(screen.getByRole('button',{name:'Vorschau'}));const preview=await screen.findByTitle('Vorschau der Partsunion-E-Mail');expect(preview).toHaveAttribute('sandbox','');expect(preview).toHaveAttribute('srcdoc','<p>Bearbeitete Partsunion-Vorlage</p>');fireEvent.click(screen.getByRole('button',{name:'E-Mail senden'}));await waitFor(()=>expect(api.send).toHaveBeenCalledWith('lead-1',expect.objectContaining({subject:draft.subject,body:'Danke, Herr Müller!'})));expect(sent).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1);});
it('keeps the exact request and draft when the response is lost, preventing a duplicate on retry',async()=>{api.send.mockRejectedValueOnce(new Error('Verbindung unterbrochen'));mount();await screen.findByLabelText('Nachricht');fireEvent.click(screen.getByRole('button',{name:'E-Mail senden'}));expect(await screen.findByRole('alert')).toHaveTextContent('Verbindung unterbrochen');expect(screen.getByLabelText('Nachricht')).toBeDisabled();expect(close).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Versand prüfen / fortsetzen'}));await waitFor(()=>expect(api.send).toHaveBeenCalledTimes(2));expect(api.send.mock.calls[1]).toEqual(api.send.mock.calls[0]);});
it('does not send when a personal mailbox or recipient is missing',async()=>{api.draft.mockResolvedValue({...draft,connected:false,sender:null,recipient:''});mount();await screen.findByText('Kein persönliches Postfach verbunden');expect(screen.getByRole('button',{name:'E-Mail senden'})).toBeDisabled();expect(api.send).not.toHaveBeenCalled();});

it('personalizes on opening from current conversation notes and keeps the result editable',async()=>{
 api.draft.mockResolvedValue({...draft,aiAvailable:true});api.personalize.mockResolvedValue({...draft,subject:'Für Ihr Gebrauchtteilelager',body:'Danke für den Austausch zum Lagerbestand.'});
 render(<LeadEmailComposer leadId="lead-1" conversationNotes="Gebrauchtteile, Lagerbestand" onClose={close} onSent={sent} onState={state}/>);
 await screen.findByDisplayValue('Danke für den Austausch zum Lagerbestand.');expect(api.personalize).toHaveBeenCalledWith('lead-1',{conversationNotes:'Gebrauchtteile, Lagerbestand'},expect.any(AbortSignal));
 fireEvent.change(screen.getByLabelText('Nachricht'),{target:{value:'Mein ergänzter Text'}});fireEvent.click(screen.getByRole('button',{name:'Vorschau'}));await screen.findByTitle('Vorschau der Partsunion-E-Mail');expect(api.preview).toHaveBeenCalledWith('lead-1','Für Ihr Gebrauchtteilelager','Mein ergänzter Text',false);expect(api.send).not.toHaveBeenCalled();
});
it('keeps the previous text on provider failure and offers explicit retry',async()=>{
 api.draft.mockResolvedValue({...draft,aiAvailable:true});api.personalize.mockRejectedValueOnce(new Error('Texthilfe vorübergehend nicht erreichbar')).mockResolvedValueOnce({...draft,body:'Persönlicher Text'});
 mount();await screen.findByText('Texthilfe vorübergehend nicht erreichbar');expect(screen.getByLabelText('Nachricht')).toHaveValue(draft.body);fireEvent.change(screen.getByLabelText('Was soll die E-Mail aufgreifen?'),{target:{value:'Kurz und mit Fokus auf Lager'}});fireEvent.click(screen.getByRole('button',{name:'Neu formulieren'}));await screen.findByDisplayValue('Persönlicher Text');expect(api.personalize.mock.calls[1][1]).toMatchObject({instructions:'Kurz und mit Fokus auf Lager'});fireEvent.click(screen.getByRole('button',{name:'Vorherigen Text wiederherstellen'}));expect(screen.getByLabelText('Nachricht')).toHaveValue(draft.body);
});

it('opts into the brochure, keeps handwritten text, previews it and removes the mention when unchecked',async()=>{
 const line='Im Anhang finden Sie unsere Partsunion-Broschüre für Neuteile mit einem kompakten Überblick.';
 api.preview.mockImplementation(async(_lead,subject,body,includeBrochure)=>({...draft,subject,body:body.replace('\n\n'+line,'')+(includeBrochure?'\n\n'+line:''),brochure:{key:'neuteile',label:'Neuteile',filename:'Partsunion_Broschuere_Neuteile.pdf'}}));
 mount();const checkbox=await screen.findByRole('checkbox',{name:'Mit Broschüre versenden'});expect(checkbox).not.toBeChecked();
 fireEvent.change(screen.getByLabelText('Nachricht'),{target:{value:'Mein persönlicher Text'}});
 fireEvent.click(checkbox);await waitFor(()=>expect(checkbox).toBeChecked());expect(screen.getByLabelText('Nachricht')).toHaveValue('Mein persönlicher Text\n\n'+line);expect(screen.getByText('Partsunion_Broschuere_Neuteile.pdf')).toBeVisible();
 fireEvent.click(checkbox);await waitFor(()=>expect(checkbox).not.toBeChecked());expect(screen.getByLabelText('Nachricht')).toHaveValue('Mein persönlicher Text');
 fireEvent.click(checkbox);await waitFor(()=>expect(checkbox).toBeChecked());fireEvent.click(screen.getByRole('button',{name:'E-Mail senden'}));await waitFor(()=>expect(api.send).toHaveBeenCalledWith('lead-1',expect.objectContaining({includeBrochure:true,body:'Mein persönlicher Text\n\n'+line})));
});
it('keeps the option and text unchanged if the brochure cannot be prepared',async()=>{
 api.preview.mockRejectedValueOnce(new Error('Broschüre nicht verfügbar'));mount();const checkbox=await screen.findByRole('checkbox',{name:'Mit Broschüre versenden'});fireEvent.click(checkbox);await screen.findByText('Broschüre nicht verfügbar');expect(checkbox).not.toBeChecked();expect(screen.getByLabelText('Nachricht')).toHaveValue(draft.body);
});
