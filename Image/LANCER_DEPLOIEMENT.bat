@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════╗
echo ║     DEPLOIEMENT PUMP ^& KITE - VPS IONOS      ║
echo ╚══════════════════════════════════════════════╝
echo.

:: Vérifier Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Python n'est pas installe.
    echo  Telechargez Python sur https://python.org
    pause
    exit /b 1
)

echo  [OK] Python trouve
echo.

:: Installer paramiko si absent
echo  Installation des dependances...
python -m pip install paramiko --quiet 2>nul
if errorlevel 1 (
    python -m pip install paramiko
)
echo  [OK] Dependances OK
echo.

:: Lancer le deploiement
echo  Lancement du deploiement...
echo.
cd /d "%~dp0"
python deploy_vps.py

echo.
pause
