#!/usr/bin/env python3
"""
fetch-cloudflare.py — 抓 Cloudflare Analytics 資料（Free tier 友善）

用法:
    python3 scripts/tools/fetch-cloudflare.py [--days 1]

憑證來源（優先序）:
    1. ~/.config/taiwan-md/credentials/.env 裡的 CF_API_TOKEN, CF_ZONE_ID
    2. 環境變數 CF_API_TOKEN, CF_ZONE_ID

Token 需要的權限:
    - Account → Account Analytics → Read
    - Zone → Analytics → Read  （內部名稱 account.zone.analytics.read）
    - Zone Resources: Specific zone = taiwan.md

輸出:
    ~/.config/taiwan-md/cache/cloudflare-latest.json
    ~/.config/taiwan-md/cache/cloudflare-{YYYY-MM-DD}.json

這個版本（v2, 2026-04-11）:
    - 改用 httpRequests1dGroups（Free tier 可用）
    - 不使用 botManagementVerifiedBot filter（Enterprise only）
    - 抓：總請求/獨立訪客/威脅/國家/status/browser 分佈
    - 純 Python stdlib，零依賴

來源: 2026-04-11 session α 建造
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

CONFIG_DIR = Path.home() / ".config" / "taiwan-md"
CREDENTIALS_DIR = CONFIG_DIR / "credentials"
CACHE_DIR = CONFIG_DIR / "cache"
ENV_FILE = CREDENTIALS_DIR / ".env"
SETUP_GUIDE = "docs/pipelines/SENSE-FETCHER-SETUP.md"


def load_env():
    """Load env vars from ~/.config/taiwan-md/credentials/.env"""
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


def cf_graphql(token, query, variables=None):
    """Send GraphQL query to Cloudflare Analytics API."""
    url = "https://api.cloudflare.com/client/v4/graphql"
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_str = e.read().decode("utf-8", errors="replace")
        fail(f"Cloudflare API HTTP {e.code}: {body_str[:400]}")
    except urllib.error.URLError as e:
        fail(f"Cloudflare API unreachable: {e.reason}")

    if data.get("errors"):
        fail(f"Cloudflare GraphQL errors: {json.dumps(data['errors'], ensure_ascii=False)[:500]}")
    return data.get("data", {})


def fetch_daily_traffic(token, zone_tag, days=1):
    """
    Fetch basic daily analytics via httpRequests1dGroups.

    This dataset is available on Free tier and provides:
    - Total requests, page views, threats, bytes
    - Country breakdown
    - Response status breakdown
    - Content type breakdown
    - Browser family breakdown
    - Unique visitors
    """
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)

    query = """
    query DailyTraffic($zoneTag: String!, $start: String!, $end: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(
            filter: { date_geq: $start, date_leq: $end }
            limit: 31
            orderBy: [date_DESC]
          ) {
            dimensions { date }
            sum {
              requests
              pageViews
              cachedRequests
              threats
              bytes
              countryMap {
                clientCountryName
                requests
                threats
                bytes
              }
              responseStatusMap {
                edgeResponseStatus
                requests
              }
              contentTypeMap {
                edgeResponseContentTypeName
                requests
                bytes
              }
              browserMap {
                uaBrowserFamily
                pageViews
              }
            }
            uniq { uniques }
          }
        }
      }
    }
    """
    variables = {
        "zoneTag": zone_tag,
        "start": start.strftime("%Y-%m-%d"),
        "end": end.strftime("%Y-%m-%d"),
    }
    return cf_graphql(token, query, variables), start, end


def aggregate(days_data):
    """Aggregate multi-day data into totals + breakdowns."""
    total = {
        "requests": 0,
        "pageViews": 0,
        "cachedRequests": 0,
        "threats": 0,
        "bytes": 0,
        "uniques": 0,
    }
    countries = {}  # country → {requests, threats}
    statuses = {}  # status → requests
    content_types = {}  # content-type → requests
    browsers = {}  # browser → pageViews

    for day in days_data:
        s = day.get("sum", {})
        total["requests"] += s.get("requests", 0) or 0
        total["pageViews"] += s.get("pageViews", 0) or 0
        total["cachedRequests"] += s.get("cachedRequests", 0) or 0
        total["threats"] += s.get("threats", 0) or 0
        total["bytes"] += s.get("bytes", 0) or 0
        total["uniques"] += day.get("uniq", {}).get("uniques", 0) or 0

        for c in s.get("countryMap", []) or []:
            name = c.get("clientCountryName", "Unknown")
            if name not in countries:
                countries[name] = {"requests": 0, "threats": 0, "bytes": 0}
            countries[name]["requests"] += c.get("requests", 0) or 0
            countries[name]["threats"] += c.get("threats", 0) or 0
            countries[name]["bytes"] += c.get("bytes", 0) or 0

        for r in s.get("responseStatusMap", []) or []:
            code = str(r.get("edgeResponseStatus", "unknown"))
            statuses[code] = statuses.get(code, 0) + (r.get("requests", 0) or 0)

        for ct in s.get("contentTypeMap", []) or []:
            name = ct.get("edgeResponseContentTypeName", "unknown") or "unknown"
            if name not in content_types:
                content_types[name] = {"requests": 0, "bytes": 0}
            content_types[name]["requests"] += ct.get("requests", 0) or 0
            content_types[name]["bytes"] += ct.get("bytes", 0) or 0

        for b in s.get("browserMap", []) or []:
            name = b.get("uaBrowserFamily", "unknown") or "unknown"
            browsers[name] = browsers.get(name, 0) + (b.get("pageViews", 0) or 0)

    # Sort
    top_countries = dict(
        sorted(countries.items(), key=lambda x: x[1]["requests"], reverse=True)[:30]
    )
    top_statuses = dict(sorted(statuses.items(), key=lambda x: x[1], reverse=True))
    top_content = dict(
        sorted(content_types.items(), key=lambda x: x[1]["requests"], reverse=True)[:20]
    )
    top_browsers = dict(sorted(browsers.items(), key=lambda x: x[1], reverse=True)[:20])

    return total, top_countries, top_statuses, top_content, top_browsers


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Fetch Cloudflare analytics (Free tier friendly)")
    parser.add_argument("--days", type=int, default=1, help="How many days back to fetch (default 1)")
    args = parser.parse_args()

    env = load_env()
    token = env.get("CF_API_TOKEN", "").strip()
    zone_tag = env.get("CF_ZONE_ID", "").strip()

    if not token or not zone_tag:
        fail(
            f"CF_API_TOKEN or CF_ZONE_ID not set.\n"
            f"   Expected in {ENV_FILE} or environment.\n"
            f"   See {SETUP_GUIDE} for how to create the token."
        )

    # Guard rail: refuse if env file is inside the repo
    try:
        if ENV_FILE.resolve().is_relative_to(Path.cwd().resolve()):
            fail(
                "SECURITY: credentials .env file is inside the repo! "
                "Move it to ~/.config/taiwan-md/credentials/.env"
            )
    except AttributeError:
        # Python < 3.9 doesn't have is_relative_to
        env_str = str(ENV_FILE.resolve())
        cwd_str = str(Path.cwd().resolve())
        if env_str.startswith(cwd_str):
            fail("SECURITY: .env is inside the repo")

    print(f"📡 Fetching Cloudflare daily analytics ({args.days}d)...", file=sys.stderr)
    data, start, end = fetch_daily_traffic(token, zone_tag, args.days)

    zones = data.get("viewer", {}).get("zones", [])
    if not zones:
        fail("No zone data returned — check CF_ZONE_ID or token permissions")

    days_data = zones[0].get("httpRequests1dGroups", [])
    if not days_data:
        print(
            f"⚠️  No traffic data for {start} → {end}. Cloudflare may need a few hours to aggregate.",
            file=sys.stderr,
        )
        days_data = []

    total, top_countries, top_statuses, top_content, top_browsers = aggregate(days_data)

    output = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "zone_id": zone_tag[:8] + "..." + zone_tag[-4:],  # redacted for caching
        "period": {
            "start": start.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
            "days": args.days,
        },
        "daily_breakdown": [
            {
                "date": d.get("dimensions", {}).get("date"),
                "requests": (d.get("sum") or {}).get("requests", 0),
                "pageViews": (d.get("sum") or {}).get("pageViews", 0),
                "cachedRequests": (d.get("sum") or {}).get("cachedRequests", 0),
                "threats": (d.get("sum") or {}).get("threats", 0),
                "bytes": (d.get("sum") or {}).get("bytes", 0),
                "uniques": (d.get("uniq") or {}).get("uniques", 0),
            }
            for d in days_data
        ],
        "summary": total,
        "top_countries": top_countries,
        "status_breakdown": top_statuses,
        "content_types": top_content,
        "browser_families": top_browsers,
        "note": (
            "Free-tier dataset. For crawler/bot breakdown (Meta, OpenAI, etc.), "
            "Cloudflare requires Bot Management (paid add-on). This fetcher uses "
            "httpRequests1dGroups which works on all plans."
        ),
    }

    # Write to cache
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    latest_path = CACHE_DIR / "cloudflare-latest.json"
    dated_path = CACHE_DIR / f"cloudflare-{today}.json"

    latest_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    dated_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    print(
        f"✅ Cloudflare: {total['requests']:,} requests / {total['uniques']:,} uniques "
        f"/ {total['threats']} threats",
        file=sys.stderr,
    )
    print(f"   → {latest_path}", file=sys.stderr)

    # Print summary JSON to stdout
    print(
        json.dumps(
            {
                "source": "cloudflare",
                "period_days": args.days,
                "total_requests": total["requests"],
                "total_page_views": total["pageViews"],
                "unique_visitors": total["uniques"],
                "threats": total["threats"],
                "top_5_countries": dict(list(top_countries.items())[:5]),
                "top_status_codes": dict(list(top_statuses.items())[:5]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
