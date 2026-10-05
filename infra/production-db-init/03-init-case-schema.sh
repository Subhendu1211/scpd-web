#!/bin/sh
set -eu

# The case-management schema is created by Prisma migrations at app startup.
# Lookup rows are inserted by backend/scripts/seedProductionLookups.mjs.
