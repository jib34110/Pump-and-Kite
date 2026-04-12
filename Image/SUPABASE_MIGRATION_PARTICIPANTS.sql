-- ============================================================
--  PUMP & KITE — Migration : Réservations multi-participants + durée
--  Colle ce script dans Supabase > SQL Editor > Run
--  Ajoute 3 nouvelles colonnes à la table reservations :
--    • nb_participants  : nombre total de participants (1 par défaut)
--    • participants     : JSON des participants supplémentaires
--    • duree            : durée du cours en heures (ex: 1, 1.5, 2, 3, 4)
-- ============================================================


-- Ajouter les colonnes (sûr même si déjà exécuté, IF NOT EXISTS)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS nb_participants integer  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS participants    jsonb    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duree           numeric  DEFAULT 1;


-- Vérification : doit afficher les 3 nouvelles colonnes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'reservations'
  AND column_name  IN ('nb_participants', 'participants', 'duree');
-- Résultat attendu : 3 lignes
