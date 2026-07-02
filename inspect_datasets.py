"""
AgriConnect IA — Inspection automatique des datasets bruts
=============================================================
Avant toute fusion/entraînement, ce script explore le dossier dataset/
à la racine du projet et produit un rapport texte décrivant, pour
chaque sous-dataset détecté :
  - le type de structure (ImageFolder classique vs CSV de labels vs
    bounding boxes)
  - les classes/colonnes trouvées
  - le nombre d'images par classe
  - une alerte si la structure n'a pas pu être identifiée automatiquement
    (dans ce cas, le rapport affichera un extrait du CSV pour décision
    manuelle)

Conçu pour fonctionner SANS connaître à l'avance la structure exacte de
chaque dataset téléchargé (Kaggle, Mendeley Data, etc.), car les formats
varient énormément d'une source à l'autre.

Usage :
    python inspect_datasets.py --root ./dataset

Prérequis :
    pip install pandas --break-system-packages
"""

import os
import json
import argparse
from pathlib import Path
from collections import defaultdict

import pandas as pd


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


# ---------------------------------------------------------------------------
# 1. DÉTECTION DU TYPE DE STRUCTURE
# ---------------------------------------------------------------------------

def find_image_files(directory: Path, max_depth: int = 6):
    """Liste récursivement les fichiers image sous `directory`."""
    images = []
    for path in directory.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(path)
    return images


def find_csv_files(directory: Path):
    return list(directory.rglob("*.csv"))


def has_images_directly_inside(directory: Path) -> bool:
    """Vrai si `directory` contient des fichiers image directement (pas dans un sous-dossier)."""
    return any(
        p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        for p in directory.iterdir()
    )


def find_candidate_roots(directory: Path, max_depth: int = 3):
    """
    Retourne une liste de dossiers candidats à tester pour une structure
    ImageFolder : le dossier racine lui-même, plus ses sous-dossiers
    jusqu'à max_depth (utile quand la structure réelle est
    dataset_dir/images/train/<classe> au lieu de dataset_dir/train/<classe>).
    """
    candidates = [directory]
    current_level = [directory]
    for _ in range(max_depth):
        next_level = []
        for d in current_level:
            for sub in d.iterdir():
                if sub.is_dir():
                    next_level.append(sub)
                    candidates.append(sub)
        current_level = next_level
    return candidates


def detect_imagefolder_structure(directory: Path):
    """
    Détecte une structure ImageFolder classique, en testant le dossier
    racine ET ses sous-dossiers proches (cas dataset/images/train/<classe>) :
        <racine_candidate>/<split>/<classe>/*.jpg  OU  <racine_candidate>/<classe>/*.jpg

    Une structure n'est retenue comme "classe" que si le dossier contient
    des images DIRECTEMENT (pas seulement des sous-dossiers) — ça évite
    les faux positifs du type dataset/images/train/ qui contient des
    images en vrac sans sous-dossier de classe (cas typique d'un dataset
    avec labels en CSV séparé, ex: Amini Cocoa Contamination Dataset).

    Retourne (dict {split: {classe: nb_images}}, chemin_racine_detecte) si
    détecté, sinon (None, None).
    """
    likely_splits = {"train", "test", "val", "valid", "validation"}

    for candidate_root in find_candidate_roots(directory):
        result = defaultdict(lambda: defaultdict(int))
        found_any = False

        direct_subdirs = [d for d in candidate_root.iterdir() if d.is_dir()]
        has_split_dirs = any(d.name.lower() in likely_splits for d in direct_subdirs)

        if has_split_dirs:
            for split_dir in direct_subdirs:
                if split_dir.name.lower() not in likely_splits:
                    continue

                # Si le dossier split contient des images en vrac (pas de
                # sous-dossier de classe), ce n'est PAS un ImageFolder valide.
                if has_images_directly_inside(split_dir):
                    continue

                for class_dir in split_dir.iterdir():
                    if not class_dir.is_dir():
                        continue
                    n_images = len(find_image_files(class_dir))
                    if n_images > 0:
                        result[split_dir.name][class_dir.name] = n_images
                        found_any = True
        else:
            for class_dir in direct_subdirs:
                if has_images_directly_inside(candidate_root):
                    # Le dossier candidat lui-même a des images en vrac à
                    # côté de sous-dossiers -> structure ambiguë, on saute.
                    continue
                n_images = len(find_image_files(class_dir))
                if n_images > 0:
                    result["all"][class_dir.name] = n_images
                    found_any = True

        # On ne retient que les structures avec au moins 2 classes
        # distinctes (sinon trop probable que ce soit un faux positif
        # type "images/train" comptabilisé comme une seule pseudo-classe)
        total_classes = sum(len(v) for v in result.values())
        if found_any and total_classes >= 2:
            return dict(result), str(candidate_root)

    return None, None


