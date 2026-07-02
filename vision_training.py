"""
AgriConnect IA — Module Vision IA
==================================
Script complet pour :
1. Préparer/structurer le dataset (PlantVillage subset + extension locale)
2. Fine-tuner un modèle EfficientNet via Hugging Face `transformers`
3. Évaluer (matrice de confusion, rapport de classification)
4. Exporter le modèle pour inference (FastAPI)
5. Définir le modèle de FALLBACK pré-entraîné (zero-shot) si le dataset
   local est insuffisant ou si le fine-tuning échoue.

Prérequis :
    pip install torch torchvision transformers datasets evaluate \
        scikit-learn matplotlib pillow accelerate --break-system-packages

Usage (une culture) :
    python vision_training.py --culture cacao

Usage (toutes les cultures séquentiellement) :
    python vision_training.py --all

Structure de dataset attendue (générée par merge_datasets.py) :
    data_par_culture/<culture>/
        train/<classe>/
        val/<classe>/
        test/<classe>/

NB Phase 1 (MVP hackathon) : limiter à 5 maladies communes annoncées
dans le pitch. Garder une classe "sain" par culture pour éviter les
faux positifs systématiques (cas réel le plus fréquent en terrain).
"""

import os
import sys
import json
import random
import argparse
from pathlib import Path
from dataclasses import dataclass, field

import torch
import numpy as np
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    TrainingArguments,
    Trainer,
)


# ---------------------------------------------------------------------------
# CULTURES SUPPORTÉES
# ---------------------------------------------------------------------------

SUPPORTED_CULTURES = ["cacao", "cafe", "anacarde", "manioc"]

# Mots-clés qui qualifient une classe comme "saine" (healthy)
HEALTHY_KEYWORDS = {"healthy", "sain", "saine", "normal", "normale"}

# Seuil minimum d'images TOTAL (train+val+test) par classe pour autoriser
# l'entraînement. En dessous → blocage avec message explicite.
MIN_IMAGES_PER_CLASS = 20


# ---------------------------------------------------------------------------
# 1. CONFIGURATION
# ---------------------------------------------------------------------------

@dataclass
class Config:
    # Culture cible (détermine data_dir, target_classes, output_dir)
    culture: str = "cacao"

    # Modèle de base pour le fine-tuning. EfficientNet-B0 est léger,
    # adapté à un déploiement edge / connexion limitée.
    base_model: str = "google/efficientnet-b0"

    # Modèle de FALLBACK pré-entraîné, plus généraliste, utilisé si :
    # - le dataset local est trop petit pour fine-tuner correctement
    # - la classe détectée n'est pas dans nos 5 maladies cibles
    fallback_model: str = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

    # data_dir et output_dir sont dérivés de `culture` via build_from_culture()
    data_dir: str = "./data_par_culture/cacao"
    output_dir: str = "./models/agriconnect-vision-cacao-v1"

    image_size: int = 224
    batch_size: int = 16
    num_epochs: int = 8
    learning_rate: float = 5e-5

    # Rempli dynamiquement depuis les dossiers réels de data_dir/train/
    target_classes: list = field(default_factory=list)

    seed: int = 42

    @classmethod
    def build_from_culture(cls, culture: str) -> "Config":
        """
        Construit une Config complète pour une culture donnée.
        Les classes sont lues dynamiquement depuis data_par_culture/<culture>/train/
        (pas codées en dur), car elles diffèrent par culture et viennent de
        plusieurs sources fusionnées.
        """
        if culture not in SUPPORTED_CULTURES:
            raise ValueError(
                f"Culture '{culture}' non supportée. Valeurs valides : {SUPPORTED_CULTURES}"
            )
        cfg = cls(
            culture=culture,
            data_dir=f"./data_par_culture/{culture}",
            output_dir=f"./models/agriconnect-vision-{culture}-v1",
        )
        cfg.target_classes = _discover_classes(cfg.data_dir)
        return cfg


