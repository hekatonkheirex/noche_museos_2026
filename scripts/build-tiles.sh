#!/bin/sh
# Recorta Gran Asunción del build diario de Protomaps -> app/public/asuncion.pmtiles (~25 MB).
# Requiere el CLI: go install github.com/protomaps/go-pmtiles@latest  (binario: go-pmtiles)
# Uso: scripts/build-tiles.sh [AAAAMMDD]   (por defecto, ayer; los builds viejos se borran)
set -eu
D="${1:-$(date -d yesterday +%Y%m%d)}"
CLI="${PMTILES:-go-pmtiles}"
"$CLI" extract "https://build.protomaps.com/$D.pmtiles" "$(dirname "$0")/../app/public/asuncion.pmtiles" \
  --bbox=-57.75,-25.45,-57.30,-25.18 --maxzoom=15
