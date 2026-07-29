-- Reset only registration/runtime data. Does not remove schema, policies, or configuration.
begin;
truncate table public.tracking_data restart identity cascade;
truncate table public.orders restart identity cascade;
truncate table public.delivery_details restart identity cascade;
truncate table public.selected_cars restart identity cascade;
truncate table public.user_sessions restart identity cascade;
truncate table public.giveaway_users restart identity cascade;
commit;