def _discover_classes(data_dir: str) -> list:
    """
    Lit la liste des classes depuis le dossier train/ de data_dir.
    Retourne une liste triée pour garantir la reproductibilité entre runs.
    """
    train_dir = Path(data_dir) / "train"
    if not train_dir.exists():
        return []
    classes = sorted(
        d.name for d in train_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    )
    return classes


# ---------------------------------------------------------------------------
# 2. VÉRIFICATIONS PRÉ-ENTRAÎNEMENT
# ---------------------------------------------------------------------------

def check_healthy_class(config: Config) -> bool:
    """
    Vérifie qu'au moins une classe 'saine/healthy' existe pour la culture.
    Affiche un avertissement si absente — le modèle aura alors trop de
    faux positifs en conditions réelles (la plupart des plantes sont saines).
    Retourne True si OK, False si absente.
    """
    has_healthy = any(
        any(kw in cls.lower() for kw in HEALTHY_KEYWORDS)
        for cls in config.target_classes
    )
    if not has_healthy:
        print(
            f"\n⚠️  AVERTISSEMENT — Culture '{config.culture}' : aucune classe "
            f"'sain/healthy' détectée parmi {config.target_classes}.\n"
            f"   Sans exemples négatifs, le modèle risque de classifier TOUTE "
            f"image comme malade (trop de faux positifs). Il est FORTEMENT "
            f"recommandé d'ajouter une classe 'healthy' avant l'entraînement.\n"
        )
    else:
        healthy_cls = [c for c in config.target_classes
                       if any(kw in c.lower() for kw in HEALTHY_KEYWORDS)]
        print(f"  ✅ Classe saine détectée : {healthy_cls}")
    return has_healthy


def check_dataset_balance(config: Config) -> dict:
    """
    Vérifie le nombre d'images par classe/split.

    BLOQUE l'entraînement (SystemExit) si une classe a moins de
    MIN_IMAGES_PER_CLASS images au total (train+val+test) : en dessous de
    ce seuil, le fine-tuning est peu fiable même avec augmentation de données.

    Alerte également si le ratio max/min dépasse 3x (déséquilibre fort).
    """
    report = {}
    class_totals = {}

    for split in ["train", "val", "test"]:
        report[split] = {}
        for cls in config.target_classes:
            path = Path(config.data_dir) / split / cls
            if path.exists():
                count = sum(
                    len(list(path.glob(f"*{ext}")))
                    for ext in [".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"]
                )
            else:
                count = 0
            report[split][cls] = count
            class_totals[cls] = class_totals.get(cls, 0) + count

    print(f"\n--- Bilan dataset '{config.culture}' ---")
    print(json.dumps(report, indent=2, ensure_ascii=False))

    # --- Garde-fou : minimum absolu par classe ---
    insufficient_classes = [
        (cls, total) for cls, total in class_totals.items()
        if total < MIN_IMAGES_PER_CLASS
    ]
    if insufficient_classes:
        msg = (
            f"\n❌ BLOCAGE ENTRAÎNEMENT — Culture '{config.culture}' :\n"
            f"   Les classes suivantes ont moins de {MIN_IMAGES_PER_CLASS} images "
            f"au total (train+val+test), seuil insuffisant pour un fine-tuning "
            f"fiable même avec augmentation de données :\n"
        )
        for cls, total in insufficient_classes:
            msg += f"     - {cls} : {total} images\n"
        msg += (
            f"\n   ➡️  Options : collecter plus d'images pour ces classes, "
            f"les fusionner avec une classe similaire, ou les exclure du "
            f"périmètre de ce modèle (et les déléguer au fallback)."
        )
        print(msg)
        sys.exit(1)

    # --- Alerte déséquilibre (non bloquant) ---
    train_counts = list(report["train"].values())
    if train_counts and max(train_counts) > 0:
        imbalance_ratio = max(train_counts) / max(min(train_counts), 1)
        if imbalance_ratio > 3:
            print(
                f"\n⚠️  ALERTE déséquilibre : ratio {imbalance_ratio:.1f}x entre classe "
                f"la plus représentée et la moins représentée. Prévoir augmentation "
                f"de données ciblée ou pondération de la loss (voir `compute_class_weights`)."
            )

    return report


