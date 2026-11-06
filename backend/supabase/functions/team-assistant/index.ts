import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createAssistantHandler} from './handler.mjs';
Deno.serve(createAssistantHandler({createClient,env:Deno.env}));
