#!/usr/bin/env bash
# Run one GraphQL query against CJ.
#   CJ_PAT must be in the environment. It is a SECRET:
#   never commit it, never put it in any file under css/ or js/,
#   never let it reach the browser. It lives here only.
#
#   usage: CJ_PAT=... scripts/cj-query.sh 'query { ... }'
set -euo pipefail
: "${CJ_PAT:?CJ_PAT is not set}"
ENDPOINT="${CJ_ENDPOINT:-https://ads.api.cj.com/query}"
QUERY="$1"
python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$QUERY" > /tmp/cj-body.json
curl -sS --max-time 60 "$ENDPOINT" \
  -H "Authorization: Bearer ${CJ_PAT}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/cj-body.json
rm -f /tmp/cj-body.json
