import json
import os
import sys

# Ensure the app module is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app


def main():
    openapi_schema = app.openapi()
    output_path = os.path.join(os.path.dirname(__file__), "..", "openapi.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"Exported OpenAPI schema to {output_path}")

if __name__ == "__main__":
    main()