# ---------------------------------------------------------------------------
# 3. PRÉPARATION DU DATASET
# ---------------------------------------------------------------------------

def build_dataset_structure(base_dir: str, classes: list):
    """
    Crée l'arborescence attendue si elle n'existe pas encore.
    À lancer une fois avant d'y déposer manuellement les images.
    """
    splits = ["train", "val", "test"]
    for split in splits:
        for cls in classes:
            path = Path(base_dir) / split / cls
            path.mkdir(parents=True, exist_ok=True)
    print(f"Structure créée sous {base_dir}/ pour {len(classes)} classes x {len(splits)} splits.")


# ---------------------------------------------------------------------------
# 4. AUGMENTATION DE DONNÉES (essentiel : peu de données terrain au hackathon)
# ---------------------------------------------------------------------------

def build_transforms(image_size: int):
    """Construit les pipelines de transformation train et eval."""
    train_tf = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        # Simule des conditions de prise de vue terrain variables
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_tf, eval_tf


class PlantDiseaseDataset(Dataset):
    """Dataset custom basé sur ImageFolder, compatible Hugging Face Trainer."""

    def __init__(self, root_dir: str, classes: list, transform=None):
        self.root_dir = Path(root_dir)
        self.classes = classes
        self.class_to_idx = {c: i for i, c in enumerate(classes)}
        self.transform = transform
        self.samples = []

        for cls in classes:
            cls_dir = self.root_dir / cls
            if not cls_dir.exists():
                continue
            for ext in ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.tif", "*.tiff"):
                for img_path in cls_dir.glob(ext):
                    self.samples.append((img_path, self.class_to_idx[cls]))

        if len(self.samples) == 0:
            print(
                f"⚠️  Aucune image trouvée dans {root_dir}. "
                f"Vérifie que les images sont bien placées dans les sous-dossiers de classe."
            )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return {"pixel_values": image, "labels": label}


# ---------------------------------------------------------------------------
# 5. CALCUL DES POIDS DE CLASSE (pour gérer le déséquilibre)
# ---------------------------------------------------------------------------

def compute_class_weights(dataset: PlantDiseaseDataset, num_classes: int) -> torch.Tensor:
    counts = np.zeros(num_classes)
    for _, label in dataset.samples:
        counts[label] += 1
    counts = np.maximum(counts, 1)  # éviter division par zéro
    weights = counts.sum() / (num_classes * counts)
    return torch.tensor(weights, dtype=torch.float)


# ---------------------------------------------------------------------------
# 6. ENTRAÎNEMENT (FINE-TUNING)
# ---------------------------------------------------------------------------

