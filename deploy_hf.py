import os
from huggingface_hub import HfApi

api = HfApi()
token = os.environ["HF_TOKEN"]
repo_id = "sdkiller12/agri-connect-api"
folder_path = "/home/byteghost/Music/agri_connect_v2/backend"

ignore_patterns = [
    "models/*/checkpoint-*", 
    ".git/*", 
    ".venv/*", 
    "__pycache__/*", 
    ".pytest_cache/*", 
    "uploads/*"
]

print("Starting upload to Hugging Face...")
api.upload_folder(
    folder_path=folder_path,
    repo_id=repo_id,
    repo_type="space",
    token=token,
    ignore_patterns=ignore_patterns,
    commit_message="Deploy backend via HF API"
)
print("Upload complete!")
