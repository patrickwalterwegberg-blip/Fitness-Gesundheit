import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createTeamAccessHandler } from './handler.mjs';

Deno.serve(createTeamAccessHandler({ createClient, env: Deno.env }));
