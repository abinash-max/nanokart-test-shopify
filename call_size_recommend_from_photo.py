#!/usr/bin/env python3
"""Call Nanokart size recommendation API with hardcoded values."""

import json
import mimetypes
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing dependency: requests")
    print("Install it with: pip install requests")
    sys.exit(1)


API_URL = "https://api.nanokart.ai/api/v1/size/recommend-from-photo"

# ----------------------------
# Hardcode your values here
# ----------------------------
API_KEY = "nk_aaaca4ca52a74630919117a1208945351a81822745f647aa"
PARTNER_ID = "NK-8RO7BD"
IMAGE_PATH = r"C:\Users\user\Downloads\test_user.jpeg"
HEIGHT_CM = 165
PRODUCT_ID = "prod_xyz789"
# ----------------------------


def main() -> int:
    if not API_KEY or API_KEY == "nk_your_api_key_here":
        print("Error: Set API_KEY at top of file.")
        return 2

    if not PARTNER_ID or PARTNER_ID == "NK-XXXXXX":
        print("Error: Set PARTNER_ID at top of file.")
        return 2

    if not isinstance(HEIGHT_CM, int) or HEIGHT_CM < 50 or HEIGHT_CM > 250:
        print("Error: HEIGHT_CM must be an integer between 50 and 250.")
        return 2

    image_path = Path(IMAGE_PATH)
    if not image_path.is_file():
        print(f"Error: image file not found: {image_path}")
        return 2

    ext = image_path.suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
    if ext not in allowed:
        print(
            "Error: unsupported file extension. Use one of: "
            ".jpg, .jpeg, .png, .webp, .heic"
        )
        return 2

    headers = {
        "X-API-Key": API_KEY,
        "X-Partner-Id": PARTNER_ID,
    }
    data = {
        "height_cm": str(HEIGHT_CM),
        "product_id": PRODUCT_ID,
    }

    with image_path.open("rb") as image_file:
        mime_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
        upload_name = image_path.name or f"customer_photo{ext}"
        files = {"human_image": (upload_name, image_file, mime_type)}
        response = requests.post(
            API_URL,
            headers=headers,
            data=data,
            files=files,
            timeout=60,
        )

    print(f"HTTP {response.status_code}")
    print("-" * 60)
    try:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except ValueError:
        print(response.text)

    return 0 if response.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

