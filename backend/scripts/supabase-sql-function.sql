-- Supabase setup for raw SQL execution
-- Run this in your Supabase SQL Editor

-- Create a function to execute raw SQL queries (for backwards compatibility)
CREATE OR REPLACE FUNCTION execute_sql(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- For security, you might want to restrict this function
    -- This is a simplified version - in production, add proper security checks
    
    -- Execute the query and return results as JSON
    EXECUTE query_text INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL execution error: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql TO service_role;