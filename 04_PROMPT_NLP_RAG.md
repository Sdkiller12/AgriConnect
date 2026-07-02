# SOUS-PROMPT 4 — MODULE NLP AGRICOLE (Ollama + RAG)
## À utiliser après le prompt maître, en complément du backend

---

```
Développe le module NLP AGRICOLE de AgriConnect IA : un système de
question-réponse conversationnel basé sur Ollama en local, enrichi par
RAG (Retrieval-Augmented Generation) sur une base de fiches agronomiques,
avec fallback vers l'API Hugging Face Inference si Ollama est indisponible.

## OBJECTIF
L'agriculteur pose une question en langage naturel (ex: "Pourquoi les
feuilles de mon cacaoyer jaunissent ?") et reçoit un conseil contextualisé
et fiable, basé sur des fiches agronomiques réelles plutôt que sur les
seules connaissances génériques du modèle de langage (pour réduire le
risque d'hallucination — critique sur un sujet où une mauvaise info
peut coûter une récolte).

## ARCHITECTURE DU MODULE

1. **Base de connaissances (fiches agronomiques)**
   - Format : fichiers Markdown ou JSON, un fichier par maladie/culture
     (ex: `cacao_pourriture_brune.md`, `cafe_rouille.md`)
   - Chaque fiche contient : symptômes, causes, traitements recommandés,
     mesures préventives, période de risque
   - Créer au moins les 5 fiches correspondant aux 5 maladies du MVP
     (cohérence avec le module Vision IA)

2. **Indexation vectorielle (RAG)**
   - Découper les fiches en chunks (~300 mots avec overlap de 50 mots)
   - Générer les embeddings avec un modèle léger Hugging Face
     (ex: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`,
     qui gère bien le français)
   - Stocker les embeddings dans PostgreSQL via `pgvector` (cohérent avec
     le backend FastAPI déjà prévu) ou, pour le MVP hackathon, dans un
     simple index FAISS local si pgvector complique le setup en démo
   - Fonction `retrieve_relevant_chunks(query: str, top_k: int = 3)` qui
     retourne les passages les plus pertinents

3. **Génération avec Ollama**
   - System prompt fixé : agent agricole expert, ton bienveillant et
     simple, toujours recommander un avis humain en cas de doute, jamais
     inventer une information non présente dans le contexte fourni
   - Prompt final envoyé à Ollama = system prompt + chunks RAG récupérés
     + historique de conversation (limité aux 4 derniers échanges pour
     ne pas surcharger le contexte) + question de l'utilisateur
   - Modèle recommandé : `llama3.1:8b-instruct-q4_0` (bon compromis
     qualité/vitesse/RAM pour un serveur local modeste) ou
     `mistral:7b-instruct-q4_0` en alternative
   - Timeout configurable (ex: 20s) — si dépassé, basculer sur le fallback

4. **Fallback API Hugging Face Inference**
   - Déclenché si : le démon Ollama ne répond pas, OU le timeout est
     dépassé, OU le modèle local n'est pas installé
   - Vérifier d'abord qu'une connexion internet est disponible (requête
     légère avec timeout court) avant de tenter l'appel, pour éviter une
     attente inutile en mode totalement hors-ligne
   - Utiliser un modèle équivalent hébergé (ex: un modèle Mistral/Llama
     instruct disponible via l'API Hugging Face Inference)
   - Le fallback reçoit le même prompt construit (system + RAG + historique
     + question) pour garantir une cohérence de réponse entre les deux
     voies

5. **Détection de langue locale (placeholder Phase 3)**
   - Prévoir une fonction `detect_language(text: str) -> str` qui retourne
     "fr" par défaut au MVP, mais avec une structure permettant d'ajouter
     facilement la détection baoulé/dioula plus tard (ne pas l'implémenter
     entièrement maintenant, juste préparer le point d'extension avec un
     commentaire explicite)

## FICHIERS À PRODUIRE

backend/app/services/nlp/
  knowledge_base/
    cacao_pourriture_brune.md
    cacao_mirides.md
    cafe_rouille_orangee.md
    anacarde_anthracnose.md
    manioc_mosaique.md
  rag.py              # indexation + retrieve_relevant_chunks()
  ollama_client.py     # appel Ollama local avec gestion timeout
  hf_fallback_client.py # appel API Hugging Face Inference
  nlp_service.py        # orchestration complète (RAG + Ollama + fallback)
  prompts.py            # system prompt et templates de prompt

## EXIGENCES
- Code Python complet et exécutable, pas de pseudo-code
- Gestion explicite de chaque cas d'échec (Ollama down, HF API down,
  les deux down) avec messages d'erreur différents et clairs
- Logging de la source utilisée pour chaque réponse (local vs fallback)
  pour pouvoir analyser en démo quelle voie a été utilisée
- Fournir un script `setup_knowledge_base.py` qui construit l'index RAG
  à partir des fiches Markdown, à lancer une fois après le clonage du repo

## LIVRABLE
Fournis le code complet de chaque fichier listé, le contenu des 5 fiches
agronomiques (rédigées en français, basées sur des connaissances
agronomiques réelles et vérifiables pour le cacao, café, anacarde et
manioc), et les commandes pour : installer Ollama, télécharger le modèle
recommandé (`ollama pull llama3.1:8b-instruct-q4_0`), et lancer
`setup_knowledge_base.py`.
```
