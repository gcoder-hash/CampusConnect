#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env. Open it and set a private JWT_SECRET, then run this file again."
  open -e backend/.env
  exit 0
fi
npm run dev
