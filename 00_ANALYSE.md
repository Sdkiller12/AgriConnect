# Analyse du document "AgriConnect IA"

## 1. Ce que le document fait bien

- **Storytelling fort** : ouverture narrative (agriculteur + tache sur feuille de cacao) qui humanise le problème avant de parler techno.
- **Structure pitch classique solide** : Problème → Promesse → Techno → Impact → Valeur ajoutée → Roadmap. C'est exactement la structure attendue par un jury de hackathon.
- **Chiffres d'impact mémorables** : 70% sans accès à un agronome, 40% de pertes évitables, 20% du PIB. Bon pour l'accroche orale.
- **3 modules IA clairement délimités** : Vision (diagnostic photo), NLP (conseil conversationnel), Données locales (prix marché + météo). Architecture facile à présenter en slide unique.
- **Roadmap en 4 phases réaliste** (MVP → Pilote → Déploiement → Scalabilité) avec horizon temporel donné.
- **Filières ciblées précises** : cacao, café, anacarde, banane plantain, manioc — bon ancrage local qui évite le piège du "produit générique".

## 2. Risques / faiblesses à anticiper face au jury

| Risque | Pourquoi c'est un problème | Recommandation |
|---|---|---|
| **"40% de pertes évitées" non sourcé** | Un jury technique va demander la source. Si c'est une estimation, le dire clairement ("estimation basée sur étude X"). | Préparer une slide de sources ou reformuler en "objectif visé". |
| **"Fonctionne sans connexion internet" répété 3 fois mais flou techniquement** | Un vrai mode offline pour un modèle de vision + NLP est très difficile (poids des modèles, mises à jour des prix/météo qui nécessitent du réseau). | Préciser : qu'est-ce qui est *réellement* offline (ex: modèle vision quantifié embarqué) vs ce qui nécessite une synchronisation différée (prix, météo). |
| **"Comprend le français et les langues locales" (NLP)** | Très ambitieux : peu de modèles open-source gèrent le baoulé, dioula, etc. avec qualité suffisante. Risque de sur-promesse à l'oral. | Présenter comme une roadmap (français d'abord, langues locales en Phase 3) plutôt qu'un acquis du MVP. |
| **Pas de mention du modèle économique** | Un jury hackathon pose souvent la question "comment ça se finance après le pilote ?". | Ajouter une slide monétisation (B2B2C via coopératives, freemium, subvention ONG, etc.) même si non demandée explicitement dans le doc. |
| **"5 maladies communes" en Phase 1** | Bien pour un MVP réaliste, mais il faut que la démo live montre ces 5 maladies de façon crédible (pas juste 1-2 testées). | Le dataset doit couvrir équitablement ces 5 classes (voir script ci-dessous). |
| **Confidentialité/dépendance API (Hugging Face / Ollama)** | Si la démo dépend d'une connexion internet pour Hugging Face, ça contredit le pitch "fonctionne hors-ligne". | D'où le choix hybride : Ollama local pour le NLP de base + fallback HF API si connecté, modèle vision local toujours. |

## 3. Questions probables du jury (à préparer)

1. "Quelle est la précision réelle de votre modèle sur les 5 maladies ?" → avoir une matrice de confusion prête.
2. "D'où viennent vos données de prix de marché ?" → préciser si scrappées, simulées, ou API officielle (ex: RHDC, OCPV en Côte d'Ivoire).
3. "Qu'est-ce qui tourne vraiment en local vs dans le cloud ?" → schéma d'architecture clair (voir prompt maître ci-dessous).
4. "Comment gérez-vous les utilisateurs analphabètes ?" → l'interface vocale doit être démontrée, pas juste mentionnée.

## 4. Architecture technique déduite (basée sur tes choix)

- **Frontend** : Next.js (interface web simplifiée, mobile-first, mode low-bandwidth)
- **Backend** : FastAPI (orchestration des 3 modules IA + API REST)
- **Vision IA** : pipeline d'entraînement (fine-tuning EfficientNet/ResNet via Hugging Face `transformers`/`timm` sur dataset PlantVillage + données locales) **+ modèle pré-entraîné en fallback** si le fine-tuning échoue ou pour les classes non couvertes
- **NLP Agricole** : Ollama local (Llama 3.1 8B ou Mistral 7B quantifié) avec RAG sur fiches agronomiques **+ fallback API Hugging Face Inference** si connexion disponible
- **Moteur de données locales** : module FastAPI séparé qui agrège prix marché (scraping/API) + météo (API type Open-Meteo, gratuite et sans clé)

Cette architecture résout directement le risque #2 du tableau ci-dessus (offline ambigu) en distinguant clairement ce qui est local vs cloud.
