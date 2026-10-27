#!/usr/bin/env bash
# Builds main.pdf from main.tex (needs a TeX Live with IEEEtran, TikZ and BibTeX).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build main.tex
cp build/main.pdf main.pdf
echo "wrote paper/main.pdf"
