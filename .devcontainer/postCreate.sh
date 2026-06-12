#!/usr/bin/env bash
# Post-create bootstrap for the wacrg research lab devcontainer.
# Installs Node dependencies and prints a friendly orientation message.
set -euo pipefail

echo "==> Installing Node dependencies (npm i)..."
npm i

cat <<'EOF'

  wacrg research lab is ready.

  WhatsApp Calls Research Group — reverse-engineering the 1:1 call protocol.

  Common tasks:
    npm run validate   # schema + referential integrity check of the corpus
    npm run generate   # regenerate docs/spec/** from the YAML corpus
    npm run coverage   # recompute COVERAGE.md and the coverage badge
    npm run build      # validate + generate + coverage (the full pipeline)
    npm run check      # build, then fail if generated artifacts drifted

  The corpus lives under spec/ and corpus/. Docs are generated into docs/.
  Happy speedrunning.

EOF
