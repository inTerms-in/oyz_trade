CREATE OR REPLACE FUNCTION public.generate_item_code(p_category_id bigint, p_item_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    category_prefix TEXT;
    sequence_name TEXT;
    next_val BIGINT;
BEGIN
    -- Get category prefix
    SELECT
        CASE
            WHEN LENGTH("CategoryName") > 1 THEN UPPER(SUBSTRING("CategoryName", 1, 2))
            ELSE UPPER("CategoryName") || 'X'
        END
    INTO category_prefix
    FROM public."CategoryMaster"
    WHERE "CategoryId" = p_category_id;

    IF category_prefix IS NULL THEN
        RETURN 'ITEM-' || p_item_id::TEXT; -- Fallback if category not found
    END IF;

    -- Create or get sequence name for the category
    sequence_name := 'item_code_seq_' || p_category_id::TEXT;

    -- Attempt to create the sequence if it doesn't exist.
    -- This DDL statement will ensure it's available for the nextval call.
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.' || quote_ident(sequence_name) || ' START 1';

    -- Get the next value from the sequence, explicitly qualifying with public schema
    SELECT nextval('public.' || quote_ident(sequence_name)) INTO next_val;

    RETURN category_prefix || LPAD(next_val::TEXT, 4, '0');
END;
$function$