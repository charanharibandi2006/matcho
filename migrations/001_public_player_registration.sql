-- Matcho public player registration
ALTER TABLE public.tournament_registrations
    ADD COLUMN IF NOT EXISTS gender VARCHAR(30),
    ADD COLUMN IF NOT EXISTS c_flat_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(30);
