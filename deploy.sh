#!/bin/bash
# =============================================================
#  DÉPLOIEMENT - pumpandkite.fr
#  Usage : bash deploy.sh
# =============================================================

set -e

# ─── CONFIG ──────────────────────────────────────────────────
VPS_IP="212.227.202.133"
VPS_USER="root"
REMOTE_DIR="/var/www/pumpandkite.fr"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Fichiers du site à envoyer (pas les fichiers SQL, scripts de setup, etc.)
SITE_FILES=(
    "index.html"
    "client.html"
    "reservation.html"
    "contact.html"
    "materiel.html"
    "meteo.html"
    "univers-foil.html"
    "univers-kite.html"
    "style.css"
    "script.js"
    "reservation.js"
)

echo ""
echo "============================================"
echo "  DÉPLOIEMENT PUMP & KITE"
echo "  → ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}"
echo "============================================"
echo ""

# ─── 1. VÉRIFICATION CONNEXION SSH ──────────────────────────
echo ">>> [1/3] Test de connexion SSH..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes ${VPS_USER}@${VPS_IP} "echo ok" > /dev/null 2>&1; then
    echo "❌ Impossible de se connecter en SSH à ${VPS_USER}@${VPS_IP}"
    echo "   Vérifie ta clé SSH et que le VPS est accessible."
    exit 1
fi
echo "    ✓ Connexion SSH OK"

# ─── 2. CRÉATION DU RÉPERTOIRE SI NÉCESSAIRE ────────────────
echo ">>> [2/3] Préparation du répertoire distant..."
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_DIR}/Image"
echo "    ✓ Répertoire prêt"

# ─── 3. ENVOI DES FICHIERS ──────────────────────────────────
echo ">>> [3/3] Envoi des fichiers..."

# Envoi des fichiers HTML/CSS/JS
for file in "${SITE_FILES[@]}"; do
    if [ -f "${SCRIPT_DIR}/${file}" ]; then
        scp -q "${SCRIPT_DIR}/${file}" ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/
        echo "    ✓ ${file}"
    else
        echo "    ⚠ ${file} non trouvé, ignoré"
    fi
done

# Envoi du dossier Image (avec rsync pour efficacité)
if [ -d "${SCRIPT_DIR}/Image" ]; then
    echo "    Envoi des images..."
    if command -v rsync &> /dev/null; then
        rsync -avz --progress "${SCRIPT_DIR}/Image/" ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/Image/
    else
        scp -r "${SCRIPT_DIR}/Image/"* ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/Image/
    fi
    echo "    ✓ Images envoyées"
fi

# ─── 4. PERMISSIONS ─────────────────────────────────────────
echo ""
echo ">>> Mise à jour des permissions..."
ssh ${VPS_USER}@${VPS_IP} "chown -R www-data:www-data ${REMOTE_DIR} && chmod -R 755 ${REMOTE_DIR}"
echo "    ✓ Permissions OK"

# ─── 5. RELOAD NGINX ────────────────────────────────────────
echo ""
echo ">>> Rechargement Nginx..."
ssh ${VPS_USER}@${VPS_IP} "nginx -t && systemctl reload nginx"
echo "    ✓ Nginx rechargé"

# ─── RÉSULTAT ────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ DÉPLOIEMENT TERMINÉ !"
echo "============================================"
echo ""
echo "  🌐 https://pumpandkite.fr"
echo "  🌐 https://www.pumpandkite.fr"
echo ""
echo "============================================"
