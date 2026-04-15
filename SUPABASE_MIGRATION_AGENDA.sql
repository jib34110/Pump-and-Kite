-- ============================================================
--  PUMP & KITE — Migration : Agenda des disponibilités
--  À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Ajout de la colonne creneau sur la table absences
--    NULL  = journée entière bloquée
--    'Matin' ou 'Après-midi' = créneau spécifique bloqué
ALTER TABLE absences ADD COLUMN IF NOT EXISTS creneau text;

-- 2. Index unicité pour éviter les doublons
--    Un seul enregistrement par (date, creneau)
CREATE UNIQUE INDEX IF NOT EXISTS absences_date_creneau_uq
  ON absences (date, creneau)
  WHERE creneau IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS absences_date_full_uq
  ON absences (date)
  WHERE creneau IS NULL;

-- 3. Activation RLS sur la table absences
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
--    SELECT public (utilisé par reservation.js)
DROP POLICY IF EXISTS "absences_select_anon" ON absences;
CREATE POLICY "absences_select_anon" ON absences
  FOR SELECT TO anon USING (true);

--    INSERT admin (via dashboard admin avec clé anon)
DROP POLICY IF EXISTS "absences_insert_anon" ON absences;
CREATE POLICY "absences_insert_anon" ON absences
  FOR INSERT TO anon WITH CHECK (true);

--    DELETE admin (via dashboard admin avec clé anon)
DROP POLICY IF EXISTS "absences_delete_anon" ON absences;
CREATE POLICY "absences_delete_anon" ON absences
  FOR DELETE TO anon USING (true);
