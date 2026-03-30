-- ============================================================
--  PUMP & KITE — Table clients
--  Colle ce script en ENTIER dans Supabase > SQL Editor > Run
--
--  Ce que ça fait :
--   1. Crée la table clients (1 ligne = 1 email unique)
--   2. La remplit automatiquement depuis les réservations existantes
--   3. Crée un trigger : toute nouvelle réservation crée/met à jour le client
--   4. Active RLS + droits d'accès
-- ============================================================


-- ============================================================
--  ÉTAPE 1 — Création de la table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identité (email = clé unique)
  email           text        UNIQUE NOT NULL,
  prenom          text        NOT NULL DEFAULT '',
  nom             text        NOT NULL DEFAULT '',
  telephone       text        DEFAULT '',

  -- Localisation (optionnel)
  dept            text        DEFAULT '',
  pays            text        DEFAULT 'France',

  -- Notes internes (usage admin uniquement)
  notes           text        DEFAULT '',

  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);


-- ============================================================
--  ÉTAPE 2 — Peupler depuis les réservations existantes
--  (garde la ligne la plus récente par email)
-- ============================================================
INSERT INTO public.clients (email, prenom, nom, telephone, user_id, created_at)
SELECT DISTINCT ON (email)
  email,
  COALESCE(NULLIF(prenom, ''), 'Inconnu'),
  COALESCE(NULLIF(nom, ''),    'Inconnu'),
  COALESCE(telephone, ''),
  user_id,
  MIN(created_at) OVER (PARTITION BY email)
FROM public.reservations
WHERE email IS NOT NULL AND email <> ''
ORDER BY email, created_at DESC
ON CONFLICT (email) DO NOTHING;


-- ============================================================
--  ÉTAPE 3 — Trigger : chaque réservation crée/met à jour le client
--  (s'exécute automatiquement, sans rien changer dans le code JS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_client_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clients (email, prenom, nom, telephone, user_id)
  VALUES (
    NEW.email,
    COALESCE(NULLIF(NEW.prenom, ''), 'Inconnu'),
    COALESCE(NULLIF(NEW.nom, ''),    'Inconnu'),
    COALESCE(NEW.telephone, ''),
    NEW.user_id
  )
  ON CONFLICT (email) DO UPDATE
    SET
      -- Met à jour seulement si la nouvelle valeur n'est pas vide
      prenom     = CASE WHEN NULLIF(NEW.prenom, '')    IS NOT NULL THEN NEW.prenom    ELSE clients.prenom    END,
      nom        = CASE WHEN NULLIF(NEW.nom, '')       IS NOT NULL THEN NEW.nom       ELSE clients.nom       END,
      telephone  = CASE WHEN NULLIF(NEW.telephone, '') IS NOT NULL THEN NEW.telephone ELSE clients.telephone END,
      user_id    = COALESCE(NEW.user_id, clients.user_id),
      updated_at = now();
  RETURN NEW;
END;
$$;

-- Attache le trigger à la table reservations
DROP TRIGGER IF EXISTS trg_upsert_client ON public.reservations;
CREATE TRIGGER trg_upsert_client
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_client_on_reservation();


-- ============================================================
--  ÉTAPE 4 — Sécurité (RLS)
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "clients_select_own"   ON public.clients;
DROP POLICY IF EXISTS "clients_insert_anon"  ON public.clients;
DROP POLICY IF EXISTS "clients_update_own"   ON public.clients;

-- Un client connecté voit uniquement sa propre fiche
CREATE POLICY "clients_select_own" ON public.clients
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Toute réservation (même sans compte) peut créer une fiche client
CREATE POLICY "clients_insert_anon" ON public.clients
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Un client connecté peut modifier sa propre fiche
CREATE POLICY "clients_update_own" ON public.clients
  FOR UPDATE TO authenticated
  USING  (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Droits PostgreSQL
GRANT SELECT, INSERT, UPDATE ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;


-- ============================================================
--  VÉRIFICATION FINALE — doit afficher la liste de tes clients
-- ============================================================
SELECT
  email,
  prenom,
  nom,
  telephone,
  created_at::date AS depuis
FROM public.clients
ORDER BY created_at DESC;
