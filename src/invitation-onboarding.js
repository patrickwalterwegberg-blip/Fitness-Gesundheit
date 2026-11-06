const planError=message=>Object.assign(new Error(message),{invitationMessage:message});
export const isInvitationUserId=value=>typeof value==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value);
export function onboardingDueDate(start,days){if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||start.startsWith('0000'))return '';const offset=Number(days??0);if(!Number.isInteger(offset)||offset<0||offset>365)return '';const date=new Date(start+'T12:00:00Z');if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==start)return '';date.setUTCDate(date.getUTCDate()+offset);const result=date.toISOString().slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(result)?result:'';}
export function invitationOnboardingPlan(value,studioIds){
 if(!value?.enabled)return null;
 if(!value.ready||!isInvitationUserId(value.template)||!isInvitationUserId(value.mentor)||!isInvitationUserId(value.nonce)||!studioIds.includes(value.studio)||!onboardingDueDate(value.start,0))throw planError('Bitte wähle eine veröffentlichte Onboardingvorlage, ein zugeordnetes Studio, ein Startdatum und einen freigegebenen Mentor.');
 return {template:value.template,studio:value.studio,start:value.start,mentor:value.mentor,nonce:value.nonce,revision:value.revision,title:value.title,mentorName:value.mentorName,studioName:value.studioName,steps:value.steps};
}
export function invitedEnrollmentArgs(plan,user){if(!isInvitationUserId(user))throw planError('Die Einladung wurde angefordert, aber die Mitarbeiter-ID fehlt in der Bestätigung. Bitte aktualisiere die Zugangsliste und prüfe das Konto. Weise das Onboarding anschließend im Lernhub zu.');return {p_template:plan.template,p_user:user,p_studio:plan.studio,p_start:plan.start,p_mentor:plan.mentor,p_nonce:plan.nonce};}
export async function checkInvitationOnboarding(client,plan,signal){
 const doc=await client.from('onboarding_templates').select('id,title,studio_id,steps,published,revision').eq('id',plan.template).maybeSingle().abortSignal(signal);if(doc.error)throw doc.error;
 if(!doc.data?.published||doc.data.revision!==plan.revision||doc.data.studio_id&&doc.data.studio_id!==plan.studio)throw planError('Die Onboardingvorlage wurde geändert oder ist nicht mehr freigegeben. Lade die Vorlagen erneut, prüfe die Vorschau und bestätige sie noch einmal.');
 const mentors=await client.rpc('onboarding_mentors',{p_studio:plan.studio}).abortSignal(signal);if(mentors.error)throw mentors.error;if(!Array.isArray(mentors.data)||!mentors.data.some(m=>m.id===plan.mentor))throw planError('Der gewählte Mentor ist nicht mehr freigegeben. Bitte lade die Ansprechpartner erneut.');
}
