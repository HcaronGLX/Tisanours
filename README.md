# Thème Shopify Tisa'nours

Thème Online Store 2.0 recréé à partir de la maquette desktop et mobile. Toutes les sections sont éditables dans l'éditeur de thème.

## Modèles

| Modèle | Usage |
|---|---|
| `index` | Accueil |
| `product.kit` | Kit Démarrage Rituel |
| `product.tropical-sunshine`, `product.happy-adventure`, `product.dream-forest` | Pages saveurs (univers jaune, rouge, violet) |
| `product.gourde` | Gourde infuseur |
| `product` | Produit par défaut |
| `page.a-propos`, `page.faq-contact`, `page.contact`, `page` | Pages |
| `page.pack` | Je compose mon pack (section « Composer mon pack ») |
| `collection`, `list-collections`, `search`, `cart`, `404`, `blog`, `article`, `password`, `gift_card`, `customers/*` | Modèles système |

## Données produit

- Les offres « 1 / 2 / 3 sachets » correspondent aux variantes du produit (option « Format »). Prix et prix barrés viennent des variantes.
- Gourde : le bloc « Sélecteur de variantes » est réglé sur « Images ». Chaque coloris affiche l'image associée à la variante dans la fiche produit (ou l'image d'échantillon de l'option si elle est définie).
- Métachamps produit (espace `custom`) : `univers` (`kit`, `sunshine`, `adventure`, `forest`, `bottle`), `saveur`, `sous_titre`, `accroche`. Ils alimentent les couleurs et les textes des cartes et du panier.

## Réglages du thème

- **Couleurs de la marque** et **Univers produits** : toutes les couleurs de la maquette.
- **Typographie** : police des titres et police des textes (bibliothèque Shopify, Fredoka et Nunito par défaut), taille des textes (14 px par défaut) et taille des titres (en %). Pour utiliser Archie, importer ses fichiers .woff2 dans *Contenu > Fichiers* et coller leurs URL : Archie remplace alors les polices choisies.
- **Panier** : seuil de livraison offerte (45 € par défaut), ouverture du panier latéral à l'ajout.
- **Panier latéral** (éditeur de thème > Panier latéral) : blocs « Palier » à débloquer (montant, avantage, nom court, icône). La barre affiche chaque palier et le message vers le suivant. Sans bloc, le seuil de livraison offerte ci-dessus est utilisé. L'avantage lui-même (livraison gratuite, cadeau, remise) se configure dans Shopify (Expédition, Remises).

Dans les titres, le texte en *italique* est affiché « surligné » (bloc vert incliné) et le texte en **gras** en rouge.

## Je compose mon pack

- Page « Je compose mon pack » (modèle `page.pack`). Les paliers affichés (2 sachets -5 %, 3 sachets -15 %, 5 sachets -20 %) correspondent à trois réductions automatiques Shopify (*Remises* : « Pack Tisa'nours · … »), appliquées aux variantes « 1 sachet » des trois infusions. Si un palier change, modifier à la fois la réduction et le bloc « Palier de réduction » de la section.
- Chaque produit du pack est un bloc « Produit » : « Compte pour la réduction » le range dans l'onglet des infusions, « Choix de la variante » affiche une liste (coloris de la gourde).

