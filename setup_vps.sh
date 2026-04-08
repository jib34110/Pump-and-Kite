#!/bin/bash
# =============================================================
#  SETUP VPS - pumpandkite.fr
#  À exécuter sur le VPS en tant que root :
#  ssh root@212.227.202.133 "bash -s" < setup_vps.sh
# =============================================================

set -e  # Arrêt en cas d'erreur

echo ""
echo "============================================"
echo "  SETUP VPS PUMP & KITE"
echo "============================================"
echo ""

# ─── 1. MISE À JOUR SYSTÈME ───────────────────────────────────
echo ">>> [1/6] Mise à jour du système..."
apt-get update -y -q
apt-get upgrade -y -q
echo "    ✓ Système à jour"

# ─── 2. INSTALLATION NGINX ────────────────────────────────────
echo ">>> [2/6] Installation de nginx..."
apt-get install -y -q nginx
systemctl enable nginx
systemctl start nginx
echo "    ✓ nginx installé et démarré"

# ─── 3. CRÉATION DU RÉPERTOIRE DU SITE ───────────────────────
echo ">>> [3/6] Création du répertoire web..."
mkdir -p /var/www/pumpandkite.fr
chown -R www-data:www-data /var/www/pumpandkite.fr
chmod -R 755 /var/www/pumpandkite.fr
echo "    ✓ Répertoire /var/www/pumpandkite.fr créé"

# ─── 4. CONFIGURATION NGINX ───────────────────────────────────
echo ">>> [4/6] Configuration nginx..."

# Config pour pumpandkite.fr (site principal)
cat > /etc/nginx/sites-available/pumpandkite.fr << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name pumpandkite.fr www.pumpandkite.fr;

    root /var/www/pumpandkite.fr;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache des assets statiques
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Logs
    access_log /var/log/nginx/pumpandkite.access.log;
    error_log /var/log/nginx/pumpandkite.error.log;
}
EOF

# Config pour n8n.pumpandkite.fr (reverse proxy vers n8n)
cat > /etc/nginx/sites-available/n8n.pumpandkite.fr << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name n8n.pumpandkite.fr;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        client_max_body_size 50M;
    }

    access_log /var/log/nginx/n8n.access.log;
    error_log /var/log/nginx/n8n.error.log;
}
EOF

# Activation des sites
ln -sf /etc/nginx/sites-available/pumpandkite.fr /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/n8n.pumpandkite.fr /etc/nginx/sites-enabled/

# Suppression du site par défaut
rm -f /etc/nginx/sites-enabled/default

# Test de la configuration
nginx -t
systemctl reload nginx
echo "    ✓ nginx configuré pour pumpandkite.fr et n8n.pumpandkite.fr"

# ─── 5. INSTALLATION CERTBOT + SSL ────────────────────────────
echo ">>> [5/6] Installation de Certbot et SSL..."
apt-get install -y -q snapd
snap install --classic certbot 2>/dev/null || true
ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true

# Attente que les DNS soient propagés (check préalable)
echo "    Tentative d'obtention des certificats SSL..."
certbot --nginx \
    -d pumpandkite.fr \
    -d www.pumpandkite.fr \
    -d n8n.pumpandkite.fr \
    --non-interactive \
    --agree-tos \
    --email jbruiz33950@gmail.com \
    --redirect

echo "    ✓ SSL configuré avec Let's Encrypt"

# Renouvellement automatique
systemctl enable snap.certbot.renew.timer 2>/dev/null || true
echo "    ✓ Renouvellement automatique SSL activé"

# ─── 6. CONFIGURATION N8N ─────────────────────────────────────
echo ">>> [6/6] Configuration n8n..."

# Fichier de configuration n8n
N8N_CONF="/etc/n8n/config.json"
mkdir -p /etc/n8n

cat > "$N8N_CONF" << 'EOF'
{
  "host": "0.0.0.0",
  "port": 5678,
  "protocol": "https",
  "ssl": {
    "enabled": false
  },
  "webhook_url": "https://n8n.pumpandkite.fr/",
  "timezone": "Europe/Paris"
}
EOF

# Configuration des variables d'environnement n8n
cat > /etc/environment.d/n8n.conf << 'EOF' 2>/dev/null || \
cat >> /etc/environment << 'EOF2'
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.pumpandkite.fr/
GENERIC_TIMEZONE=Europe/Paris
N8N_BASIC_AUTH_ACTIVE=false
EOF2

# Créer / recharger le service n8n systemd s'il existe
if systemctl list-units --full -all | grep -q 'n8n'; then
    systemctl restart n8n 2>/dev/null || true
    systemctl enable n8n 2>/dev/null || true
    echo "    ✓ n8n redémarré"
else
    echo "    ⚠ Service n8n non trouvé — vérifiez l'installation n8n manuelle"
fi

# ─── RÉCAPITULATIF ────────────────────────────────────────────
echo ""
echo "============================================"
echo "  SETUP TERMINÉ !"
echo "============================================"
echo ""
echo "  Site web    : https://pumpandkite.fr"
echo "  n8n         : https://n8n.pumpandkite.fr"
echo "  Fichiers    : /var/www/pumpandkite.fr/"
echo ""
echo "  PROCHAINE ÉTAPE:"
echo "  Transférer client.html vers le VPS :"
echo "  scp client.html root@212.227.202.133:/var/www/pumpandkite.fr/"
echo ""
echo "============================================"
