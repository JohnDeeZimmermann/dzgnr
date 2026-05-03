#!/usr/bin/env sh
set -e

here="$(cd "$(dirname "$0")" && pwd)"

echo "=== business-card ==="
cd "$here/business-card" && dzgnr render index.html --config dzgnr.json
echo

echo "=== event-flyer ==="
cd "$here/event-flyer" && dzgnr render index.html --config dzgnr.json
echo

echo "=== wide-banner ==="
cd "$here/wide-banner" && dzgnr render index.html --config dzgnr.json
echo

echo "=== two-page-card ==="
cd "$here/two-page-card" && dzgnr render front.html --config dzgnr.json
echo

echo "All examples rendered."
