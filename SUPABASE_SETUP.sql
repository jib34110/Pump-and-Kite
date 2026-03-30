-- ============================================================
--  PUMP & KITE — Script de création des tables Supabase
--  À coller dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ============================================================
--  TABLE : reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         timestamptz DEFAULT now(),
  nom                text NOT NULL,
  prenom             text NOT NULL,
  email              text NOT NULL,
  telephone          text,
  discipline         text,
  prestation         text,
  niveau             text,
  date               date,
  creneau            text,
  materiel_personnel boolean DEFAULT false,
  tarif              numeric,
  message            text,
  statut             text DEFAULT 'En attente',
  paiement           text DEFAULT 'En attente de paiement',
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour rechercher rapidement par email
CREATE INDEX IF NOT EXISTS idx_reservations_email ON public.reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_date  ON public.reservations(date);


-- ============================================================
--  TABLE : absences (jours où le moniteur n'est pas dispo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.absences (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date NOT NULL UNIQUE,
  motif      text
);


-- ============================================================
--  SÉCURITÉ : Row Level Security (RLS)
-- ============================================================

-- Activer RLS sur les deux tables
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences     ENABLE ROW LEVEL SECURITY;


-- ---- POLICIES : reservations ----

-- N'importe qui (même non connecté) peut créer une réservation
CREATE POLICY "Public insert reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (true);

-- Un utilisateur connecté peut lire SES propres réservations
CREATE POLICY "Users read own reservations"
  ON public.reservations FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Le propriétaire (service role) peut tout faire → géré via le Dashboard Supabase


-- ---- POLICIES : absences ----

-- Tout le monde peut lire les absences (pour afficher le calendrier)
CREATE POLICY "Public read absences"
  ON public.absences FOR SELECT
  USING (true);


-- ============================================================
--  DONNÉES DE TEST (optionnel — supprimer si pas nécessaire)
-- ============================================================
-- INSERT INTO public.absences (date, motif) VALUES
--   ('2026-04-01', 'Férié'),
--   ('2026-04-21', 'Vacances');


-- ============================================================
--  PERMISSIONS (GRANT) — indispensable pour que ça fonctionne !
-- ============================================================

-- Visiteurs non connectés : créer une réservation + voir les dispos
GRANT INSERT, SELECT ON public.reservations TO anon;
GRANT SELECT ON public.absences TO anon;

-- Utilisateurs connectés : voir leurs réservations + en créer
GRANT SELECT, INSERT ON public.reservations TO authenticated;
GRANT SELECT ON public.absences TO authenticated;


-- ============================================================
--  VÉRIFICATION
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('reservations', 'absences');
-- Doit retourner 2 lignes : reservations + absences
