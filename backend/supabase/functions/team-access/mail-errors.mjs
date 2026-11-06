// Return only stable categories. Provider messages can contain private configuration.
export function mailFailureReason(error){
 const code=error?.code||'',message=typeof error?.message==='string'?error.message:'';
 if(error?.status===429||['over_request_rate_limit','over_email_send_rate_limit','over_sms_send_rate_limit'].includes(code))return 'rate_limited';
 if(code==='email_address_not_authorized'||/email address not authorized|can only send.*(team|authoriz)|not authorized.*(email|recipient)/i.test(message))return 'recipient_restricted';
 if(['email_provider_disabled','otp_disabled','provider_disabled'].includes(code))return 'provider_disabled';
 if(['user_not_found','signup_disabled','user_banned','email_address_invalid'].includes(code)||/signups? not allowed|user not found/i.test(message))return 'account_unavailable';
 if(error?.status>=500||/error sending.*(email|mail)|smtp/i.test(message))return 'mail_service_error';
 return 'unknown';
}
