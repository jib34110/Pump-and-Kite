-- ============================================================
--  PUMP & KITE — FIX DES POLITIQUES RLS
--  Colle ce script dans Supabase > SQL Editor > Run
--  Résout : "new row violates row-level security policy"
-- ============================================================


-- ÉTAPE 1 : Supprimer toutes les anciennes policies (au cas où)
DROP POLICY IF EXISTS "Public insert reservations"        ON public.reservations;
DROP POLICY IF EXISTS "Users read own reservations"       ON public.reservations;
DROP POLICY IF EXISTS "Anyone can create reservations"    ON public.reservations;
DROP POLICY IF EXISTS "Users can see own reservations"    ON public.reservations;
DROP POLICY IF EXISTS "Public read absences"              ON public.absences;
DROP POLICY IF EXISTS "Anyone can read absences"          ON public.absences;


-- ÉTAPE 2 : Recréer les policies correctement avec TO explicite

-- Tout le monde (connecté ou non) peut soumettre une réservation
CREATE POLICY "insert_reservations"
  ON public.reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Visiteurs non connectés peuvent lire les réservations (pour compter les créneaux pris)
CREATE POLICY "select_reservations_anon"
  ON public.reservations
  FOR SELECT
  TO anon
  USING (true);

-- Utilisateurs connectés voient uniquement leurs propres réservations
CREATE POLICY "select_reservations_authenticated"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Tout le monde peut lire les absences (pour afficher le calendrier)
CREATE POLICY "select_absences"
  ON public.absences
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ÉTAPE 3 : Vérification — doit retourner 4 lignes
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('reservations', 'absences')
ORDER BY tablename, cmd;
