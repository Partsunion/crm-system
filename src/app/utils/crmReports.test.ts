import {expect,it} from 'vitest';
import {reportPreset,shiftReportDay} from './crmReports';
it('selects Monday-Sunday weeks across years and DST',()=>{
 expect(reportPreset('week','2026-01-01')).toEqual({from:'2025-12-29',to:'2026-01-04'});
 expect(reportPreset('lastWeek','2026-03-30')).toEqual({from:'2026-03-23',to:'2026-03-29'});
 expect(reportPreset('yesterday','2026-03-30')).toEqual({from:'2026-03-29',to:'2026-03-29'});
 expect(shiftReportDay('2026-03-29',1)).toBe('2026-03-30');
});
