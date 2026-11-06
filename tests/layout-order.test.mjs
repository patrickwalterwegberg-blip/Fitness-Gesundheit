import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutStorageKey,readLayout,ordered,mergeVisibleOrder} from '../src/layout-order.js';
test('hidden areas keep their saved place when the permitted menu is reordered',()=>{
 const previous=['tasks','knowledge','calendar','learning'];const merged=mergeVisibleOrder(previous,['learning','calendar','tasks']);assert.deepEqual(merged,['learning','knowledge','calendar','tasks']);const visible=[{id:'tasks'},{id:'calendar'},{id:'learning'}];assert.deepEqual(ordered(visible,merged).map(i=>i.id),['learning','calendar','tasks']);assert.deepEqual(ordered([...visible,{id:'knowledge'}],merged).map(i=>i.id),['learning','knowledge','calendar','tasks']);
});
test('saved order cannot introduce entries and new allowed entries remain reachable',()=>{
 const rows=[{id:'dashboard'},{id:'tasks'},{id:'calendar'}];assert.deepEqual(ordered(rows,['access','tasks','missing']).map(i=>i.id),['tasks','dashboard','calendar']);assert.notEqual(layoutStorageKey('studio-a','user-a'),layoutStorageKey('studio-b','user-a'));assert.notEqual(layoutStorageKey('studio-a','user-a'),layoutStorageKey('studio-a','user-b'));
});
test('invalid or unavailable browser data falls back to default sorting',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>'{broken'}});assert.deepEqual(readLayout('key'),{});
  globalThis.localStorage.getItem=()=>JSON.stringify({version:1,orders:{menu:['tasks','tasks',null,42,'calendar'],unknown:['admin'],shortcuts:'invalid'}});assert.deepEqual(readLayout('key'),{menu:['tasks','calendar']});
  globalThis.localStorage.getItem=()=>{throw new Error('blocked');};assert.deepEqual(readLayout('key'),{});
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
