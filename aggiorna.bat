@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Fanta Breccia - aggiorna il sito

echo ===============================================
echo   FANTA BRECCIA - aggiornamento del sito
echo ===============================================
echo.

rem --- 1. Trova Python -------------------------------------------------
set "PY="
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
if not defined PY (
  py -3 --version >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
  python --version >nul 2>&1 && set "PY=python"
)
if not defined PY (
  echo [ERRORE] Python non trovato.
  echo.
  echo Ricrea l'ambiente con questi due comandi:
  echo     py -3 -m venv .venv
  echo     .venv\Scripts\python.exe -m pip install openpyxl
  goto :fine
)

rem --- 2. L'Excel deve esserci ed essere chiuso ------------------------
if not exist "dati\Gestione.xlsx" (
  echo [ERRORE] Non trovo dati\Gestione.xlsx
  goto :fine
)
if exist "dati\~$Gestione.xlsx" (
  echo [ATTENZIONE] Gestione.xlsx risulta aperto in Excel.
  echo Chiudilo ^(salvando^) e rilancia: altrimenti le ultime modifiche
  echo non verrebbero lette.
  goto :fine
)

rem --- 3. Rigenera i dati del sito -------------------------------------
echo [1/4] Leggo l'Excel e rigenero i dati del sito...
echo.
%PY% strumenti\genera_dati.py
if errorlevel 1 (
  echo.
  echo [ERRORE] La generazione dei dati e' fallita. Non pubblico nulla.
  goto :fine
)

rem --- 4. C'e' qualcosa da pubblicare? ---------------------------------
echo.
echo [2/4] Controllo cosa e' cambiato...
echo.
git add -A
git diff --cached --stat
if errorlevel 1 (
  echo [ERRORE] Git non risponde. Sei nella cartella giusta?
  goto :fine
)

git diff --cached --quiet
if not errorlevel 1 (
  echo Nessuna modifica: il sito e' gia' aggiornato.
  goto :fine
)

rem --- 5. Conferma ------------------------------------------------------
echo.
echo -----------------------------------------------
echo   Controlla gli avvisi qui sopra.
echo   Se qualcosa non torna, rispondi N e correggi
echo   l'Excel prima di pubblicare.
echo -----------------------------------------------
echo.
set /p RISPOSTA="Pubblico online? (S/N) "
if /i not "!RISPOSTA!"=="S" (
  echo.
  echo Annullato. Le modifiche restano sul tuo computer, non pubblicate.
  echo Per annullare anche quelle:  git reset
  goto :fine
)

rem --- 6. Commit e push -------------------------------------------------
echo.
echo [3/4] Salvo le modifiche...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "OGGI=%%a/%%b/%%c"
git commit -q -m "Aggiornamento dati del %OGGI%"
if errorlevel 1 (
  echo [ERRORE] Il salvataggio e' fallito.
  goto :fine
)

echo [4/4] Pubblico su GitHub...
git push
if errorlevel 1 (
  echo.
  echo [ERRORE] La pubblicazione e' fallita.
  echo Le modifiche sono salvate in locale: riprova con  git push
  goto :fine
)

echo.
echo ===============================================
echo   FATTO. Il sito sara' aggiornato tra 1-2 minuti:
echo   https://francescomindoli.github.io/FantaBreccia/
echo ===============================================

:fine
echo.
pause
endlocal
