#!/usr/bin/env python3
"""
Build the Scotland Places database (Cafes, Bookshops, Charity Shops, Antique Shops)
from Geofabrik's official Scotland OpenStreetMap extract using `osmium-tool`.

Output:
  public/data/scotland-places.json

Features:
  - 100% exact Scotland boundary (no Overpass timeouts or rate limits)
  - Resolves nodes, ways (buildings), and relations via `osmium export`
  - Spatial deduplication (merges duplicate node + building pairs within 45 m)
  - Tags major UK cafe chains (`isChain: true`) so the app can support an "Indies only" toggle

Usage:
  python3 scripts/fetch_scotland_places.py --include-second-hand
  python3 scripts/fetch_scotland_places.py --include-second-hand --refresh
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Any

GEOFABRIK_URL = "https://download.geofabrik.de/europe/united-kingdom/scotland-latest.osm.pbf"
ROOT_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = ROOT_DIR / "scripts" / "tmp"
PBF_PATH = TMP_DIR / "scotland-latest.osm.pbf"
FILTERED_PBF_PATH = TMP_DIR / "scotland-filtered.osm.pbf"
GEOJSONSEQ_PATH = TMP_DIR / "scotland-filtered.geojsonseq"
OUTPUT_PATH = ROOT_DIR / "public" / "data" / "scotland-places.json"

# Major UK/international cafe chains for optional "Indies only" filtering in the UI
CHAIN_CAFE_PATTERNS = [
    r"\bstarbucks\b",
    r"\bcosta(\s+coffee|\s+express)?\b",
    r"\bcaff[eè]\s+nero\b",
    r"\bpret\s+a\s+manger\b",
    r"\bgreggs\b",
    r"\btim\s+hortons\b",
    r"\bmccaf[eé]\b",
    r"\bblack\s+sheep\s+coffee\b",
    r"\bmuffin\s+break\b",
    r"\besquires\s+coffee\b",
    r"\bamt\s+coffee\b",
    r"\bwild\s+bean\s+caf[eé]\b",
    r"\btesco\s+caf[eé]\b",
    r"\bsainsbury'?s\s+caf[eé]\b",
    r"\bmorrisons\s+caf[eé]\b",
    r"\basda\s+caf[eé]\b",
    r"\bm&s\s+caf[eé]\b",
    r"\bmarks\s*&\s*spencer\s+caf[eé]\b",
    r"\bcoffee\s*#1\b",
    r"\bsoho\s+coffee\b",
    r"\bpatisserie\s+valerie\b",
    r"\bpaul\s+bakery\b",
    r"\bgail'?s\b",
    r"\bblank\s+street\b",
    r"\bwatchhouse\b",
    r"\bbakers\s*\+\s*baristas\b",
    r"\bdobbies\b",
    r"\bchaiiwala\b",
    r"\bcupp(\s+bubble\s+tea)?\b",
    r"\bmooboo\b",
    r"\bcake\s+box\b",
    r"\bmillie'?s\s+cookies\b",
]
CHAIN_CAFE_RE = re.compile("|".join(CHAIN_CAFE_PATTERNS), re.IGNORECASE)

# Known Scottish matcha specialists & standout matcha cafes/tea houses (matched against OSM)
MATCHA_SPOT_PATTERNS = [
    r"\bmatcha\b",
    r"\bbird\s*(&|and)\s*blend\b",
    r"\bpekoetea\b",
    r"^meh\.?$",
    r"\bpapii\b",
    r"^ante$",
    r"\bheytea\b",
    r"\broom\s+rumours\b",
    r"\bgodshot\b",
    r"\bzennor\b",
    r"\blaboratorio\s+espresso\b",
    r"\bsarang\b",
    r"\bdozo\b",
    r"\bspace\s+specialty\b",
    r"\bsingl-?end\b",
    r"\bwillow\s+grove\b",
    r"\bblank\s+street\b",
    r"^hea\b",
    r"\bcafe\s+moyo\b",
    r"\b474\s+by\s+cup\b",
    r"^mount$",
    r"\bsasha.?s\s+corner\b",
    r"\bh[oö]fn\b",
    r"\beh9\b",
    r"\bspoiled\s+life\b",
    r"\bknoops\b",
    r"^cooki$",
]
MATCHA_SPOT_RE = re.compile("|".join(MATCHA_SPOT_PATTERNS), re.IGNORECASE)

# Exclude pawnbrokers & used-electronics chains when --include-second-hand is enabled
EXCLUDED_SECOND_HAND_RE = re.compile(
    r"\b(cex|cash\s+converters|cash\s+generator|pawnbroker|h&t|ramsdens)\b",
    re.IGNORECASE,
)


def ensure_pbf(refresh: bool) -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    if PBF_PATH.exists() and not refresh:
        size_mb = PBF_PATH.stat().st_size / (1024 * 1024)
        print(f"Using cached {PBF_PATH} ({size_mb:.1f} MB). Pass --refresh to re-download.")
        return

    print(f"Downloading Scotland OSM extract from {GEOFABRIK_URL}...")
    req = urllib.request.Request(
        GEOFABRIK_URL,
        headers={"User-Agent": "ThriftingQueenScotlandBuilder/2.0"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp, PBF_PATH.open("wb") as out:
        shutil.copyfileobj(resp, out)
    size_mb = PBF_PATH.stat().st_size / (1024 * 1024)
    print(f"Downloaded {PBF_PATH} ({size_mb:.1f} MB).")


def run_osmium_filter(include_second_hand: bool) -> None:
    if not shutil.which("osmium"):
        raise RuntimeError(
            "osmium-tool is required. Install it with `brew install osmium-tool` (macOS) "
            "or `sudo apt install osmium-tool` (Linux)."
        )

    filters = [
        "nwr/amenity=cafe",
        "nwr/shop=bakery",
        "nwr/shop=pastry",
        "nwr/shop=tea",
        "nwr/shop=books",
        "nwr/shop=charity",
        "nwr/shop=antiques",
    ]
    if include_second_hand:
        filters.append("nwr/shop=second_hand")

    print("Filtering Scotland PBF with osmium tags-filter...")
    subprocess.run(
        ["osmium", "tags-filter", "--overwrite", str(PBF_PATH), *filters, "-o", str(FILTERED_PBF_PATH)],
        check=True,
    )

    print("Exporting filtered features to GeoJSONSeq...")
    subprocess.run(
        [
            "osmium",
            "export",
            "--overwrite",
            "--attributes=type,id",
            "-f",
            "geojsonseq",
            str(FILTERED_PBF_PATH),
            "-o",
            str(GEOJSONSEQ_PATH),
        ],
        check=True,
    )


def geometry_centroid(geometry: dict[str, Any]) -> tuple[float, float] | None:
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return None

    if gtype == "Point":
        return float(coords[1]), float(coords[0])

    points: list[tuple[float, float]] = []

    def collect(obj: Any) -> None:
        if isinstance(obj, (list, tuple)) and len(obj) >= 2 and isinstance(obj[0], (int, float)):
            points.append((float(obj[1]), float(obj[0])))
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                collect(item)

    collect(coords)
    if not points:
        return None
    avg_lat = sum(p[0] for p in points) / len(points)
    avg_lng = sum(p[1] for p in points) / len(points)
    return avg_lat, avg_lng


def classify_category(props: dict[str, Any], include_second_hand: bool) -> str | None:
    shop = str(props.get("shop") or "").strip().lower()
    amenity = str(props.get("amenity") or "").strip().lower()
    name = str(props.get("name") or props.get("brand") or "").strip()
    cuisine = str(props.get("cuisine") or "").lower()
    drink_matcha = str(props.get("drink:matcha") or "").lower()

    if shop == "antiques":
        return "antiques"
    if shop == "charity":
        return "charity"
    if shop == "books":
        return "bookshop"
    if include_second_hand and shop == "second_hand":
        return "charity"
    if (
        amenity == "cafe"
        or shop in ("tea", "bakery", "pastry")
    ) and (
        "matcha" in cuisine
        or drink_matcha in ("yes", "served")
        or (name and MATCHA_SPOT_RE.search(name))
    ):
        return "matcha"
    if shop in ("bakery", "pastry"):
        return "bakery"
    if amenity == "cafe":
        return "cafe"
    return None


def format_address(props: dict[str, Any]) -> tuple[str | None, str | None]:
    parts: list[str] = []
    house = props.get("addr:housenumber") or props.get("addr:housename")
    street = props.get("addr:street")
    if house and street:
        parts.append(f"{house} {street}")
    elif street:
        parts.append(str(street))

    city = (
        props.get("addr:city")
        or props.get("addr:town")
        or props.get("addr:village")
        or props.get("addr:suburb")
    )
    if city:
        parts.append(str(city))

    postcode = props.get("addr:postcode")
    if postcode:
        parts.append(str(postcode))

    address = ", ".join(parts) if parts else None
    return address, (str(city) if city else None)


def normalize_website(raw: Any) -> str | None:
    if not raw:
        return None
    val = str(raw).strip()
    if not val:
        return None
    if not val.startswith(("http://", "https://")):
        return f"https://{val}"
    return val


def normalize_name_key(name: str) -> str:
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def richness_score(place: dict[str, Any]) -> int:
    score = 0
    for key in ("address", "city", "openingHours", "website", "phone", "description"):
        if place.get(key):
            score += 1
    return score


def deduplicate_places(places: list[dict[str, Any]], threshold_m: float = 45.0) -> tuple[list[dict[str, Any]], int]:
    """Merge duplicate node + building polygon pairs with the same category & name within threshold_m."""
    buckets: dict[tuple[str, str], list[dict[str, Any]]] = {}
    removed = 0

    for place in places:
        key = (place["category"], normalize_name_key(place["name"]))
        existing_list = buckets.setdefault(key, [])
        merged = False

        for idx, existing in enumerate(existing_list):
            if haversine_m(place["lat"], place["lng"], existing["lat"], existing["lng"]) <= threshold_m:
                removed += 1
                if richness_score(place) > richness_score(existing):
                    existing_list[idx] = place
                merged = True
                break

        if not merged:
            existing_list.append(place)

    result = [p for group in buckets.values() for p in group]
    return result, removed


def is_chain_cafe(name: str, props: dict[str, Any]) -> bool:
    brand = str(props.get("brand") or "")
    operator = str(props.get("operator") or "")
    haystack = f"{name} {brand} {operator}"
    return bool(CHAIN_CAFE_RE.search(haystack))


def parse_geojsonseq(include_second_hand: bool) -> list[dict[str, Any]]:
    places_by_id: dict[str, dict[str, Any]] = {}

    with GEOJSONSEQ_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip().lstrip("\x1e")
            if not line:
                continue
            feature = json.loads(line)
            props: dict[str, Any] = feature.get("properties") or {}
            geom = feature.get("geometry") or {}

            category = classify_category(props, include_second_hand)
            if not category:
                continue

            name = str(props.get("name") or props.get("brand") or "").strip()
            if not name:
                continue
            if category == "charity" and EXCLUDED_SECOND_HAND_RE.search(name):
                continue

            centroid = geometry_centroid(geom)
            if not centroid:
                continue
            lat, lng = centroid
            if not (54.5 <= lat <= 61.1 and -8.8 <= lng <= -0.5):
                continue

            osm_type = str(props.get("@type") or "node")[0]
            osm_id = props.get("@id")
            if osm_id is None:
                continue
            place_id = f"osm-{osm_type}-{osm_id}"

            address, city = format_address(props)
            place: dict[str, Any] = {
                "id": place_id,
                "name": name,
                "category": category,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "source": "osm",
            }

            if address:
                place["address"] = address
            if city:
                place["city"] = city
            if props.get("opening_hours"):
                place["openingHours"] = str(props["opening_hours"]).strip()
            website = normalize_website(props.get("website") or props.get("contact:website"))
            if website:
                place["website"] = website
            phone = props.get("phone") or props.get("contact:phone")
            if phone:
                place["phone"] = str(phone).strip()
            if props.get("description"):
                place["description"] = str(props["description"]).strip()
            if category in ("cafe", "bakery", "matcha") and is_chain_cafe(name, props):
                place["isChain"] = True

            places_by_id[place_id] = place

    return list(places_by_id.values())


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Scotland places JSON from Geofabrik OSM extract.")
    parser.add_argument(
        "--include-second-hand",
        action="store_true",
        help="Include shop=second_hand under the charity category.",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Force re-downloading scotland-latest.osm.pbf from Geofabrik.",
    )
    args = parser.parse_args()

    ensure_pbf(refresh=args.refresh)
    run_osmium_filter(include_second_hand=args.include_second_hand)

    raw_places = parse_geojsonseq(include_second_hand=args.include_second_hand)
    deduped, removed = deduplicate_places(raw_places)
    deduped.sort(key=lambda p: (p["category"], p["name"].lower()))

    counts: dict[str, int] = {}
    chain_count = 0
    for p in deduped:
        counts[p["category"]] = counts.get(p["category"], 0) + 1
        if p.get("isChain"):
            chain_count += 1

    payload = {
        "version": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "region": "Scotland",
        "counts": counts,
        "places": deduped,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"\nSaved {len(deduped)} Scotland places to {OUTPUT_PATH} ({size_kb:.1f} KB)")
    print(f"Deduplicated: {removed} overlapping node/building pairs merged")
    print(f"Breakdown: {json.dumps(counts)} (chain cafes tagged: {chain_count})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
