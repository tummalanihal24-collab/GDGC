#!/bin/bash
# Builds the deck, validates it, renders PNGs and contact sheets into /tmp
cd "$(dirname "$0")"
SK=/root/.claude/skills/synced/02812373-138d-4a58-874b-33e46fa50871_be6bfb8c-6762-4ee8-8d34-26939a1b2495/pptx
NODE_PATH=$PWD/node_modules node build.js 2>&1 | grep -v Picked
python3 $SK/scripts/office/validate.py Payroll-Management-System.pptx 2>&1 | tail -3
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf Payroll-Management-System.pptx >/dev/null 2>&1
rm -f slide-*.jpg; pdftoppm -jpeg -r 110 Payroll-Management-System.pdf slide
