import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://xbbtpakfbizkxfbvzopl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYnRwYWtmYml6a3hmYnZ6b3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzQwODAsImV4cCI6MjA3MTM1MDA4MH0.dOe4Thbi0WnYR7CYWPLQD-x4AtiiynM9wdjaSyfxWio';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
