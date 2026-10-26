-- Solo campos estructurados; nunca almacenar aquí texto OCR o imágenes originales.
begin;
alter table public.offer_evaluations drop constraint offer_evaluations_source_check;
alter table public.offer_evaluations add constraint offer_evaluations_source_check check (source in ('manual', 'example', 'capture'));
alter table public.offer_evaluations add column extraction jsonb;
alter table public.offer_evaluations add constraint extraction_shape check (
  extraction is null or (
    jsonb_typeof(extraction) = 'object'
    and extraction ? 'parserVersion' and extraction ? 'input'
    and extraction->>'parserVersion' = '1'
    and extraction->>'input' in ('image', 'text')
    and (extraction - 'parserVersion' - 'input') = '{}'::jsonb
  )
);
commit;
