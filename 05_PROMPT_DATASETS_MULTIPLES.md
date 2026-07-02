# SOUS-PROMPT 5 — ANALYSE, FUSION ET ENTRAÎNEMENT MULTI-DATASETS
## À utiliser pour exploiter les 7 datasets téléchargés (cacao, café, anacarde, manioc, etc.)

---

## Contexte : tes 7 datasets téléchargés

| Fichier | Taille | Culture(s) probable(s) | Format probable |
|---|---|---|---|
| `cacao_diseases.zip` | 1.1 GB | Cacao | ImageFolder (dossiers = classes) |
| `cassava-leaf-disease-classification.zip` | 6.2 GB | Manioc | ImageFolder (souvent avec CSV Kaggle) |
| `Coffee leaf diseases.zip` | 406 MB | Café | ImageFolder |
| `dataset.zip` (Amini Cocoa Contamination) | 10.1 GB | Cacao | **CSV de labels séparé** (`Train.csv`, `Test.csv`) + images en vrac sous `images/train`, `images/test` — structure NON ImageFolder |
| `Dataset for Crop Pest and Disease Detection.zip` | 8.4 GB | Anacarde (cashew) + Manioc (cassava) + Maïs + Tomate | ImageFolder multi-cultures, 22 classes — **on retient uniquement cashew et cassava, le reste est hors périmètre** |
| `PlantDoc-Dataset-master.zip` | 984 MB | Multi-cultures génériques | ImageFolder multi-cultures — filtrage par mots-clés nécessaire |
| `Robusta Coffee Leaf Images Dataset.zip` | 406 MB | Café | ImageFolder |

**Décision déjà prise** : un modèle entraîné **séparément par culture** (pas un modèle unique toutes-cultures-confondues). Pour le dataset "Crop Pest and Disease Detection", on utilise les **images brutes** (24,881 images), pas la version pré-augmentée, car le pipeline d'augmentation est déjà géré par `vision_training.py`.

---

## ÉTAPE 1 — Inspection automatique (à exécuter en premier, sans prompt IA)

Utilise le script **`inspect_datasets.py`** fourni séparément :

```bash
# Place tous les dossiers dézippés sous ./dataset/ à la racine du projet, puis :
pip install pandas --break-system-packages
python inspect_datasets.py --root ./dataset
```

Ce script produit `inspection_report.json` qui te dira, pour chaque dataset :
- s'il suit une structure ImageFolder classique (et où exactement, même
  s'il y a un niveau de dossier intermédiaire type `images/train/`)
