import {test} from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,csvText} from '../src/csv.js';
test('spreadsheet exports treat formulas and prefixed control/whitespace payloads as literal text',()=>{
 for(const value of ['=1+1','+SUM(1;2)','-1+2','@SUM(1;2)','\t=1','\r=1','\n=HYPERLINK("https://example.org")',' \t=1','\u0000=1','\u2003+1'])assert.ok(csvCell(value).startsWith('"\''),JSON.stringify(value));
 for(const value of ['Mitarbeiter Beispiel','Max; Beispiel','Name "Zitat"','Gerät\nWartung','123'])assert.equal(csvCell(value),'"'+value.replaceAll('"','""')+'"');
 assert.equal(csvText([['Name','Studio'],['A;B','"Dörpen"']]),'"Name";"Studio"\r\n"A;B";"""Dörpen"""');
});

test('operational snapshots require all counts and explicit private/missing states before showing results',async()=>{
 const {validOperations}=await import('../src/operations-model.js');const {operationsFixture}=await import('./operations-fixture.js');assert.equal(validOperations(operationsFixture()),true);
 for(const change of [d=>{delete d.quality.auth_without_profile;},d=>{d.quality.active_without_studio=-1;},d=>{d.tables.pop();},d=>{d.buckets[0].exists=false;},d=>{d.checked_at='unknown';},d=>{d.cron.active_jobs=-1;}]){const data=operationsFixture();change(data);assert.equal(validOperations(data),false);}
 const data=operationsFixture();data.buckets[0]={id:data.buckets[0].id,exists:false,private:null,size_limit:null};assert.equal(validOperations(data),true);
});