def detect_csv_label_structure(csv_path: Path):
    """
    Inspecte un fichier CSV de labels pour déterminer s'il s'agit de :
    - classification simple (une colonne = ID image, une colonne = classe)
    - bounding boxes / détection d'objet (colonnes type xmin,ymin,xmax,ymax
      ou x,y,width,height, souvent répétées par classe -> beaucoup de colonnes)
    - multi-label one-hot (plusieurs colonnes binaires, une par classe)

    Retourne un dict avec le diagnostic + un extrait des données.
    """
    try:
        df = pd.read_csv(csv_path, nrows=200)
    except Exception as e:
        return {"error": f"Impossible de lire {csv_path.name} : {e}"}

    columns = list(df.columns)
    n_columns = len(columns)
    lower_cols = [c.lower() for c in columns]

    bbox_keywords = {"xmin", "ymin", "xmax", "ymax", "x", "y", "width", "height", "bbox"}
    has_bbox_cols = any(any(kw in col for kw in bbox_keywords) for col in lower_cols)

    # Multi-label one-hot : beaucoup de colonnes, valeurs majoritairement 0/1
    numeric_cols = df.select_dtypes(include=["number"]).columns
    binary_like_cols = []
    for col in numeric_cols:
        unique_vals = set(df[col].dropna().unique())
        if unique_vals.issubset({0, 1, 0.0, 1.0}):
            binary_like_cols.append(col)

    diagnosis = "indeterminé"
    if has_bbox_cols:
        diagnosis = "bounding_boxes (détection d'objet probable)"
    elif n_columns >= 5 and len(binary_like_cols) >= max(3, n_columns - 2):
        diagnosis = f"multi-label one-hot ({len(binary_like_cols)} colonnes binaires détectées)"
    elif n_columns <= 4:
        diagnosis = "classification_simple (peu de colonnes, probablement id + label)"

    return {
        "fichier": str(csv_path),
        "n_lignes_echantillon": len(df),
        "colonnes": columns,
        "n_colonnes": n_columns,
        "colonnes_binaires_detectees": binary_like_cols,
        "diagnostic": diagnosis,
        "extrait": df.head(3).to_dict(orient="records"),
    }


# ---------------------------------------------------------------------------
# 2. INSPECTION D'UN DATASET (dossier racine d'un des 7 zips extraits)
# ---------------------------------------------------------------------------

def inspect_single_dataset(dataset_dir: Path):
    report = {"nom": dataset_dir.name, "chemin": str(dataset_dir)}

    # Taille totale et nombre d'images
    all_images = find_image_files(dataset_dir)
    report["nb_images_total"] = len(all_images)

    # Structure ImageFolder ?
    imagefolder_result, detected_root = detect_imagefolder_structure(dataset_dir)
    if imagefolder_result:
        report["type_structure"] = "ImageFolder"
        report["racine_detectee"] = detected_root
        report["classes_detectees"] = imagefolder_result
    else:
        report["type_structure"] = "non-ImageFolder (probable CSV de labels)"

    # CSV présents ?
    csv_files = find_csv_files(dataset_dir)
    if csv_files:
        report["fichiers_csv"] = []
        for csv_path in csv_files:
            # Ignorer les CSV de soumission (pas des labels d'entraînement)
            if "submission" in csv_path.name.lower():
                report["fichiers_csv"].append({
                    "fichier": str(csv_path),
                    "diagnostic": "ignoré (fichier de soumission, pas un label d'entraînement)",
                })
                continue
            report["fichiers_csv"].append(detect_csv_label_structure(csv_path))

    # Alerte si rien n'a pu être déterminé
    if not imagefolder_result and not csv_files:
        report["alerte"] = (
            "Aucune structure ImageFolder ni CSV détectée. Inspection manuelle "
            "nécessaire — vérifier s'il y a un format JSON/XML (ex: annotations "
            "COCO ou Pascal VOC) non couvert par ce script."
        )

    return report


# ---------------------------------------------------------------------------
# 3. INSPECTION GLOBALE DE dataset/
# ---------------------------------------------------------------------------

def inspect_all(root_dir: str):
    root = Path(root_dir)
    if not root.exists():
        print(f"❌ Le dossier {root_dir} n'existe pas. Vérifie le chemin.")
        return

    # On considère que chaque sous-dossier direct de dataset/ correspond
    # à un dataset téléchargé distinct (zip extrait)
    sub_datasets = [d for d in root.iterdir() if d.is_dir()]

    if not sub_datasets:
        print(f"❌ Aucun sous-dossier trouvé dans {root_dir}. "
              f"As-tu bien extrait les .zip ?")
        return

    full_report = []
    for ds_dir in sub_datasets:
        print(f"\n{'='*70}\nInspection : {ds_dir.name}\n{'='*70}")
        report = inspect_single_dataset(ds_dir)
        full_report.append(report)
        print(json.dumps(report, indent=2, ensure_ascii=False, default=str))

    # Sauvegarde du rapport complet en JSON pour réutilisation par le
    # script de fusion (merge_datasets.py)
    output_path = Path("./inspection_report.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n\n✅ Rapport complet sauvegardé dans {output_path}")
    print("\nProchaine étape : examine chaque 'diagnostic' ci-dessus, en "
          "particulier pour les CSV marqués 'indéterminé', puis utilise "
          "merge_datasets.py pour construire les dossiers par culture.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspecte la structure des datasets téléchargés.")
    parser.add_argument("--root", type=str, default="./dataset",
                         help="Dossier racine contenant les sous-dossiers extraits des .zip")
    args = parser.parse_args()

    inspect_all(args.root)
