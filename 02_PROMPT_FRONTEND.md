# SOUS-PROMPT 2 — FRONTEND (Next.js)
## À utiliser après le prompt maître

---

```
Développe le FRONTEND de AgriConnect IA avec Next.js 14 (App Router),
TypeScript et TailwindCSS.

## PAGES À CRÉER

### 1. Page d'accueil (`/`)
- Hero section avec le message clé : "Un expert agricole dans votre poche"
- 4 grandes cartes cliquables (icône + texte court, gros boutons tactiles) :
  "Diagnostiquer ma plante" / "Parler à l'assistant" / "Prix du marché" / "Météo & alertes"
- Design mobile-first, contraste élevé, police lisible même en plein soleil
  (sur écran de téléphone bas de gamme)
- Sélecteur de langue (FR par défaut, prévoir structure i18n même si une
  seule langue est implémentée au MVP — pour la roadmap langues locales)

### 2. Page Diagnostic (`/diagnostic`)
- Zone d'upload photo (drag&drop sur desktop, accès caméra direct sur mobile
  via `<input type="file" accept="image/*" capture="environment">`)
- Aperçu de l'image avant envoi
- Bouton "Analyser" avec état de chargement explicite (spinner + texte
  "Analyse en cours, cela peut prendre quelques secondes...")
- Affichage du résultat :
  - Nom de la maladie détectée (ou "Plante saine")
  - Niveau de confiance en %, avec code couleur (vert >80%, orange 50-80%,
    rouge <50% avec message "Résultat incertain, montrez la photo à un
    agent agricole si possible")
  - Recommandations de traitement (liste à puces, langage simple)
  - Si le backend renvoie un avis du modèle de fallback (second avis),
    l'afficher clairement comme "Avis complémentaire" distinct du
    diagnostic principal
- Gestion d'erreur réseau explicite (message clair si le backend est
  inaccessible, pas de page blanche)

### 3. Page Chat Assistant (`/assistant`)
- Interface de chat classique (bulles utilisateur/assistant)
- Bouton micro pour dictée vocale (Web Speech API côté navigateur,
  fallback texte si non supporté)
- Synthèse vocale optionnelle pour lire la réponse de l'assistant à voix
  haute (utile pour utilisateurs peu à l'aise avec la lecture)
- Indicateur "L'assistant réfléchit..." pendant la génération de réponse
  (le NLP local Ollama peut être plus lent qu'une API cloud)
- Historique de conversation conservé en state local (pas besoin de
  persistance serveur au MVP)

### 4. Page Prix du Marché (`/prix`)
- Sélecteur de région (liste déroulante : Abidjan, San-Pédro, Yamoussoukro,
  Daloa, Bouaké)
- Sélecteur de culture (cacao, café, anacarde, banane plantain, manioc)
- Affichage du prix actuel en FCFA/kg
- Mini-graphique de tendance sur 30 jours (utiliser `recharts`)
- Badge de recommandation ("Bon moment pour vendre" / "Attendre" / "Stable")

### 5. Page Météo & Alertes (`/meteo`)
- Sélecteur de région
- Prévisions 7 jours sous forme de cartes (température, précipitations,
  humidité)
- Alerte agronomique mise en avant visuellement (bandeau coloré rouge/
  orange/vert selon le niveau de risque)

## EXIGENCES TECHNIQUES
- TypeScript strict, types explicites pour toutes les réponses API
  (définir les interfaces dans `types/api.ts`)
- Composants réutilisables : `Button`, `Card`, `LoadingSpinner`,
  `ConfidenceBadge`, `AlertBanner`
- Appels API centralisés dans `lib/api.ts` avec gestion d'erreur uniforme
  et timeout configuré (ex: 30s, car l'inférence IA peut être lente sur
  un serveur local modeste)
- Responsive mobile-first absolu (95% des utilisateurs cibles sont sur
  mobile en zone rurale)
- Pas de dépendance à des CDN externes non essentiels (réduire les points
  de défaillance en cas de connexion faible)
- Variables d'environnement : `NEXT_PUBLIC_API_URL` pour l'URL du backend

## LIVRABLE
Fournis l'arborescence complète du projet, le code de chaque fichier
(layout, pages, composants, types, lib/api.ts), le fichier
`tailwind.config.ts`, et un `.env.example`. Donne aussi les commandes
pour créer le projet et le lancer en local.
```
