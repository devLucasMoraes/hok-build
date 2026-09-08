#!/usr/bin/env bash
# Refresh semanal dos itens (fonte: camp.honorofkings.com via espelho hokstats.gg).
#
#  SETUP (uma vez, na VPS Hostinger):
#    1. git clone <repo> /opt/hok-build-refresh && cd /opt/hok-build-refresh
#    2. Autenticação de push (escolha uma):
#         git remote set-url origin "https://<PAT-contents:write>@github.com/devLucasMoraes/hok-build.git"
#       ou configure credential helper com o PAT.
#    3. Dokploy > Project > Schedules > New:
#         schedule_type = server, cron = "0 4 * * 0", timezone = America/Sao_Paulo
#         command = /opt/hok-build-refresh/scripts/weekly-items-refresh.sh
#       (O botão "run" do Schedule serve para teste manual.)
#    4. No app Dokploy, confirme auto-deploy on push ativo: o push deste script
#       dispara o rebuild/redeploy sozinho.
#
#  COMPORTAMENTO:
#    - sem diff nos itens      -> sai 0 sem commit/push (semanas sem mudança)
#    - warning/erro do fetcher -> sai 1 sem commit (revisão manual via log do Schedule)
#    - build vermelho          -> sai 1 sem commit
#    - com diff + build verde  -> commit direto na main + push (+ tag items-backup-<PATCH>)
#
#  ENV opcionais: BRANCH (default main), WEBHOOK_URL (POST JSON com resumo), FETCH_ARGS (extras p/ o fetcher).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-main}"
PATCH="$(date -u +%F)"
LOG_PREFIX="[items-refresh $PATCH]"

log() { echo "$LOG_PREFIX $*"; }
notify() { # notify "texto"
  if [[ -n "${WEBHOOK_URL:-}" ]]; then
    curl -sS -m 15 -X POST -H 'Content-Type: application/json' \
      --data "{\"text\":\"$1\"}" "$WEBHOOK_URL" >/dev/null || true
  fi
}

cd "$REPO_DIR"
git checkout "$BRANCH" --quiet
git fetch origin "$BRANCH" >/dev/null 2>&1 || true
git pull --ff-only origin "$BRANCH"

# --- 1. captura ---
if ! node scripts/fetch-items-from-camp.mjs --patch="$PATCH" --rewire ${FETCH_ARGS:-}; then
  log "ERRO: fetcher falhou (ver avisos acima). Nada foi commitado."
  notify "$LOG_PREFIX fetcher falhou; revisão manual necessária."
  exit 1
fi

# --- 2. houve mudança real? (diff vazio => só manifest/dir novo => desfaz e sai) ---
DIFF_FILE="data/patches/$PATCH/items.diff.json"
EMPTY_DIFF="$(node -e "
const d=require('./$DIFF_FILE');
console.log((d.added.length+d.removed.length+d.changed.length)===0?'yes':'no');
")"
if [[ "$EMPTY_DIFF" == "yes" ]]; then
  log "sem mudanças nos itens. Desfazendo snapshot vazio."
  git checkout -- data/patches/manifest.json lib/data/generated.ts 2>/dev/null || true
  if git status --porcelain "data/patches/$PATCH/" | grep -q '^??'; then
    rm -rf "data/patches/$PATCH"
  fi
  exit 0
fi

SUMMARY="$(node -e "
const d=require('./$DIFF_FILE');
console.log(\`+\${d.added.length} -\${d.removed.length} ~\${d.changed.length}\`);
")"
log "diff: $SUMMARY"

# --- 3. gate: build precisa passar antes do commit ---
if ! (pnpm install --prefer-offline --silent && pnpm build); then
  log "ERRO: pnpm build falhou. Desfazendo snapshot para não poluir a main."
  git checkout -- data/patches/manifest.json lib/data/generated.ts 2>/dev/null || true
  if git status --porcelain "data/patches/$PATCH/" | grep -q '^??'; then
    rm -rf "data/patches/$PATCH"
  fi
  notify "$LOG_PREFIX build falhou após captura ($SUMMARY); revisão manual necessária."
  exit 1
fi

# --- 4. commit direto + tag + push (Dokploy faz redeploy no push) ---
git add data/patches/"$PATCH" data/patches/manifest.json lib/data/generated.ts public/items
git -c user.name="hok-items-bot" -c user.email="hok-items-bot@local" \
  commit -m "chore(items): snapshot $PATCH ($SUMMARY)" --quiet
git tag "items-backup-$PATCH" || true
git push origin "$BRANCH"
git push origin "items-backup-$PATCH" 2>/dev/null || true

log "publicado $PATCH ($SUMMARY). Dokploy fará redeploy via auto-deploy."
notify "$LOG_PREFIX publicado $PATCH ($SUMMARY)."