def train_model(config: Config) -> tuple:
    """
    Fine-tune EfficientNet-B0 sur les données de la culture spécifiée.
    Retourne (trainer, model, processor) pour usage immédiat ou évaluation.
    """
    print(f"\n{'='*60}")
    print(f"ENTRAÎNEMENT — Culture : {config.culture.upper()}")
    print(f"  data_dir     : {config.data_dir}")
    print(f"  output_dir   : {config.output_dir}")
    print(f"  classes ({len(config.target_classes)}) : {config.target_classes}")
    print(f"{'='*60}\n")

    random.seed(config.seed)
    torch.manual_seed(config.seed)

    processor = AutoImageProcessor.from_pretrained(config.base_model)
    model = AutoModelForImageClassification.from_pretrained(
        config.base_model,
        num_labels=len(config.target_classes),
        ignore_mismatched_sizes=True,
        id2label={i: c for i, c in enumerate(config.target_classes)},
        label2id={c: i for i, c in enumerate(config.target_classes)},
    )

    train_tf, eval_tf = build_transforms(config.image_size)

    train_ds = PlantDiseaseDataset(
        os.path.join(config.data_dir, "train"), config.target_classes, train_tf
    )
    val_ds = PlantDiseaseDataset(
        os.path.join(config.data_dir, "val"), config.target_classes, eval_tf
    )

    if len(train_ds) == 0:
        raise RuntimeError(
            f"Dataset d'entraînement vide pour '{config.culture}'. "
            f"Lance merge_datasets.py puis vérifie {config.data_dir}/train/."
        )

    class_weights = compute_class_weights(train_ds, len(config.target_classes))
    print(f"Poids de classe : {dict(zip(config.target_classes, class_weights.tolist()))}")

    def collate_fn(batch):
        pixel_values = torch.stack([item["pixel_values"] for item in batch])
        labels = torch.tensor([item["labels"] for item in batch])
        return {"pixel_values": pixel_values, "labels": labels}

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=1)
        report = classification_report(
            labels, preds,
            target_names=config.target_classes,
            output_dict=True,
            zero_division=0,
        )
        return {
            "accuracy": report["accuracy"],
            "f1_macro": report["macro avg"]["f1-score"],
        }

    training_args = TrainingArguments(
        output_dir=config.output_dir,
        per_device_train_batch_size=config.batch_size,
        per_device_eval_batch_size=config.batch_size,
        num_train_epochs=config.num_epochs,
        learning_rate=config.learning_rate,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        logging_steps=10,
        save_total_limit=2,
        seed=config.seed,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=collate_fn,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    trainer.save_model(config.output_dir)
    processor.save_pretrained(config.output_dir)
    print(f"\n✅ Modèle '{config.culture}' sauvegardé dans {config.output_dir}")
    return trainer, model, processor


# ---------------------------------------------------------------------------
# 7. ÉVALUATION DÉTAILLÉE (matrice de confusion pour le jury)
# ---------------------------------------------------------------------------

def evaluate_on_test(model, processor, config: Config) -> dict:
    """
    Évalue le modèle sur le jeu de test, affiche le rapport de classification
    et sauvegarde la matrice de confusion en PNG.
    Retourne un dict {accuracy, f1_macro} pour le résumé comparatif.
    """
    _, eval_tf = build_transforms(config.image_size)
    test_ds = PlantDiseaseDataset(
        os.path.join(config.data_dir, "test"), config.target_classes, eval_tf
    )
    if len(test_ds) == 0:
        print("⚠️  Pas de données de test disponibles, évaluation ignorée.")
        return {"accuracy": None, "f1_macro": None}

    loader = DataLoader(test_ds, batch_size=config.batch_size)
    model.eval()
    all_preds, all_labels = [], []

    with torch.no_grad():
        for batch in loader:
            outputs = model(pixel_values=batch["pixel_values"])
            preds = torch.argmax(outputs.logits, dim=1)
            all_preds.extend(preds.tolist())
            all_labels.extend(batch["labels"].tolist())

    print(f"\n--- Rapport de classification — {config.culture.upper()} ---")
    report_str = classification_report(
        all_labels, all_preds,
        target_names=config.target_classes,
        zero_division=0,
    )
    print(report_str)

    report_dict = classification_report(
        all_labels, all_preds,
        target_names=config.target_classes,
        output_dict=True,
        zero_division=0,
    )

    # Matrice de confusion
    cm = confusion_matrix(all_labels, all_preds)
    fig, ax = plt.subplots(figsize=(max(6, len(config.target_classes)), max(5, len(config.target_classes) - 1)))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(config.target_classes)))
    ax.set_yticks(range(len(config.target_classes)))
    ax.set_xticklabels(config.target_classes, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(config.target_classes, fontsize=8)
    ax.set_xlabel("Prédiction")
    ax.set_ylabel("Vérité terrain")
    ax.set_title(f"Matrice de confusion — AgriConnect IA — {config.culture.upper()}")
    for i in range(len(config.target_classes)):
        for j in range(len(config.target_classes)):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black", fontsize=7)
    plt.colorbar(im)
    plt.tight_layout()
    cm_path = f"confusion_matrix_{config.culture}.png"
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"Matrice de confusion sauvegardée → {cm_path}")

    return {
        "accuracy": round(report_dict["accuracy"], 4),
        "f1_macro": round(report_dict["macro avg"]["f1-score"], 4),
    }