- si un CSV de labels est détecté, et surtout **s'il s'agit de
  classification simple ou de bounding boxes** (cas du `dataset.zip` /
  Amini Cocoa — le tag "Object Detection" vu sur la page Kaggle suggère
  fortement des bounding boxes, à confirmer avec ce rapport avant
  d'aller plus loin)

**Action attendue de toi** : lis `inspection_report.json`, en particulier
le diagnostic du `Train.csv` d'Amini Cocoa. Si le diagnostic confirme
"bounding_boxes", ce dataset nécessite un pipeline de détection d'objet
différent (YOLO, Detectron2) — il ne sera PAS intégré au pipeline de
classification simple de `vision_training.py`. Dans ce cas, exclus-le de
l'étape de fusion ci-dessous, ou demande un prompt séparé pour un
pipeline de détection d'objet si tu veux quand même l'exploiter.

---

## ÉTAPE 2 — Fusion par culture (à exécuter, ajuster si besoin)

Utilise le script **`merge_datasets.py`** fourni séparément :

```bash
pip install scikit-learn pillow --break-system-packages
python merge_datasets.py --root ./dataset --output ./data_par_culture
```

Ce script :
- fusionne `cacao_diseases`, `Coffee leaf diseases`, `Robusta Coffee Leaf
  Images Dataset`, `cassava-leaf-disease-classification` (1 dataset = 1
  culture, fusion directe)
- filtre `Dataset for Crop Pest and Disease Detection` et `PlantDoc` pour
  n'en extraire que les classes cashew (→ anacarde) et cassava
  (→ manioc), en excluant explicitement maize/tomato
- re-split tout en train/val/test (70/15/15) de façon cohérente entre
  toutes les sources fusionnées
- produit `merge_summary.json` listant le nombre d'images par
  culture/classe — **vérifie ce fichier pour repérer un déséquilibre
  fort entre classes avant l'entraînement**

**Si les noms réels de dossiers après extraction de tes .zip diffèrent**
des noms attendus dans `IMAGEFOLDER_DATASET_CONFIG` (dictionnaire en
haut du script `merge_datasets.py`), demande-moi (ou à l'IDE) d'ajuster
ce dictionnaire avec les noms exacts de tes dossiers.

---

## ÉTAPE 3 — Prompt pour l'IDE (Cursor/Windsurf)

Une fois l'inspection et la fusion validées, utilise ce prompt pour
adapter l'entraînement à CHAQUE culture séparément :

```
Le script vision_training.py (déjà fourni) entraîne un modèle de
classification d'images de maladies de plantes. J'ai maintenant 4 jeux
de données distincts, un par culture, situés sous :

    data_par_culture/cacao/train|val|test/<classe>/
    data_par_culture/cafe/train|val|test/<classe>/
    data_par_culture/anacarde/train|val|test/<classe>/
    data_par_culture/manioc/train|val|test/<classe>/

Les classes réelles par culture sont listées dans merge_summary.json
(je te le colle ci-dessous / je te donne son contenu).

Modifie vision_training.py pour qu'il puisse être lancé indépendamment
pour chaque culture, avec :

1. Un paramètre en ligne de commande --culture (cacao, cafe, anacarde,
   ou manioc) qui détermine automatiquement :
   - config.data_dir = f"./data_par_culture/{culture}"
   - config.target_classes = liste des classes réelles de cette culture
     (à lire dynamiquement depuis le dossier data_par_culture/<culture>/train/,
     pas en dur dans le code, car les classes diffèrent par culture et
     viennent de plusieurs sources fusionnées)
   - config.output_dir = f"./models/agriconnect-vision-{culture}-v1"

2. Garde la classe "sain"/"healthy" obligatoire pour chaque culture —
   si elle n'existe pas dans les données fusionnées pour une culture
   donnée, affiche un avertissement clair car cela dégradera la
   fiabilité du modèle (trop de faux positifs sans exemples négatifs).

3. Adapte check_dataset_balance() pour qu'il s'exécute automatiquement
   avant l'entraînement et BLOQUE l'entraînement (avec message
   explicite, pas juste un warning) si une classe a moins de 20 images
   au total (seuil insuffisant pour un fine-tuning fiable même avec
   augmentation de données).

4. Ajoute une fonction train_all_cultures() qui boucle sur les 4
   cultures et entraîne 4 modèles séquentiellement, avec un résumé final
   comparatif (accuracy/f1 par culture) pour identifier rapidement quelle
   culture a besoin de plus de données.

Fournis le code complet modifié de vision_training.py (pas seulement un
diff), plus la commande pour lancer l'entraînement sur une seule culture
et sur toutes les cultures.
```

---

## Récapitulatif du workflow complet

```
dataset/ (7 zips extraits)
    │
    ▼
inspect_datasets.py  →  inspection_report.json (diagnostic structure + CSV)
    │
    ▼  (vérifier manuellement le diagnostic du Train.csv Amini Cocoa)
    │
merge_datasets.py    →  data_par_culture/{cacao,cafe,anacarde,manioc}/
    │                    + merge_summary.json (comptage par classe)
    ▼
vision_training.py --culture cacao   →  models/agriconnect-vision-cacao-v1/
vision_training.py --culture cafe    →  models/agriconnect-vision-cafe-v1/
vision_training.py --culture anacarde → models/agriconnect-vision-anacarde-v1/
vision_training.py --culture manioc  →  models/agriconnect-vision-manioc-v1/
```
