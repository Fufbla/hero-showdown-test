import {makeHandler} from './delete-hero.mjs';
Deno.serve(makeHandler({url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
