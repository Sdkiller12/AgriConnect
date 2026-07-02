"""
AgriConnect IA — Fusion des datasets par culture
====================================================
Construit, à partir des 7 datasets bruts téléchargés et du rapport
produit par `inspect_datasets.py`, une arborescence finale séparée PAR
CULTURE (un modèle entraîné par culture, conformément au choix retenu) :

    data_par_culture/
        cacao/
            train/<classe>/   val/<classe>/   test/<classe>/
        cafe/
            train/<classe>/   val/<classe>/   test/<classe>/
        anacarde/
            train/<classe>/   val/<classe>/   test/<classe>/
        manioc/
            train/<classe>/   val/<classe>/   test/<classe>/

Cette arborescence est directement compatible avec `vision_training.py`
(format ImageFolder attendu par `PlantDiseaseDataset`) — il suffit de
changer `config.data_dir` vers `data_par_culture/<culture>/` pour
entraîner un modèle par culture.

CORRESPONDANCE DATASETS -> CULTURES :
    cacao_diseases.zip                          -> cacao
    Coffee leaf diseases.zip                     -> cafe
    Robusta Coffee Leaf Images Dataset.zip       -> cafe
    cassava-leaf-disease-classification.zip      -> manioc (via CSV labels)
    PlantDoc-Dataset-master.zip                  -> multi-cultures (filtré)
    dataset.zip (Amini Cocoa Contamination)      -> EXCLU (format YOLO détection objet)
    Dataset for Crop Pest and Disease Detection  -> cashew->anacarde,
                                                     cassava->manioc
                                                     (maize/tomato exclus)

Usage :
    python merge_datasets.py --root ./dataset --output ./data_par_culture

Prérequis :
    pip install pandas pillow scikit-learn --break-system-packages
"""

import os
import json
import shutil
import argparse
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}

# ---------------------------------------------------------------------------
# CONFIGURATION — chemins réels vérifiés après inspection
# ---------------------------------------------------------------------------

# Datasets ImageFolder simples : 1 dataset = 1 culture
SIMPLE_DATASETS = [
    {
        "name": "cacao_diseases",
        "culture": "cacao",
        # L'inspection a détecté la racine ImageFolder dans cacao_photos/
        "root_subpath": "cacao_diseases/cacao_photos",
    },
    {
        "name": "Coffee leaf diseases",
        "culture": "cafe",
        "root_subpath": "Coffee leaf diseases",
    },
    {
        # Le dossier a un \n à la fin — on le gère via glob pour être robuste
        "name": "Robusta Coffee Leaf Images Dataset",
        "culture": "cafe",
        "root_subpath": None,  # cherché dynamiquement (voir find_robusta_dir)
    },
]

# Dataset Crop Pest & Disease Detection :
# Structure réelle : CCMT Dataset-Augmented/<Culture>/<split_set>/<classe>/
#                    Raw Data/CCMT Dataset/<Culture>/<classe>/
# On utilise UNIQUEMENT Raw Data (non-augmenté) pour éviter le double compte.
CROP_PEST_ROOT = "Dataset for Crop Pest and Disease Detection"
CROP_PEST_RAW_SUBPATH = "Raw Data/CCMT Dataset"
# Cultures à GARDER et leur mapping vers notre nomenclature
CROP_PEST_CULTURE_MAP = {
    "cassava": "manioc",
    "cashew": "anacarde",
}
# Cultures à EXCLURE explicitement
CROP_PEST_EXCLUDE = {"maize", "tomato"}

# Dataset Cassava Kaggle : CSV + images en vrac sous train_images/
CASSAVA_CSV_SUBPATH = "cassava-leaf-disease-classification"
CASSAVA_LABEL_MAP = {
    "0": "bacterial_blight",
    "1": "brown_streak_disease",
    "2": "green_mottle",
    "3": "mosaic_disease",
    "4": "healthy",
}

SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
RANDOM_SEED = 42

