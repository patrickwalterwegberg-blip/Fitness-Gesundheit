import {test} from 'node:test';
import assert from 'node:assert/strict';
import {berlinInstant,berlinLocal,dayBounds,repeatLabel} from '../src/schedule-model.js';
test('Berlin appointments use the correct seasonal offset independent of device timezone',()=>{assert.equal(berlinInstant('2026-11-04T13:00'),'2026-11-04T12:00:00.000Z');assert.equal(berlinInstant('2026-07-04T13:00'),'2026-07-04T11:00:00.000Z');assert.equal(berlinLocal('2026-11-04T23:30Z'),'2026-11-05T00:30');});
test('ambiguous and missing DST clock times require explicit correction',()=>{assert.throws(()=>berlinInstant('2026-03-29T02:30'));assert.throws(()=>berlinInstant('2026-10-25T02:30'));});
test('calendar days span 23 or 25 hours during the DST transition',()=>{for(const [day,hours] of [['2026-03-29',23],['2026-10-25',25]]){const [start,end]=dayBounds(day);assert.equal((Date.parse(end)-Date.parse(start))/3600000,hours);}});
test('half-year repeat is presented as six months',()=>{assert.equal(repeatLabel({repeat_unit:'month',repeat_every:6}),'Alle 6 Monate');});
