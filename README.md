# Dés de bataille

Lanceur de dés pour les combats du Risk, dans une ambiance Premier Empire.
Le téléphone se pose à plat entre les deux joueurs : l'attaquant (rouge) en haut, le défenseur (bleu) en bas.

## Règles appliquées
- Attaquant : 1, 2 ou 3 dés. Défenseur : 1 ou 2 dés.
- Chaque camp trie ses dés du plus fort au plus faible. On compare le plus fort contre le plus fort (duel I), puis le deuxième contre le deuxième (duel II).
- Le plus haut gagne. **En cas d'égalité, le défenseur gagne.**
- Chaque duel perdu fait perdre une armée au camp perdant.

## Cartes des personnages
- Chaque camp a 4 cartes : Murat, un grenadier anglais, un lancier rouge et le général Moore pour l'attaquant ; Napoléon, Ney, un grognard et un hussard pour le défenseur.
- Une nouvelle carte est tirée à chaque combat. Le personnage passe en pose d'attaque et pousse son cri de guerre quand son joueur appuie sur « Prêt ».
- Les cris (`assets/cries/<id>.mp3`) ont été générés avec Higgsfield (voix ElevenLabs v4), puis raccourcis et mis au même volume. Les originaux sont dans `sources/cris-originaux/`.
- La pastille rouge affiche les pertes du camp à la fin du combat.
- Les illustrations ont été générées avec Higgsfield (modèle GPT Image 2.5). Les originaux en haute définition (PNG) sont dans `sources/cartes-originales/` ; l'appli utilise des versions WebP allégées dans `assets/cards/`.
- Pour ajouter une carte : mettre `<id>-passive.webp` et `<id>-aggressive.webp` (480 px de large) dans `assets/cards/` et `<id>.mp3` dans `assets/cries/`, puis ajouter l'id et le nom dans `CARDS` en haut de [app.js](app.js) et dans [sw.js](sw.js).

Le bandeau central affiche une carte du monde ancienne, purement décorative ([assets/map.webp](assets/map.webp)), générée elle aussi avec Higgsfield. L'original est dans `sources/carte-du-monde/`.

## Dés honnêtes
- Le tirage utilise `crypto.getRandomValues` (générateur cryptographique du téléphone), avec un rejet des valeurs qui créeraient un biais : chaque face a exactement 1 chance sur 6.
- Les valeurs sont tirées **avant** l'animation, qui se contente de faire atterrir les dés sur ces faces.
- Toute la logique tient dans [rules.js](rules.js) (une quarantaine de lignes) et est testée, dont un test sur 1 million de lancers.

## Tester sur l'ordinateur
Il faut [Node.js](https://nodejs.org) :
```bash
npm start
```
puis ouvrir http://localhost:5173 (en mode « téléphone » des outils de développement du navigateur).

```bash
npm test
```

## Mettre en ligne sur GitHub Pages
1. Créer un dépôt public sur github.com (par exemple `des-de-bataille`).
2. Y envoyer tous les fichiers de ce dossier (`git push`, ou « Add file → Upload files » sur le site).
3. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Une minute plus tard, l'appli est disponible à l'adresse `https://<ton-pseudo>.github.io/des-de-bataille/`.

## Installer sur le téléphone
- **Android (Chrome)** : ouvrir l'adresse, menu ⋮ → « Ajouter à l'écran d'accueil » (ou « Installer l'application »).
- **iPhone (Safari)** : ouvrir l'adresse, bouton Partager → « Sur l'écran d'accueil ».

Une fois ouverte une première fois, l'appli fonctionne aussi sans réseau.

## Mettre à jour
Après une modification, augmenter `VERSION` dans [sw.js](sw.js) (`'v1'` → `'v2'`) avant de publier : les téléphones récupéreront alors les nouveaux fichiers.

## Bon à savoir
- Sur iPhone, Safari ne permet pas de faire vibrer le téléphone : seul le son fonctionne.
- Le son se déclenche au premier appui sur « Prêt » (règle des navigateurs). Pense à désactiver le mode silencieux.
- L'écran reste allumé pendant la partie (si le navigateur le permet).
- Les icônes se régénèrent avec `npm run icons`.
