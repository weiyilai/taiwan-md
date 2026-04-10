#!/usr/bin/env python3
"""
fetch-search-console.py — 抓 Google Search Console 資料

用法:
    python3 scripts/tools/fetch-search-console.py [--days 28]

憑證:
    跟 fetch-ga4.py 共用 ~/.config/taiwan-md/credentials/google-service-account.json
    需要把 service account email 加到 Search Console 的使用者權限（Restricted 即可）

Site URL:
    ~/.config/taiwan-md/credentials/.env 裡的 SC_SITE_URL
    格式: 'sc-domain:taiwan.md' (Domain property)
    或    'https://taiwan.md/' (URL prefix property)

輸出:
    ~/.config/taiwan-md/cache/search-console-latest.json
    ~/.config/taiwan-md/cache/search-console-{YYYY-MM-DD}.json

依賴:
    google-api-python-client
    google-auth
    (跟 fetch-ga4.py 共用 venv)

來源: 2026-04-11 session α
"""
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

CONFIG_DIR = Path.home() / ".config" / "taiwan-md"
CREDENTIALS_DIR = CONFIG_DIR / "credentials"
CACHE_DIR = CONFIG_DIR / "cache"
VENV_DIR = CONFIG_DIR / "venv"
ENV_FILE = CREDENTIALS_DIR / ".env"
SERVICE_ACCOUNT_FILE = CREDENTIALS_DIR / "google-service-account.json"
SETUP_GUIDE = "docs/pipelines/SENSE-FETCHER-SETUP.md"


def load_env():
    env = dict(os.environ)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip("'\"")
    return env


def fail(msg, code=1):
    print(f"❌ {msg}", file=sys.stderr)
    print(f"   Setup guide: {SETUP_GUIDE}", file=sys.stderr)
    sys.exit(code)


def reexec_in_venv():
    """Re-exec into the venv if available. See fetch-ga4.py for rationale."""
    venv_python = VENV_DIR / "bin" / "python3"
    if not venv_python.exists():
        return
    in_venv = sys.prefix != sys.base_prefix
    if in_venv and Path(sys.prefix).resolve() == VENV_DIR.resolve():
        return
    os.execv(str(venv_python), [str(venv_python), *sys.argv])


def query_sc(service, site_url, dimensions, start_date, end_date, row_limit=500):
    """Query Search Console Search Analytics API."""
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }
    return (
        service.searchanalytics()
        .query(siteUrl=site_url, body=body)
        .execute()
    )


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Fetch Search Console data")
    parser.add_argument("--days", type=int, default=28, help="How many days back (end today - 3 to account for SC lag)")
    args = parser.parse_args()

    reexec_in_venv()

    try:
        from googleapiclient.discovery import build
        from google.oauth2 import service_account
    except ImportError as e:
        fail(
            f"Missing Python library: {e.name}\n"
            f"   Install with:\n"
            f"     python3 -m venv {VENV_DIR}\n"
            f"     {VENV_DIR}/bin/pip install google-api-python-client google-auth\n"
            f"   See {SETUP_GUIDE}"
        )

    env = load_env()
    site_url = env.get("SC_SITE_URL", "").strip()
    if not site_url:
        fail(
            f"SC_SITE_URL not set in {ENV_FILE}\n"
            f"   Example: SC_SITE_URL='sc-domain:taiwan.md'\n"
            f"   or: SC_SITE_URL='https://taiwan.md/'"
        )

    cred_path = env.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if cred_path:
        cred_path = Path(cred_path).expanduser()
    elif SERVICE_ACCOUNT_FILE.exists():
        cred_path = SERVICE_ACCOUNT_FILE
    else:
        fail(f"Google service account key not found at {SERVICE_ACCOUNT_FILE}")

    if cred_path.resolve().is_relative_to(Path.cwd().resolve()):
        fail(f"SECURITY: service account key {cred_path} is inside the repo!")

    credentials = service_account.Credentials.from_service_account_file(
        str(cred_path),
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
    )

    service = build("searchconsole", "v1", credentials=credentials, cache_discovery=False)

    # SC has ~3 day lag, so end on "today - 3 days"
    end_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=args.days + 3)).strftime("%Y-%m-%d")

    print(f"🔎 Fetching Search Console ({site_url}, {start_date} → {end_date})...", file=sys.stderr)

    try:
        countries = query_sc(service, site_url, ["country"], start_date, end_date, row_limit=100)
        queries = query_sc(service, site_url, ["query"], start_date, end_date, row_limit=200)
        pages = query_sc(service, site_url, ["page"], start_date, end_date, row_limit=200)
        devices = query_sc(service, site_url, ["device"], start_date, end_date, row_limit=10)
    except Exception as e:
        fail(f"Search Console API error: {type(e).__name__}: {e}")

    def simplify(rows):
        return [
            {
                "keys": r.get("keys", []),
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": round(r.get("ctr", 0), 4),
                "position": round(r.get("position", 0), 2),
            }
            for r in rows.get("rows", [])
        ]

    total_clicks = sum(r.get("clicks", 0) for r in queries.get("rows", []))
    total_impressions = sum(r.get("impressions", 0) for r in queries.get("rows", []))

    output = {
        "fetched_at": datetime.now().isoformat(),
        "site_url": site_url,
        "period": {"start": start_date, "end": end_date, "days": args.days},
        "totals": {
            "clicks": total_clicks,
            "impressions": total_impressions,
            "ctr": round(total_clicks / total_impressions, 4) if total_impressions else 0,
        },
        "countries": simplify(countries),
        "queries": simplify(queries),
        "pages": simplify(pages),
        "devices": simplify(devices),
    }

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    latest_path = CACHE_DIR / "search-console-latest.json"
    dated_path = CACHE_DIR / f"search-console-{datetime.now().strftime('%Y-%m-%d')}.json"
    latest_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    dated_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    print(f"✅ SC: {total_clicks:,} clicks / {total_impressions:,} impressions ({args.days}d)", file=sys.stderr)
    print(f"   → {latest_path}", file=sys.stderr)

    # Find high-impression, low-CTR opportunities (Bamboo Drum metric)
    opportunities = [
        p
        for p in output["pages"]
        if p["impressions"] >= 20 and p["clicks"] == 0 and p["position"] <= 10
    ][:10]

    print(json.dumps({
        "source": "search-console",
        "period_days": args.days,
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "total_ctr_pct": round(total_clicks / total_impressions * 100, 2) if total_impressions else 0,
        "top_5_countries": [
            {
                "country": c["keys"][0],
                "clicks": c["clicks"],
                "impressions": c["impressions"],
                "ctr": round(c["ctr"] * 100, 2),
            }
            for c in output["countries"][:5]
        ],
        "high_impr_zero_click_opportunities": [
            {"page": p["keys"][0], "impressions": p["impressions"], "rank": p["position"]}
            for p in opportunities
        ],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
