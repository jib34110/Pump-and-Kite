#!/usr/bin/env python3
# =============================================================
#  DÉPLOIEMENT COMPLET - pumpandkite.fr sur VPS Ionos
#  Usage : python deploy_vps.py
#  Prérequis : pip install paramiko
# =============================================================

import os
import sys
import paramiko
import stat
from pathlib import Path

# ─── CONFIGURATION ──────────────────────────────────────────
VPS_IP       = "212.227.202.133"
VPS_PORT     = 22
VPS_USER     = "root"
VPS_PASSWORD = "Ho1RDvH4ibSu"
REMOTE_DIR   = "/var/www/pumpandkite.fr"

# Fichiers du site à déployer
SITE_FILES = [
    "index.html",
    "client.html",
    "reservation.html",
    "contact.html",
    "materiel.html",
    "meteo.html",
    "univers-foil.html",
    "univers-kite.html",
    "style.css",
    "script.js",
    "reservation.js",
]

# Répertoire où se trouve ce script (= dossier du projet)
LOCAL_DIR = Path(__file__).parent

# ─── CONFIG NGINX PUMPANDKITE.FR ────────────────────────────
NGINX_PUMPANDKITE = """server {
    listen 80;
    listen [::]:80;
    server_name pumpandkite.fr www.pumpandkite.fr;

    root /var/www/pumpandkite.fr;
    index client.html index.html;

    location / {
        try_files $uri $uri/ /client.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    access_log /var/log/nginx/pumpandkite.access.log;
    error_log  /var/log/nginx/pumpandkite.error.log;
}
"""

# ─── HELPERS ────────────────────────────────────────────────
def run(client, cmd, show=True):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if show and out:
        print(f"      {out}")
    if show and err:
        print(f"      [stderr] {err}")
    return out, err

def section(title):
    print(f"\n{'='*50}")
    print(f"  {title}")
    print(f"{'='*50}")

def ok(msg):
    print(f"  ✅ {msg}")

def warn(msg):
    print(f"  ⚠️  {msg}")

def info(msg):
    print(f"  ℹ️  {msg}")

# ─── MAIN ───────────────────────────────────────────────────
def main():
    print()
    print("╔══════════════════════════════════════════════╗")
    print("║     DÉPLOIEMENT PUMP & KITE - VPS IONOS      ║")
    print("╚══════════════════════════════════════════════╝")
    print(f"  Cible : {VPS_USER}@{VPS_IP}:{REMOTE_DIR}")

    # ── 1. Connexion SSH ─────────────────────────────────────
    section("1/5 - Connexion SSH")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(VPS_IP, port=VPS_PORT, username=VPS_USER,
                       password=VPS_PASSWORD, timeout=15)
        ok("Connexion SSH établie")
    except Exception as e:
        print(f"  ❌ Impossible de se connecter : {e}")
        sys.exit(1)

    # ── 2. Installation / vérification Nginx ─────────────────
    section("2/5 - Vérification et configuration Nginx")

    out, _ = run(client, "which nginx 2>/dev/null || echo ''", show=False)
    if not out:
        info("Nginx non trouvé, installation en cours...")
        run(client, "apt-get update -q && apt-get install -y -q nginx")
        run(client, "systemctl enable nginx && systemctl start nginx")
        ok("Nginx installé et démarré")
    else:
        out2, _ = run(client, "systemctl is-active nginx", show=False)
        ok(f"Nginx déjà installé (état : {out2})")

    # Écriture config pumpandkite.fr
    sftp = client.open_sftp()
    nginx_conf_path = "/etc/nginx/sites-available/pumpandkite.fr"
    with sftp.open(nginx_conf_path, 'w') as f:
        f.write(NGINX_PUMPANDKITE)
    ok("Fichier de config Nginx écrit")

    # Activation du site
    run(client, "ln -sf /etc/nginx/sites-available/pumpandkite.fr "
                "/etc/nginx/sites-enabled/pumpandkite.fr")
    # Suppression du site par défaut si présent
    run(client, "rm -f /etc/nginx/sites-enabled/default", show=False)

    # Test config Nginx
    out, err = run(client, "nginx -t 2>&1", show=False)
    if "successful" in (out + err).lower() or "ok" in (out + err).lower():
        ok("Config Nginx valide")
    else:
        warn(f"Config Nginx : {out} {err}")

    run(client, "systemctl reload nginx")
    ok("Nginx rechargé")

    # ── 3. Création répertoire web ────────────────────────────
    section("3/5 - Préparation du répertoire web")
    run(client, f"mkdir -p {REMOTE_DIR}/Image")
    ok(f"Répertoire {REMOTE_DIR} prêt")

    # ── 4. Transfert des fichiers ─────────────────────────────
    section("4/5 - Transfert des fichiers du site")
    transferred = 0
    skipped = 0

    for filename in SITE_FILES:
        local_path = LOCAL_DIR / filename
        if local_path.exists():
            remote_path = f"{REMOTE_DIR}/{filename}"
            sftp.put(str(local_path), remote_path)
            print(f"  ✅ {filename}")
            transferred += 1
        else:
            print(f"  ⏭️  {filename} — non trouvé, ignoré")
            skipped += 1

    # Transfert du dossier Image
    image_dir = LOCAL_DIR / "Image"
    if image_dir.exists():
        info("Transfert des images...")
        for img in image_dir.iterdir():
            if img.is_file():
                sftp.put(str(img), f"{REMOTE_DIR}/Image/{img.name}")
                print(f"  ✅ Image/{img.name}")
                transferred += 1

    ok(f"{transferred} fichier(s) transféré(s), {skipped} ignoré(s)")

    # ── 5. Permissions + vérification finale ──────────────────
    section("5/5 - Permissions et vérification finale")
    run(client, f"chown -R www-data:www-data {REMOTE_DIR} && "
                f"chmod -R 755 {REMOTE_DIR}")
    ok("Permissions appliquées")

    # Lister les fichiers déployés
    out, _ = run(client, f"ls {REMOTE_DIR}/", show=False)
    info(f"Fichiers sur le VPS : {out.replace(chr(10), ', ')}")

    # Vérifier SSL
    out, _ = run(client, "certbot certificates 2>/dev/null | grep -E 'Domains:|VALID' || echo 'SSL non configuré'", show=False)
    if "pumpandkite" in out:
        ok(f"SSL : {out}")
    else:
        warn("SSL non encore configuré — lance 'certbot --nginx -d pumpandkite.fr -d www.pumpandkite.fr' depuis le VPS")

    sftp.close()
    client.close()

    # ── Résultat ──────────────────────────────────────────────
    print()
    print("╔══════════════════════════════════════════════╗")
    print("║          ✅  DÉPLOIEMENT TERMINÉ !            ║")
    print("╠══════════════════════════════════════════════╣")
    print("║  🌐 http://pumpandkite.fr                    ║")
    print("║  🌐 http://www.pumpandkite.fr                ║")
    print("╚══════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    main()
