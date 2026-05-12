import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syqtaulbrtlgtsagtadw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cXRhdWxicnRsZ3RzYWd0YWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzMyMjEsImV4cCI6MjA4OTUwOTIyMX0.HOdwJqVODhqJr3ceXn2xhH9HGlr-Cmurjor76eFOIbU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
