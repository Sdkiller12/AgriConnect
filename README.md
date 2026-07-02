# AgriConnect IA — Kit de Développement Complet

Ce kit a été préparé à partir de l'analyse du pitch "AgriConnect IA :
L'Expert Agricole au Bout des Doigts" et contient tout ce qu'il faut
pour passer du document de pitch à une implémentation fonctionnelle.

## Contenu

```
agriconnect_ia/
  docs/
    00_ANALYSE.md              <- Analyse du pitch : forces, risques, questions du jury
  prompts/
    01_PROMPT_MAITRE.md         <- Prompt d'architecture globale (à coller en premier dans Cursor/Windsurf)
    02_PROMPT_FRONTEND.md       <- Sous-prompt Next.js (5 pages, composants, API client)
    03_PROMPT_BACKEND.md        <- Sous-prompt FastAPI (routers, services, Docker)
    04_PROMPT_NLP_RAG.md        <- Sous-prompt module NLP (Ollama + RAG + fallback HF)
    05_PROMPT_DATASETS_MULTIPLES.md <- Sous-prompt pour fusionner et entraîner sur tes 7 datasets téléchargés
  scripts/
    vision_training.py          <- Code complet : dataset, fine-tuning, évaluation, fallback Vision IA
    data_engine.py               <- Code complet : prix de marché + météo (Open-Meteo) + alertes
    inspect_datasets.py          <- Inspecte automatiquement la structure de tes datasets téléchargés
    merge_datasets.py            <- Fusionne les 7 datasets en arborescence par culture (ImageFolder)
```

## Ordre d'utilisation recommandé

1. **Lire `docs/00_ANALYSE.md`** pour anticiper les questions du jury et
   ajuster le discours du pitch oral si besoin.

2. **Si tu as téléchargé plusieurs datasets externes** (cacao_diseases,
   cassava-leaf-disease-classification, Coffee leaf diseases, etc.) :
   - Dézippe-les tous sous un dossier `dataset/` à la racine du projet
   - Lance `python inspect_datasets.py --root ./dataset` pour identifier
     automatiquement la structure de chacun (ImageFolder vs CSV de labels,
     classification simple vs bounding boxes)
   - Lance `python merge_datasets.py --root ./dataset --output ./data_par_culture`
     pour fusionner tout en 4 dossiers séparés par culture (cacao, café,
     anacarde, manioc), prêts pour l'entraînement
   - Voir `prompts/05_PROMPT_DATASETS_MULTIPLES.md` pour le détail complet
     de ce workflow et le prompt IDE pour adapter l'entraînement par culture

3. **Lancer `scripts/vision_training.py`** (si tu pars d'un seul dataset
   maison, ou pour lancer l'entraînement après la fusion ci-dessus) :
   - Crée automatiquement l'arborescence `data/train|val|test/<classe>/`
   - Une fois tes images placées (PlantVillage + photos terrain si possible),
     décommente les lignes d'entraînement dans le bloc `__main__`
   - Le modèle de fallback pré-entraîné est utilisable immédiatement, sans
     attendre la fin du fine-tuning — pratique pour avoir une démo qui
     fonctionne dès le premier jour du hackathon

4. **Lancer `scripts/data_engine.py`** pour générer le dataset de prix de
   démo et vérifier la connexion à l'API météo Open-Meteo (gratuite, sans
   clé API nécessaire).

5. **Coller `prompts/01_PROMPT_MAITRE.md`** dans une conversation Cursor
   ou Windsurf pour poser le contexte global du projet.

6. **Donner ensuite, un par un**, les sous-prompts `02`, `03`, `04` selon
   ce que tu développes (frontend, backend, NLP). Chaque sous-prompt est
   autonome et détaillé — tu peux les utiliser dans des conversations
   séparées si tu préfères paralléliser le travail.

## Points d'attention spécifiques à ce projet

- **Le pitch insiste beaucoup sur le "hors-ligne"** : assure-toi que ta
  démo distingue clairement ce qui tourne réellement en local (modèle
  vision, Ollama) de ce qui nécessite une connexion (prix marché, météo,
  fallback HF). Le jury risque de tester ce point en désactivant le wifi.

- **Le dataset Vision IA est le nerf de la guerre** : avec seulement 5
  maladies cibles, privilégie la qualité et l'équilibre des classes
  (incluant une classe "sain" par culture) plutôt que la quantité brute
  d'images. Le script `check_dataset_balance()` t'alerte automatiquement
  en cas de déséquilibre.

- **Les prix de marché sont simulés** dans `data_engine.py` — c'est
  volontaire pour permettre de développer sans attendre une vraie source.
  Avant le pilote (Phase 2), il faudra identifier une source officielle
  réelle (ex: Conseil Café-Cacao, OCPV) pour remplacer cette simulation.

- **Le dataset `dataset.zip` (Amini Cocoa Contamination)** a 25 colonnes
  dans son CSV et porte un tag "Object Detection" sur sa page Kaggle —
  c'est probablement un dataset de bounding boxes, pas de classification
  simple. `inspect_datasets.py` te le confirmera automatiquement. Si
  c'est le cas, ne l'intègre pas dans la fusion de `merge_datasets.py`
  tel quel : la détection d'objet demande un pipeline différent
  (YOLO/Detectron2) de celui utilisé pour la classification dans
  `vision_training.py`.