# Mots-clés pour filtrer PlantDoc (multi-cultures génériques)
CULTURE_KEYWORDS = {
    "cacao":   ["cacao", "cocoa"],
    "cafe":    ["coffee", "cafe", "café"],
    "anacarde":["cashew", "anacarde"],
    "manioc":  ["cassava", "manioc"],
}
EXCLUDED_KEYWORDS = ["maize", "corn", "tomato", "tomate", "potato", "pepper",
                     "squash", "peach", "raspberry", "blueberry", "cherry",
                     "apple", "strawberry", "grape", "soyabean"]


# ---------------------------------------------------------------------------
# UTILITAIRES
# ---------------------------------------------------------------------------

def normalize_class_name(name: str) -> str:
    return name.strip().lower().replace(" ", "_").replace("-", "_")


def list_images(directory: Path) -> list:
    return [p for p in directory.rglob("*")
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]


def split_and_copy(images: list, dest_root: Path, culture: str,
                   class_name: str, source_tag: str = "") -> int:
    """Split 70/15/15 et copie dans data_par_culture/<culture>/<split>/<classe>/."""
    if len(images) < 3:
        print(f"  ⚠️  Trop peu d'images ({len(images)}) pour {culture}/{class_name} — ignoré.")
        return 0

    train_imgs, temp_imgs = train_test_split(
        images, train_size=SPLIT_RATIOS["train"], random_state=RANDOM_SEED
    )
    val_ratio = SPLIT_RATIOS["val"] / (SPLIT_RATIOS["val"] + SPLIT_RATIOS["test"])
    val_imgs, test_imgs = train_test_split(
        temp_imgs, train_size=val_ratio, random_state=RANDOM_SEED
    )

    for split_name, split_imgs in [("train", train_imgs), ("val", val_imgs), ("test", test_imgs)]:
        dest_dir = dest_root / culture / split_name / class_name
        dest_dir.mkdir(parents=True, exist_ok=True)
        for img_path in split_imgs:
            # Préfixe source pour éviter collisions de noms entre datasets
            prefix = f"{source_tag}_" if source_tag else f"{img_path.parent.name}_"
            dest_name = prefix + img_path.name
            shutil.copy2(img_path, dest_dir / dest_name)

    return len(images)


# ---------------------------------------------------------------------------
# TRAITEMENT 1 — Datasets ImageFolder simples (1 dataset = 1 culture)
# ---------------------------------------------------------------------------

def find_robusta_dir(root: Path) -> Path | None:
    """Gère le \n à la fin du nom de dossier Robusta Coffee."""
    for d in root.iterdir():
        if d.is_dir() and "Robusta Coffee" in d.name:
            return d
    return None


def process_simple_imagefolder(dataset_dir: Path, culture: str,
                                dest_root: Path, stats: dict, tag: str):
    """
    Traite un ImageFolder dont toutes les classes → même culture.
    Remonte tous les dossiers contenant des images, ignore les splits
    existants (on re-split nous-mêmes).
    """
    likely_splits = {"train", "test", "val", "valid", "validation",
                     "train_set", "test_set"}
    class_to_images: dict[str, list] = {}

    for d in sorted(dataset_dir.rglob("*")):
        if not d.is_dir():
            continue
        if d.name.lower() in likely_splits:
            continue
        images_here = [p for p in d.iterdir()
                       if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]
        if images_here:
            cname = normalize_class_name(d.name)
            class_to_images.setdefault(cname, []).extend(images_here)

    if not class_to_images:
        print(f"  ⚠️  Aucune classe trouvée dans {dataset_dir}")
        return

    for class_name, images in class_to_images.items():
        n = split_and_copy(images, dest_root, culture, class_name, source_tag=tag)
        stats.setdefault(culture, {}).setdefault(class_name, 0)
        stats[culture][class_name] += n
        print(f"     {class_name} : {n} images")


# ---------------------------------------------------------------------------
# TRAITEMENT 2 — Crop Pest & Disease Detection (Cashew + Cassava uniquement)
# ---------------------------------------------------------------------------

