import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingDueDate,invitationOnboardingPlan,invitedEnrollmentArgs} from '../src/invitation-onboarding.js';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const value={enabled:true,ready:true,template:id(1),mentor:id(2),nonce:id(3),studio:id(4),start:'2026-10-24',revision:1,steps:[]};
test('preview due dates use calendar days across daylight saving and reject invalid dates',()=>{
 assert.equal(onboardingDueDate('2026-10-24',3),'2026-10-27');assert.equal(onboardingDueDate('2028-02-28',1),'2028-02-29');assert.equal(onboardingDueDate('2026-02-30',1),'');assert.equal(onboardingDueDate('',7),'');assert.equal(onboardingDueDate('0000-01-01',0),'');assert.equal(onboardingDueDate('2026-01-01',Infinity),'');assert.equal(onboardingDueDate('2026-01-01',-1),'');
});
test('a selected plan requires a reviewed available choice in an assigned studio',()=>{
 assert.equal(invitationOnboardingPlan({enabled:false},[]),null);assert.throws(()=>invitationOnboardingPlan(value,[]));assert.throws(()=>invitationOnboardingPlan({...value,ready:false},[value.studio]));assert.throws(()=>invitationOnboardingPlan({...value,mentor:''},[value.studio]));assert.equal(invitationOnboardingPlan(value,[value.studio]).nonce,value.nonce);
});
test('enrollment targets only the confirmed account and preserves retry identity',()=>{
 const plan=invitationOnboardingPlan(value,[value.studio]);assert.throws(()=>invitedEnrollmentArgs(plan,undefined));assert.throws(()=>invitedEnrollmentArgs(plan,'invalid'));const args=invitedEnrollmentArgs(plan,id(9));assert.equal(args.p_user,id(9));assert.equal(args.p_nonce,value.nonce);assert.deepEqual(invitedEnrollmentArgs(plan,id(9)),args);
});
