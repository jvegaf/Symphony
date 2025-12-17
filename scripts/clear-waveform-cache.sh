#!/bin/bash
# Script para limpiar el cache de waveforms
# AIDEV-NOTE: Usar después de cambiar WAVEFORM_WINDOW_SIZE u otros parámetros

set -e

DB_PATH="${HOME}/.local/share/symphony/symphony.db"

echo "🧹 Limpiando cache de waveforms..."
echo "   DB: ${DB_PATH}"

if [ ! -f "${DB_PATH}" ]; then
    echo "❌ Error: Base de datos no encontrada en ${DB_PATH}"
    exit 1
fi

# Contar waveforms antes de limpiar
BEFORE=$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM waveforms;")
echo "   Waveforms antes: ${BEFORE}"

# Limpiar
sqlite3 "${DB_PATH}" "DELETE FROM waveforms;"
echo "✅ Cache limpiado"

# Verificar
AFTER=$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM waveforms;")
echo "   Waveforms después: ${AFTER}"

# Vacuum para recuperar espacio
echo "🗜️  Compactando base de datos..."
sqlite3 "${DB_PATH}" "VACUUM;"
echo "✅ Listo!"