def process_crop_pest(root: Path, dest_root: Path, stats: dict):
    """
    Structure : Raw Data/CCMT Dataset/<Culture>/<classe>/
    On ne prend que Cassava→manioc et Cashew→anacarde.
    """
    raw_root = root / CROP_PEST_ROOT / CROP_PEST_RAW_SUBPATH
    if not raw_root.exists():
        print(f"  ⚠️  Introuvable : {raw_root}")
        return

    for culture_dir in sorted(raw_root.iterdir()):
        if not culture_dir.is_dir():
            continue
        culture_lower = culture_dir.name.lower()
        if culture_lower in CROP_PEST_EXCLUDE:
            print(f"  ⏭️  Exclu (hors périmètre) : {culture_dir.name}")
            continue
        if culture_lower not in CROP_PEST_CULTURE_MAP:
            print(f"  ⏭️  Non reconnu, ignoré : {culture_dir.name}")
            continue

        target_culture = CROP_PEST_CULTURE_MAP[culture_lower]
        print(f"\n  {culture_dir.name} → culture '{target_culture}'")

        for class_dir in sorted(culture_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            images = list_images(class_dir)
            if not images:
                continue
            cname = normalize_class_name(class_dir.name)
            n = split_and_copy(images, dest_root, target_culture, cname,
                               source_tag=f"ccmt_{culture_lower}")
            stats.setdefault(target_culture, {}).setdefault(cname, 0)
            stats[target_culture][cname] += n
            print(f"     {cname} : {n} images")


# ---------------------------------------------------------------------------
# TRAITEMENT 3 — Cassava Kaggle (CSV labels numériques)
# ---------------------------------------------------------------------------

def process_cassava_csv(root: Path, dest_root: Path, stats: dict):
    """
    cassava-leaf-disease-classification :
      train.csv  → image_id (filename), label (0-4)
      train_images/ → fichiers .jpg en vrac
    """
    dataset_dir = root / CASSAVA_CSV_SUBPATH
    csv_path = dataset_dir / "train.csv"
    images_dir = dataset_dir / "train_images"

    if not csv_path.exists():
        print(f"  ⚠️  CSV introuvable : {csv_path}")
        return
    if not images_dir.exists():
        print(f"  ⚠️  Dossier images introuvable : {images_dir}")
        return

    df = pd.read_csv(csv_path)
    class_to_images: dict[str, list] = {}

    for _, row in df.iterrows():
        image_id = str(row["image_id"])
        label_str = str(int(row["label"]))
        class_name = CASSAVA_LABEL_MAP.get(label_str, f"label_{label_str}")

        img_path = images_dir / image_id
        if not img_path.exists():
            # Essai sans extension
            img_path = images_dir / image_id.replace(".jpg", "")
            if not img_path.exists():
                continue

        class_to_images.setdefault(class_name, []).append(img_path)

    if not class_to_images:
        print("  ⚠️  Aucune image associée trouvée pour Cassava CSV.")
        return

    culture = "manioc"
    for class_name, images in class_to_images.items():
        n = split_and_copy(images, dest_root, culture, class_name,
                           source_tag="cassava_kaggle")
        stats.setdefault(culture, {}).setdefault(class_name, 0)
        stats[culture][class_name] += n
        print(f"     {class_name} : {n} images")


# ---------------------------------------------------------------------------
# TRAITEMENT 4 — PlantDoc (multi-cultures génériques, filtré par mots-clés)
# ---------------------------------------------------------------------------

def process_plantdoc(root: Path, dest_root: Path, stats: dict):
    """
    PlantDoc-Dataset-master/train/<classe>/ et /test/<classe>/
    On ne garde que les classes dont le nom contient un mot-clé de
    nos cultures cibles, on exclut explicitement les autres.
    """
    dataset_dir = root / "PlantDoc-Dataset-master"
    if not dataset_dir.exists():
        print(f"  ⚠️  Introuvable : {dataset_dir}")
        return

    likely_splits = {"train", "test", "val", "valid"}

    for split_dir in dataset_dir.iterdir():
        if not split_dir.is_dir() or split_dir.name.lower() not in likely_splits:
            continue
        for class_dir in sorted(split_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            cname_lower = class_dir.name.lower()

            # Vérif exclusion explicite
            if any(excl in cname_lower for excl in EXCLUDED_KEYWORDS):
                continue

            # Cherche un match de culture
            matched_culture = None
            for culture, keywords in CULTURE_KEYWORDS.items():
                if any(kw in cname_lower for kw in keywords):
                    matched_culture = culture
                    break
            if matched_culture is None:
                continue

            images = list_images(class_dir)
            if not images:
                continue

            cname = normalize_class_name(class_dir.name)
            n = split_and_copy(images, dest_root, matched_culture, cname,
                               source_tag="plantdoc")
            stats.setdefault(matched_culture, {}).setdefault(cname, 0)
            stats[matched_culture][cname] += n
            print(f"     {matched_culture}/{cname} : {n} images")


# ---------------------------------------------------------------------------
# POINT D'ENTRÉE
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Fusionne les datasets bruts en arborescence par culture."
    )
    parser.add_argument("--root", type=str, default="./dataset",
                        help="Dossier racine contenant les 7 datasets extraits")
    parser.add_argument("--output", type=str, default="./data_par_culture",
                        help="Dossier de sortie pour les données fusionnées par culture")
    args = parser.parse_args()

    root = Path(args.root)
    dest_root = Path(args.output)
    stats: dict = {}

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("ÉTAPE 1 — Datasets ImageFolder simples (1 dataset = 1 culture)")
    print("=" * 70)
    for ds in SIMPLE_DATASETS:
        if ds["root_subpath"]:
            dataset_dir = root / ds["root_subpath"]
        elif "Robusta" in ds["name"]:
            dataset_dir = find_robusta_dir(root)
        else:
            dataset_dir = root / ds["name"]

        if dataset_dir is None or not dataset_dir.exists():
            print(f"\n⚠️  Introuvable, ignoré : {ds['name']}")
            continue

        print(f"\n--- {ds['name']} → culture '{ds['culture']}' ---")
        process_simple_imagefolder(dataset_dir, ds["culture"], dest_root,
                                   stats, tag=normalize_class_name(ds["name"])[:12])

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("ÉTAPE 2 — Crop Pest & Disease Detection (Cashew + Cassava seulement)")
    print("=" * 70)
    print("(Raw Data uniquement pour éviter double compte avec version augmentée)")
    process_crop_pest(root, dest_root, stats)

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("ÉTAPE 3 — Cassava Kaggle (CSV labels numériques → manioc)")
    print("=" * 70)
    process_cassava_csv(root, dest_root, stats)

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("ÉTAPE 4 — PlantDoc (filtré par mots-clés cultures cibles)")
    print("=" * 70)
    process_plantdoc(root, dest_root, stats)

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("ÉTAPE 5 — Amini Cocoa Contamination (dataset/dataset)")
    print("=" * 70)
    print("⛔ EXCLU : structure YOLO détectée (labels/ + images/) — format détection")
    print("   d'objet incompatible avec le pipeline de classification de")
    print("   vision_training.py. À traiter séparément avec YOLO si souhaité.")

    # ------------------------------------------------------------------ #
    print("\n" + "=" * 70)
    print("RÉSUMÉ FINAL")
    print("=" * 70)

    total = 0
    for culture, classes in stats.items():
        culture_total = sum(classes.values())
        total += culture_total
        print(f"\n  📁 {culture.upper()} — {culture_total} images")
        for cname, n in sorted(classes.items(), key=lambda x: -x[1]):
            flag = "⚠️ " if n < 100 else "  "
            print(f"     {flag}{cname}: {n}")

    print(f"\n  TOTAL toutes cultures : {total} images")

    summary_path = Path("./merge_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Résumé sauvegardé dans {summary_path}")
    print(f"✅ Données fusionnées disponibles dans {dest_root}/<culture>/train|val|test/<classe>/")
    print(
        "\nProchaine étape : lancer vision_training.py avec --culture <nom> "
        "pour entraîner un modèle par culture."
    )


if __name__ == "__main__":
    main()
