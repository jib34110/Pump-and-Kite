# La Mie Dorée — jeu de gestion de boulangerie

Jeu autonome en un seul fichier : `index.html`. Il contient le HTML, le CSS et le JavaScript. Il n'utilise aucune bibliothèque, ne fait aucun appel réseau et ne collecte aucune donnée personnelle. Il fonctionne hors ligne : ouvrez simplement le fichier dans un navigateur, sur téléphone ou sur ordinateur.

## Déroulement d'une journée (environ 5 minutes)

1. **Préparation** : prévision de la demande, réserve en grammes et kilogrammes, commandes au fournisseur, recettes, équipe, travaux.
2. **Matin, au fournil** : lancer des fournées, puis réussir les gestes (pétrissage, façonnage, scarification) et défourner dans la zone dorée. Les temps de pousse et de cuisson sont réels : il faut planifier.
3. **Midi, au comptoir** : servir la commande affichée dans la bulle et rendre la monnaie exacte.
4. **Soir** : compter la caisse, puis faire le ménage. La propreté influence la réputation.
5. **Bilan** : chiffre d'affaires, coûts, pertes, XP, réputation et déblocages.

Gaston, le maître boulanger, guide les jours 1 à 3. Le tutoriel peut être ignoré à tout moment (« Passer le tutoriel ») ou désactivé dès le départ (« Nouvelle partie sans tutoriel »).

## Commandes

| Action | Tactile ou souris | Clavier |
|---|---|---|
| Lancer une fournée | Toucher la carte recette | Touches 1 à 8 |
| Geste suivant / défourner | Toucher le bouton ou le four | Espace (Maj + Espace : mode rapide ⚡) |
| Pétrir | Faire des cercles réguliers | Espace, en rythme régulier |
| Façonner / scarifier | Tracer le geste | Espace (2 étoiles automatiques) |
| Remplir le plateau | Toucher ou glisser un produit | Touches 1 à 8, Retour arrière pour retirer |
| Servir / rupture | Boutons « Servir » et « Rupture » | Entrée / R |
| Rendre la monnaie | Toucher les pièces | 1 = 5 €, 2 = 2 €, 3 = 1 €, 4 = 50 c, 5 = 20 c, 6 = 10 c, Entrée |
| Caisse | Pavé numérique | Chiffres, virgule, Entrée |
| Ménage | Frotter les taches | Espace |
| Menu | ☰ | Échap |

Le bouton 🔊 coupe le son. La partie est sauvegardée automatiquement au début de chaque journée, dans le `localStorage` du navigateur. Le menu ☰ permet de lancer une nouvelle partie.

## Équilibrage modifiable

Tous les réglages se trouvent au début du script, section « 2. ÉQUILIBRAGE ». Les montants sont exprimés en centimes.

- `CONFIG` : capital initial (1 500 €), charges quotidiennes, durées des phases, gains d'XP, seuil du mode rapide, clients par étoile de réputation, patience, bradage des invendus, événements, conditions d'embauche, seuil de faillite.
- `INGREDIENTS` : prix au kilogramme, stock initial et taille des lots (en grammes).
- `RECETTES` : dosages en grammes pour une pâte de base, nombre de pièces, prix, étapes, temps de pousse et de cuisson (secondes réelles), niveau de déblocage, popularité.
- `AMELIORATIONS` : travaux et expansion (prix, niveau requis).

Formules principales :

- XP pour passer au niveau suivant : `100 × niveau^1,5`.
- Vitesse du patron : `max(0,6 ; 1 − 0,03 × (niveau − 1))`, appliquée aux minuteries.
- Compétence par produit (1 à 10) : délais `× (1 − 0,055 × (compétence − 1))`, soit environ −50 % au niveau 10, et prix `× (1 + 0,02 × (compétence − 1))`.
- Prix de vente : `prix de base × (0,8 + 0,1 × étoiles)`, arrondi aux 10 centimes.
- Clients par jour : `(8 + 4 × réputation)`, avec un bonus pour la vitrine et certains événements.
- Réputation : moyenne glissante de la satisfaction, pondérée par la propreté.
- Mode rapide : disponible dès la compétence 3. La qualité dépend de la compétence, et il existe un petit risque d'erreur au début.

## Pistes d'évolution

- Découper le fichier en modules (données, logique, rendu) avec une étape de construction.
- Ajouter des recettes saisonnières (galette des rois en janvier, brioches de Pâques).
- Prévoir des commandes à l'avance passées par téléphone, ou une livraison du fournisseur le lendemain à prix réduit.
- Gérer plusieurs boutiques séparément, avec une équipe propre à chacune.
- Ajouter des succès, des statistiques sur plusieurs jours et un graphique d'évolution du chiffre d'affaires.
- Proposer des réglages d'accessibilité : taille du texte, contraste, mode sans chronomètre.
