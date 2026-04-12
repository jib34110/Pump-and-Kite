# =============================================================
#  DÉPLOIEMENT - pumpandkite.fr
#  Usage : clic droit > "Exécuter avec PowerShell"
#  Ou dans PowerShell : .\deploy.ps1
# =============================================================

$VPS_IP = "212.227.202.133"
$VPS_USER = "root"
$REMOTE_DIR = "/var/www/pumpandkite.fr"
$LOCAL_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Fichiers du site
$SITE_FILES = @(
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
    "reservation.js"
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DEPLOIEMENT PUMP & KITE" -ForegroundColor Cyan
Write-Host "  -> ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Test connexion SSH ---
Write-Host ">>> [1/4] Test de connexion SSH..." -ForegroundColor Yellow
try {
    ssh -o ConnectTimeout=5 -o BatchMode=yes "${VPS_USER}@${VPS_IP}" "echo ok" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "SSH failed" }
    Write-Host "    OK - Connexion SSH reussie" -ForegroundColor Green
} catch {
    Write-Host "    ERREUR - Impossible de se connecter en SSH a ${VPS_USER}@${VPS_IP}" -ForegroundColor Red
    Write-Host "    Verifie ta cle SSH et que le VPS est accessible." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

# --- 2. Création du répertoire distant ---
Write-Host ">>> [2/4] Preparation du repertoire distant..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p ${REMOTE_DIR}/Image"
Write-Host "    OK - Repertoire pret" -ForegroundColor Green

# --- 3. Envoi des fichiers HTML/CSS/JS ---
Write-Host ">>> [3/4] Envoi des fichiers du site..." -ForegroundColor Yellow

foreach ($file in $SITE_FILES) {
    $localPath = Join-Path $LOCAL_DIR $file
    if (Test-Path $localPath) {
        scp -q "$localPath" "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/"
        Write-Host "    OK - $file" -ForegroundColor Green
    } else {
        Write-Host "    SKIP - $file non trouve" -ForegroundColor DarkYellow
    }
}

# Envoi du dossier Image
$imagePath = Join-Path $LOCAL_DIR "Image"
if (Test-Path $imagePath) {
    Write-Host "    Envoi des images..." -ForegroundColor Yellow
    $images = Get-ChildItem -Path $imagePath -File
    foreach ($img in $images) {
        scp -q "$($img.FullName)" "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/Image/"
        Write-Host "    OK - Image/$($img.Name)" -ForegroundColor Green
    }
}

# --- 4. Permissions + reload Nginx ---
Write-Host ">>> [4/4] Permissions et rechargement Nginx..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "chown -R www-data:www-data ${REMOTE_DIR} && chmod -R 755 ${REMOTE_DIR} && nginx -t && systemctl reload nginx"
Write-Host "    OK - Nginx recharge" -ForegroundColor Green

# --- Résultat ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DEPLOIEMENT TERMINE !" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  https://pumpandkite.fr" -ForegroundColor White
Write-Host "  https://www.pumpandkite.fr" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Green

Read-Host "Appuie sur Entree pour fermer"
