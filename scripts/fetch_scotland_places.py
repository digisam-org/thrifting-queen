#!/usr/bin/env python3
"""
Fetch all Cafes, Bookshops, Charity Shops, and Antique Shops across Scotland
from OpenStreetMap via the Overpass API and save a compact JSON database to:
  public/data/scotland-places.json

Zero external Python dependencies (uses Python standard library only).

Usage:
  python3 scripts/fetch_scotland_places.py
  python3 scripts/fetch_scotland_places.py --include-second-hand
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "scotland-places.json"

# Scotland bounding fallback + exact OSM administrative relation (admin_level=4, Scotland)
AREA_SELECTOR = 'area["name"="Scotland"]["admin_level"="4"]["boundary"="administrative"]->.scotland;'

CATEGORY_QUERIES: dict[str, list[str]] = {
    "cafe": [
        'nwr["amenity"="cafe"](area.scotland);',
    ],
    "bookshop": [
        'nwr["shop"="books"](area.scotland);',
    ],
    "charity": [
        'nwr["shop"="charity"](area.scotland);',
    ],
    "antiques": [
        'nwr["shop"="antiques"](area.scotland);',
    ],
}


def build_query(selectors: list[str]) -> str:
    joined = "\n  ".join(selectors)
    return f"""
[out:json][timeout:180];
{AREA_SELECTOR}
(
  {joined}
);
out center tags;
""".strip()


def fetch_overpass(query: str, max_attempts: int = 4) -> dict[str, Any]:
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error: Exception | None = None

    for attempt in range(max_attempts):
        endpoint = OVERPASS_ENDPOINTS[attempt % len(OVERPASS_ENDPOINTS)]
        req = urllib.request.Request(
            endpoint,
            data=encoded,
            headers={
                "User-Agent": "ThriftingQueenScotlandBuilder/1.0 (personal gift project)",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=200) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            wait_s = 5 * (attempt + 1)
            print(f"  Attempt {attempt + 1} failed ({endpoint}): {exc}. Retrying in {wait_s}s...")
            time.sleep(wait_s)

    raise RuntimeError(f"All Overpass attempts failed: {last_error}")


def format_address(tags: dict[str, str]) -> tuple[str | None, str | None]:
    parts: list[str] = []
    house = tags.get("addr:housenumber") or tags.get("addr:housename")
    street = tags.get("addr:street")
    if house and street:
        parts.append(f"{house} {street}")
    elif street:
        parts.append(street)

    city = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or tags.get("addr:suburb")
    if city:
        parts.append(city)

    postcode = tags.get("addr:postcode")
    if postcode:
        parts.append(postcode)

    address = ", ".join(parts) if parts else None
    return address, city


def normalize_website(raw: str | None) -> str | None:
    if not raw:
        return None
    val = raw.strip()
    if not val:
        return None
    if not val.startswith(("http://", "https://")):
        return f"https://{val}"
    return val


def normalize_element(el: dict[str, Any], category: str) -> dict[str, Any] | None:
    tags: dict[str, str] = el.get("tags") or {}
    name = (tags.get("name") or "").strip()
    if not name:
        return None

    lat = el.get("lat")
    lng = el.get("lon")
    if lat is None or lng is None:
        center = el.get("center") or {}
        lat = center.get("lat")
        lng = center.get("lon")
    if lat is None or lng is None:
        return None

    # Rough sanity check for Scotland bounding box (including Shetland & Hebrides)
    if not (54.5 <= float(lat) <= 61.1 and -8.8 <= float(lng) <= -0.5):
        return None

    address, city = format_address(tags)
    osm_type = el.get("type", "node")[0]
    place: dict[str, Any] = {
        "id": f"osm-{osm_type}-{el['id']}",
        "name": name,
        "category": category,
        "lat": round(float(lat), 6),
        "lng": round(float(lng), 6),
        "source": "osm",
    }

    if address:
        place["address"] = address
    if city:
        place["city"] = city
    if tags.get("opening_hours"):
        place["openingHours"] = tags["opening_hours"].strip()
    website = normalize_website(tags.get("website") or tags.get("contact:website"))
    if website:
        place["website"] = website
    phone = tags.get("phone") or tags.get("contact:phone")
    if phone:
        place["phone"] = phone.strip()
    if tags.get("description"):
        place["description"] = tags["description"].strip()

    return place


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Scotland POIs from OpenStreetMap.")
    parser.add_argument(
        "--include-second-hand",
        action="store_true",
        help="Also include shop=second_hand under the charity category.",
    )
    args = parser.parse_args()

    queries = {k: list(v) for k, v in CATEGORY_QUERIES.items()}
    if args.include_second_hand:
        queries["charity"].append('nwr["shop"="second_hand"](area.scotland);')

    places_by_id: dict[str, dict[str, Any]] = {}
    counts: dict[str, int] = {}

    for category, selectors in queries.items():
        print(f"Fetching Scotland '{category}' places from OpenStreetMap...")
        data = fetch_overpass(build_query(selectors))
        elements = data.get("elements", [])
        added = 0
        for el in elements:
            normalized = normalize_element(el, category)
            if not normalized:
                continue
            if normalized["id"] not in places_by_id:
                places_by_id[normalized["id"]] = normalized
                added += 1
        counts[category] = added
        print(f"  -> {added} named {category} places collected.")
        time.sleep(2)  # Be polite to public Overpass servers

    all_places = sorted(places_by_id.values(), key=lambda p: (p["category"], p["name"].lower()))
    payload = {
        "version": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "region": "Scotland",
        "counts": counts,
        "places": all_places,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"\nSaved {len(all_places)} Scotland places to {OUTPUT_PATH} ({size_kb:.1f} KB)")
    print("Breakdown:", json.dumps(counts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
