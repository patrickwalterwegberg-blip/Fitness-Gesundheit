import {test} from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,csvText} from '../src/csv.js';
test('spreadsheet exports treat formulas and prefixed control/whitespace payloads as literal text',()=>{
 for(const value of ['=1+1','+SUM(1;2)','-1+2','@SUM(1;2)','\t=1','\r=1','\n=HYPERLINK("https://example.org")',' \t=1','\u0000=1','\u2003+1'])assert.ok(csvCell(value).startsWith('"\''),JSON.stringify(value));
 for(const value of ['Mitarbeiter Beispiel','Max; Beispiel','Name "Zitat"','Gerät\nWartung','123'])assert.equal(csvCell(value),'"'+value.replaceAll('"','""')+'"');
 assert.equal(csvText([['Name','Studio'],['A;B','"Dörpen"']]),'"Name";"Studio"\r\n"A;B";"""Dörpen"""');
});
