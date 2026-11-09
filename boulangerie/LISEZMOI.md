# La Mie Dorée — jeu de gestion de boulangerie

Jeu autonome en un seul fichier : `index.html`. Il contient le HTML, le CSS et le JavaScript. Il n'utilise aucune bibliothèque, ne fait aucun appel réseau et ne collecte aucune donnée personnelle. Il fonctionne hors ligne : ouvrez simplement le fichier dans un navigateur, sur téléphone ou sur ordinateur.

## Début de partie

1. **Journée découverte Chez les voisins** : Jean-Baptiste, gérant de la boulangerie Chez les voisins à Frontignan, t'invite à passer une journée dans sa boutique, où tout est au maximum. Il y a deux fourniers de niveau 10 (Mathis à la pâte, Sofiane au four), deux vendeuses de niveau 10 qui font des ventes additionnelles (Laura et Emma), six fours, la chambre de pousse, le pétrin mécanique, toutes les recettes au niveau 10 et plus de 100 clients. Cette journée n'est jamais sauvegardée.
2. **Ta boulangerie** : à la fin de la journée découverte, tu donnes un nom à ta boulangerie, puis tu repars de zéro, seul, avec 1 500 €. Jean-Baptiste t'accompagne pendant tes trois premiers jours.

« Nouvelle partie sans tutoriel » saute la journée découverte et passe directement au choix du nom.

## Déroulement d'une journée (environ 5 minutes)

1. **Préparation** : prévision de la demande, réserve en grammes et kilogrammes, commandes au fournisseur, recettes, équipe, travaux.
2. **Matin, au fournil** : lancer des fournées, puis réussir les gestes (pétrissage, façonnage, scarification) et défourner dans la zone dorée. Les temps de pousse et de cuisson sont réels : il faut planifier.
3. **Ouverture, au comptoir** : la boutique ouvre quand vous le décidez, et au plus tard à 11 h ; elle ferme à 19 h. Ouvrir plus tôt donne des heures de vente et des clients en plus. Il faut servir la commande affichée dans la bulle et rendre la monnaie exacte.
4. **Soir** : compter la caisse, puis faire le ménage. La propreté influence la réputation.
5. **Bilan** : chiffre d'affaires, coûts, pertes, XP, réputation et déblocages.

Jean-Baptiste, patron de la boulangerie Chez les voisins à Frontignan, guide les jours 1 à 3. Le tutoriel peut être ignoré à tout moment (« Passer le tutoriel ») ou désactivé dès le départ (« Nouvelle partie sans tutoriel »).

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

Réglage « Aide au rendu de monnaie » (menu ☰ ou onglet Journée) : quand elle est activée, le montant à rendre est affiché. Quand elle est désactivée, le joueur calcule lui-même et gagne +10 % (`CONFIG.bonusSansAide`) sur chaque vente où la monnaie est rendue juste. L'aide est toujours affichée pendant les deux premiers jours du tutoriel.

Le bouton 🔊 coupe le son. La partie est sauvegardée automatiquement au début de chaque journée, dans le `localStorage` du navigateur. Le menu ☰ permet de lancer une nouvelle partie.

## Étoiles

Chaque geste (pétrir, façonner, scarifier) et la cuisson reçoivent 1 à 3 étoiles. La fournée prend la moyenne, arrondie :

| Note | Prix de vente | Clients | XP de la fournée |
|---|---|---|---|
| ★☆☆ | −10 % | moins satisfaits | +5 |
| ★★☆ | prix normal | normal | +10 |
| ★★★ | +10 % | ravis, réputation en hausse | +15 |

Après chaque geste, l'écran montre la note actuelle de la fournée et le prix qu'elle vaudrait. Le tableau se retrouve aussi dans l'onglet Recettes et dans le menu ☰.

## Équipe (à partir du niveau 5)

- **Fournier** : chaque matin, dans l'onglet Journée, tu lui confies la **pâte** (il pétrit, façonne et scarifie seul les fournées en attente) ou le **four** (il défourne). Sans consigne, il ne fait rien. Il progresse dans la tâche qu'il pratique (niveau 1 à 10) : il va plus vite et son travail vaut plus d'étoiles. Au four, il défourne de plus en plus près du moment idéal.
- **Vendeur** : il sert une partie des clients. Avec l'expérience, il propose des ventes additionnelles (≈ 8 % + 5 % par niveau). S'il n'y a plus de stock, la vente est manquée et le bilan le signale : il faut alors produire plus.
- **Plongeur** : il fait une partie du ménage avant toi.
- La formation (payante) fait gagner un niveau dans une tâche. Le salaire du marché suit le niveau : un employé sous-payé perd le moral et peut démissionner.

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
- Ouverture anticipée : chaque heure d'ouverture avant 11 h ajoute `1/8` des clients de la journée et allonge le service d'autant.
- Réputation : moyenne glissante de la satisfaction, pondérée par la propreté.
- Mode rapide : disponible dès la compétence 3. La qualité dépend de la compétence, et il existe un petit risque d'erreur au début.

## Pistes d'évolution

- Découper le fichier en modules (données, logique, rendu) avec une étape de construction.
- Ajouter des recettes saisonnières (galette des rois en janvier, brioches de Pâques).
- Prévoir des commandes à l'avance passées par téléphone, ou une livraison du fournisseur le lendemain à prix réduit.
- Gérer plusieurs boutiques séparément, avec une équipe propre à chacune.
- Ajouter des succès, des statistiques sur plusieurs jours et un graphique d'évolution du chiffre d'affaires.
- Proposer des réglages d'accessibilité : taille du texte, contraste, mode sans chronomètre.
