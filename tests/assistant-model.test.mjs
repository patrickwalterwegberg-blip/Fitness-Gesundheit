import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantSearchQuery,asksForDueTasks,sourceExcerpt} from '../src/team-assistant-model.js';
test('natural German questions produce bounded literal search terms',()=>{
 assert.equal(assistantSearchQuery('Wie melde ich ein defektes Gerät?'),'"melde" OR "defektes" OR "gerät"');
 for(const question of ['Wartung '.repeat(40),'x'.repeat(300),'Wartungsplanung '.repeat(20)]){
  const query=assistantSearchQuery(question);assert.ok(query.length<=300);assert.equal(query.match(/"/g).length%2,0);
 }
});
test('due-task questions do not turn how-to questions into personal task lists',()=>{
 assert.equal(asksForDueTasks('Welche meiner Aufgaben sind heute fällig?'),true);
 assert.equal(asksForDueTasks('Wie kann ich eine Aufgabe für heute erstellen?'),false);
 assert.equal(asksForDueTasks('Wie kann ich Aufgaben zuweisen?'),false);
});
test('long source excerpts retain the matching passage and display omitted text',()=>{
 const excerpt=sourceExcerpt('Anfang. '.repeat(200)+'Gerätewartung: Alle sechs Monate prüfen. '+'Weitere Hinweise. '.repeat(200),'Wann ist die Gerätewartung?');
 assert.ok(excerpt.includes('Gerätewartung: Alle sechs Monate prüfen.'));assert.ok(excerpt.startsWith('…'));assert.ok(excerpt.endsWith('…'));assert.ok(excerpt.length<=702);
});