# ---------------------------------------------------------------------------
# 8. ENTRAÎNEMENT TOUTES CULTURES (séquentiel + résumé comparatif)
# ---------------------------------------------------------------------------

def train_all_cultures(cultures: list = None) -> dict:
    """
    Entraîne un modèle séparément pour chaque culture de `cultures`
    (par défaut : toutes les cultures supportées), séquentiellement.

    À la fin, affiche un tableau récapitulatif comparatif (accuracy + f1_macro
    par culture) pour identifier rapidement quelle culture a besoin de plus
    de données ou de réglages supplémentaires.

    Retourne un dict {culture: {accuracy, f1_macro, status}}.
    """
    if cultures is None:
        cultures = SUPPORTED_CULTURES

    summary: dict = {}

    for culture in cultures:
        print(f"\n\n{'#'*70}")
        print(f"# CULTURE : {culture.upper()}")
        print(f"{'#'*70}")

        try:
            cfg = Config.build_from_culture(culture)

            if not cfg.target_classes:
                print(f"⚠️  Aucune classe trouvée pour '{culture}' dans {cfg.data_dir}/train/. "
                      f"Vérifier que merge_datasets.py a bien produit ce dossier.")
                summary[culture] = {"status": "SKIPPED_NO_DATA", "accuracy": None, "f1_macro": None}
                continue

            # Vérifications pré-entraînement
            check_healthy_class(cfg)
            check_dataset_balance(cfg)   # bloque si < MIN_IMAGES_PER_CLASS

            # Entraînement
            trainer, model, processor = train_model(cfg)

            # Évaluation
            metrics = evaluate_on_test(model, processor, cfg)
            summary[culture] = {"status": "OK", **metrics}

        except SystemExit:
            # Blocage levé par check_dataset_balance()
            summary[culture] = {
                "status": "BLOCKED_INSUFFICIENT_DATA",
                "accuracy": None,
                "f1_macro": None,
            }
        except Exception as e:
            print(f"\n❌ Erreur inattendue pour '{culture}' : {e}")
            summary[culture] = {"status": f"ERROR: {e}", "accuracy": None, "f1_macro": None}

    # Résumé comparatif final
    print(f"\n\n{'='*70}")
    print("RÉSUMÉ COMPARATIF — Toutes cultures")
    print(f"{'='*70}")
    print(f"{'Culture':<15} {'Statut':<30} {'Accuracy':>10} {'F1 macro':>10}")
    print("-" * 70)
    for culture, res in summary.items():
        acc = f"{res['accuracy']:.4f}" if res["accuracy"] is not None else "  —"
        f1  = f"{res['f1_macro']:.4f}"  if res["f1_macro"]  is not None else "  —"
        print(f"{culture:<15} {res['status']:<30} {acc:>10} {f1:>10}")

    # Cultures nécessitant plus de données
    needs_data = [c for c, r in summary.items()
                  if r["f1_macro"] is not None and r["f1_macro"] < 0.70]
    if needs_data:
        print(f"\n⚠️  Cultures avec F1 < 0.70 (à renforcer en données) : {needs_data}")

    summary_path = Path("./training_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Résumé sauvegardé dans {summary_path}")

    return summary


# ---------------------------------------------------------------------------
# 9. MODÈLE DE FALLBACK (pré-entraîné, zero-shot)
# ---------------------------------------------------------------------------

def predict_with_fallback(image_path: str, config: Config):
    """
    Utilise un modèle Hugging Face pré-entraîné généraliste de
    classification de maladies de plantes, sans fine-tuning local.

    Cas d'usage :
    - Le dataset terrain est insuffisant pour fine-tuner correctement.
    - La culture/maladie détectée ne fait pas partie des classes cibles
      du MVP (ex: tomate, maïs).
    - Mode "deuxième avis" : comparer la prédiction du modèle fine-tuné
      et celle du fallback, alerter si elles diffèrent fortement.
    """
    from transformers import pipeline

    classifier = pipeline("image-classification", model=config.fallback_model)
    image = Image.open(image_path).convert("RGB")
    return classifier(image)  # liste de {"label": ..., "score": ...}


