import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulyxxyuwljrqzvqacdhm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseXh4eXV3bGpycXp2cWFjZGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MDUwMzMsImV4cCI6MjEwNzA4MTAzM30.cJcABmUL-S1aVAyaJFKvHfQKFNsgWaYiEICSdjTmg0Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);