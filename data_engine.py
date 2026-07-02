import sys
import os
import json

# Ajouter le répertoire du backend au path pour pouvoir importer 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.services.data_service import DataService, CSV_PATH

if __name__ == "__main__":
    print("Moteur de données local d'AgriConnect IA")
    print("========================================")
    
    # Initialisation du service (ceci génère également le dataset simulé s'il est absent)
    service = DataService()
    print(f"Dataset des prix synchronisé à l'emplacement : {CSV_PATH}")

    # 1. Test des prix et des tendances
    print("\n--- [TEST PRIX] Tendance cacao à Abidjan (30j) ---")
    try:
        price_trend = service.get_latest_price("cacao", "Abidjan")
        print(json.dumps(price_trend, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Erreur lors de la récupération des prix : {e}")

    # 2. Test des prévisions météo et alertes agronomiques
    print("\n--- [TEST MÉTÉO] Prévisions météo San-Pedro (7j) ---")
    try:
        weather_forecast = service.get_weather_forecast("San-Pedro")
        print(json.dumps(weather_forecast, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Erreur lors de la récupération de la météo : {e}")