def hybrid_predict(image_path: str, fine_tuned_model, processor, config: Config,
                   confidence_threshold: float = 0.6):
    """
    Stratégie hybride recommandée pour la démo hackathon :
    1. Essayer le modèle fine-tuné local (rapide, spécialisé Côte d'Ivoire).
    2. Si confiance < seuil -> appeler le fallback pré-entraîné comme
       second avis et le signaler clairement (transparence = crédibilité jury).
    """
    image = Image.open(image_path).convert("RGB")
    inputs = processor(image, return_tensors="pt")

    with torch.no_grad():
        outputs = fine_tuned_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        confidence = probs[pred_idx].item()

    primary_result = {
        "label": config.target_classes[pred_idx],
        "confidence": round(confidence, 3),
        "source": "modele_local_fine_tuned",
    }

    if confidence < confidence_threshold:
        fallback_results = predict_with_fallback(image_path, config)
        return {
            "primary": primary_result,
            "fallback": fallback_results[:3],
            "warning": (
                f"Confiance faible ({confidence:.0%}) sur le modèle spécialisé. "
                f"Un second avis a été généré via un modèle généraliste. "
                f"Recommandation : consulter un agent agricole local pour confirmation."
            ),
        }

    return {"primary": primary_result, "fallback": None, "warning": None}


# ---------------------------------------------------------------------------
# 10. POINT D'ENTRÉE
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="AgriConnect IA — Entraînement Vision par culture"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--culture",
        type=str,
        choices=SUPPORTED_CULTURES,
        help="Culture à entraîner (cacao, cafe, anacarde, manioc).",
    )
    group.add_argument(
        "--all",
        action="store_true",
        help="Entraîne toutes les cultures séquentiellement et produit un résumé comparatif.",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Vérifie uniquement le dataset (classes, équilibre) sans lancer l'entraînement.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.all:
        # --- Mode : toutes les cultures ---
        train_all_cultures()

    elif args.culture:
        # --- Mode : une seule culture ---
        cfg = Config.build_from_culture(args.culture)

        if not cfg.target_classes:
            print(
                f"❌ Aucune classe trouvée dans {cfg.data_dir}/train/.\n"
                f"   Vérifie que merge_datasets.py a bien été exécuté et que le "
                f"dossier data_par_culture/{args.culture}/train/ existe."
            )
            sys.exit(1)

        print(f"\nClasses détectées pour '{args.culture}' : {cfg.target_classes}")
        check_healthy_class(cfg)
        check_dataset_balance(cfg)

        if args.check_only:
            print("\n✅ Vérification terminée (--check-only). Aucun entraînement lancé.")
        else:
            # Entraînement
            trainer, model, processor = train_model(cfg)
            evaluate_on_test(model, processor, cfg)

    else:
        # --- Mode interactif / démo sans argument ---
        print("AgriConnect IA — Vision Training")
        print(f"Cultures disponibles : {SUPPORTED_CULTURES}")
        print("\nUsage :")
        print("  Une culture   : python vision_training.py --culture cacao")
        print("  Toutes        : python vision_training.py --all")
        print("  Vérif seule   : python vision_training.py --culture manioc --check-only")
        print()

        # Démo : vérification du dataset pour toutes les cultures disponibles
        for culture in SUPPORTED_CULTURES:
            cfg = Config.build_from_culture(culture)
            if cfg.target_classes:
                print(f"\n[{culture.upper()}] Classes : {cfg.target_classes}")
                check_healthy_class(cfg)
            else:
                print(f"\n[{culture.upper()}] ⚠️  Aucun dossier train/ trouvé dans {cfg.data_dir}")
