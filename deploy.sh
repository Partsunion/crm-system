#!/usr/bin/env bash
# ============================================================================
# CRM-System Deploy → crm.partsunion.de
#
# 1) rsync den Quellcode auf den Server (/opt/partsunion-src/CRM-System)
# 2) crm-system-Container in der Compose-Chain neu bauen + hochfahren
#
# Der Docker-Build (CRM-System/Dockerfile) führt npm install + vite build mit
# VITE_API_BASE_URL=https://api.partsunion.de aus — lokal nichts vorzubauen.
#
# Nutzung:
#   ./deploy.sh partsunion               # SSH-Alias aus ~/.ssh/config
#   ./deploy.sh root@94.237.98.26        # oder Host direkt
# ============================================================================
set -euo pipefail

SERVER="${1:?Usage: ./deploy.sh user@server}"
SRC="$(cd "$(dirname "$0")" && pwd)/"
DEST="/opt/partsunion-src/CRM-System/"
CTL_DIR="/opt/partsunion-ai"
CHAIN="-f docker-compose.yml -f docker-compose.cpu.yml -f production-stack/docker-compose.full.yml --env-file secrets/.env.production"

echo "▸ 1/4  rsync  ${SRC} → ${SERVER}:${DEST}"
# node_modules/dist/.git ausgeschlossen; --delete hält den Build-Context sauber
# (verhindert, dass COPY . . im Dockerfile einen veralteten node_modules zieht).
# dist-probe/ sind die Bildproben aus src/test/redesignAbbild.test.tsx: ein paar
# hundert Kilobyte HTML samt Schriftkopien, die auf dem Server nichts zu suchen
# haben.
rsync -az --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude dist-probe \
  --exclude .git \
  --exclude '*.log' \
  "${SRC}" "${SERVER}:${DEST}"

# ---------------------------------------------------------------------------
# Sperrdatei prüfen, BEVOR das Image gebaut wird.
#
# Anlass: der Docker-Build nutzt node:22-alpine (npm 10.9), lokal läuft hier
# npm 11. Die beiden lösen Abhängigkeiten unterschiedlich auf. Im
# Admin-Dashboard hat ein `npm install` mit npm 11 512 Zeilen aus der
# Sperrdatei entfernt; npm 11 fand das in Ordnung, `npm ci --dry-run` lokal
# ebenfalls — npm 10 im Build brach danach mit EUSAGE ab.
#
# Lokal ist der Fehler also NICHT zu sehen. Deshalb wird hier mit derselben
# npm-Version geprüft, die auch baut.
#
# Wenn es hier klemmt: die Sperrdatei mit node 22 neu erzeugen, nicht lokal.
#   docker run --rm -v "$PWD:/w" -w /w node:22-alpine npm install --package-lock-only
# ---------------------------------------------------------------------------
echo "▸ 2/4  package-lock.json gegen npm 10 prüfen (dieselbe Version wie im Build)"
ssh "${SERVER}" "set -e
  rm -rf /tmp/crmlockcheck && mkdir -p /tmp/crmlockcheck
  cp ${DEST}package.json ${DEST}package-lock.json /tmp/crmlockcheck/
  docker run --rm -v /tmp/crmlockcheck:/w -w /w node:22-alpine \
    npm ci --dry-run --no-audit --no-fund --no-progress >/tmp/crmlockcheck/out 2>&1 || {
      echo '  ✗ package-lock.json passt nicht zu package.json (npm 10):'
      grep -m8 'npm error' /tmp/crmlockcheck/out | sed 's/^/    /'
      echo '    → neu erzeugen mit:'
      echo '      docker run --rm -v \"\$PWD:/w\" -w /w node:22-alpine npm install --package-lock-only'
      rm -rf /tmp/crmlockcheck
      exit 1
    }
  rm -rf /tmp/crmlockcheck
  echo '  ✓ Sperrdatei ist gültig'"

echo "▸ 3/4  rebuild crm-system auf ${SERVER}"
ssh "${SERVER}" "cd ${CTL_DIR} && docker compose ${CHAIN} build crm-system && docker compose ${CHAIN} up -d crm-system"

echo "▸ 4/4  Status"
ssh "${SERVER}" "docker ps --filter name=crm-system --format '  {{.Names}}  {{.Status}}'"

echo "✓ fertig — prüfe https://crm.partsunion.de (ggf. Hard-Reload / Cache leeren)"
