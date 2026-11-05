import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseCompletion,onboardingProgress,onboardingStarter} from '../src/onboarding-model.js';
test('course tiles cannot show completion while the exam or required practice is outstanding',()=>{
 const c={lesson_count:2},a={requires_practice:true};assert.deepEqual(courseCompletion(c,a,{lessons_read:2}),{percent:50,done:false});assert.deepEqual(courseCompletion(c,a,{lessons_read:2,quiz_passed:true}),{percent:75,done:false});assert.deepEqual(courseCompletion(c,a,{lessons_read:2,quiz_passed:true,practice_confirmed:true}),{percent:100,done:true});assert.equal(courseCompletion(c,null,{}).done,false);
});
test('onboarding progress uses completed server steps and empty programs never appear complete',()=>{assert.deepEqual(onboardingProgress({total:3,done:1}),{total:3,done:1,percent:33,complete:false});assert.equal(onboardingProgress({total:0,done:0}).complete,false);assert.equal(onboardingProgress({total:3,done:3}).complete,true);});
test('the starter uses active real courses only and preserves a separate safety signoff',()=>{const steps=onboardingStarter([{id:'old',title:'Inactive',active:false},{id:'new',title:'Datenschutz',active:true}]);assert.equal(steps.find(s=>s.kind==='course').course_id,'new');assert.equal(steps.find(s=>s.kind==='course').title,'Datenschutz');assert.ok(steps.some(s=>s.kind==='check'&&s.requires_review));assert.ok(!onboardingStarter([]).some(s=>s.kind==='course'));});
