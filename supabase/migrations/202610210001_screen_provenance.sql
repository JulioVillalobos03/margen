-- Prepared for future sync; no screenshots or raw OCR text are persisted.
begin;
alter table public.offer_evaluations drop constraint extraction_shape;
alter table public.offer_evaluations add constraint extraction_shape check (
  extraction is null or (
    jsonb_typeof(extraction) = 'object'
    and extraction ? 'parserVersion' and extraction ? 'input'
    and extraction->>'parserVersion' = '1'
    and extraction->>'input' in ('image', 'text', 'screen')
    and (extraction - 'parserVersion' - 'input') = '{}'::jsonb
  )
);
commit;
