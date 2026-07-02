# SOUS-PROMPT 3 — BACKEND (FastAPI)
## À utiliser après le prompt maître

---

```
Développe le BACKEND de AgriConnect IA avec FastAPI (Python 3.11+),
architecture modulaire, prêt pour conteneurisation Docker.

## ARBORESCENCE ATTENDUE

backend/
  app/
    main.py                    # point d'entrée FastAPI, montage des routers
    config.py                  # configuration via pydantic-settings (.env)
    routers/
      diagnostic.py            # POST /api/diagnostic (upload image)
      chat.py                  # POST /api/chat (NLP agricole)
      prix.py                  # GET /api/prix
      meteo.py                 # GET /api/meteo
      health.py                # GET /api/health (vérifie l'état de chaque module)
    services/
      vision_service.py        # logique d'inférence du modèle Vision IA
      nlp_service.py            # orchestration Ollama + fallback HF API
      data_service.py          # wrapper autour du moteur de données locales
    models/
      schemas.py                # modèles Pydantic (requêtes/réponses)
    db/
      database.py               # connexion PostgreSQL (SQLAlchemy async)
      models.py                  # tables : diagnostics_history, chat_logs
  requirements.txt
  Dockerfile
  docker-compose.yml            # services : backend, postgres, ollama
  .env.example

## ENDPOINTS À IMPLÉMENTER

### POST /api/diagnostic
- Reçoit une image (multipart/form-data)
- Valide le format (jpg/png) et la taille (max 10MB)
- Appelle `vision_service.predict()` qui réutilise la logique de
  `hybrid_predict()` du script `vision_training.py` fourni séparément
  (modèle fine-tuné local + fallback HF si confiance < seuil)
- Enregistre le diagnostic en base (table `diagnostics_history`) avec
  timestamp, résultat, confiance — utile pour la Phase 2 (amélioration
  continue avec retours terrain)
- Réponse JSON :
  {
    "label": str,
    "confidence": float,
    "recommandations": list[str],
    "fallback_used": bool,
    "fallback_results": list | null,
    "warning": str | null
  }

### POST /api/chat
- Reçoit { "message": str, "history": list[{"role": str, "content": str}] }
- Appelle `nlp_service.generate_response()` :
  1. Tente Ollama en local (modèle configuré, ex: llama3.1:8b ou
     mistral:7b-instruct-q4) avec un system prompt agronomique + contexte
     RAG (fiches maladies/cultures pertinentes récupérées par similarité)
  2. Si Ollama indisponible (timeout ou erreur de connexion au démon
     local) ET qu'une connexion internet est détectée, fallback vers
     l'API Hugging Face Inference avec un modèle équivalent
  3. Si aucun des deux n'est disponible, retourne un message d'erreur
     clair invitant à réessayer plus tard
- Réponse JSON : { "response": str, "source": "ollama_local" | "hf_api_fallback", "context_used": list[str] }

### GET /api/prix?region=...&culture=...
- Wrapper autour des fonctions `get_latest_prices()` et `get_price_trend()`
  du script `data_engine.py` fourni séparément
- Réponse JSON avec prix actuel, tendance, recommandation

### GET /api/meteo?region=...
- Wrapper autour de `get_weather_forecast()` du script `data_engine.py`
- Si Open-Meteo est inaccessible, retourner un code 503 avec message clair
  (le frontend doit afficher "Météo indisponible hors connexion")

### GET /api/health
- Vérifie l'état de chaque sous-système (Ollama up/down, base de données,
  accès internet) — utile pour debug en démo live devant le jury

## EXIGENCES TECHNIQUES
- Validation stricte des entrées avec Pydantic v2
- Gestion d'erreurs centralisée (exception handlers FastAPI) — jamais de
  500 brut renvoyé au frontend, toujours un message structuré
- CORS configuré pour autoriser le frontend Next.js (origine configurable
  via .env)
- Logging structuré (module `logging` standard, niveau INFO en prod)
- Tests unitaires de base avec `pytest` pour chaque router (au moins un
  test de cas nominal + un test de cas d'erreur par endpoint)
- Le `docker-compose.yml` doit inclure :
  - service `backend` (FastAPI, build depuis le Dockerfile)
  - service `postgres` (image officielle postgres:16, volume persistant)
  - service `ollama` (image officielle ollama/ollama, volume pour les
    modèles téléchargés)
  - réseau interne partagé entre les 3 services

## LIVRABLE
Fournis l'arborescence complète, le code de chaque fichier listé
ci-dessus, le `requirements.txt`, le `Dockerfile`, le `docker-compose.yml`,
et un `.env.example` couvrant : DATABASE_URL, OLLAMA_HOST, OLLAMA_MODEL,
HUGGINGFACE_API_TOKEN, HUGGINGFACE_FALLBACK_MODEL, CORS_ORIGINS,
CONFIDENCE_THRESHOLD. Donne aussi les commandes pour lancer l'ensemble
en local (`docker-compose up`) et pour lancer les tests.
```
