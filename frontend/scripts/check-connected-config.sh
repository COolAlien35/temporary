#!/bin/sh
set -eu

if [ "${REQUIRE_CONNECTED_CONFIG:-0}" != 1 ]; then
  exit 0
fi

case "${NEXT_PUBLIC_SUPABASE_URL:-}" in
  https://?*) ;;
  *) echo 'NEXT_PUBLIC_SUPABASE_URL must be an HTTPS URL for a connected build' >&2; exit 1 ;;
esac

if [ -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  echo 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for a connected build' >&2
  exit 1
fi

case "${NEXT_PUBLIC_QUANTUMLOOP_API_URL:-}" in
  https://?*) ;;
  *) echo 'NEXT_PUBLIC_QUANTUMLOOP_API_URL must be an HTTPS URL for a connected build' >&2; exit 1 ;;
esac
