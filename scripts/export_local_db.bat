@echo off
REM ==============================================================================
REM Script para exportar la base de datos PostgreSQL local en Windows
REM Usa Node.js para evitar bloqueos de politicas de seguridad (Device Guard)
REM ==============================================================================
setlocal

echo [1/2] Verificando entorno Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    echo Asegurate de tener Node instalado.
    pause
    exit /b 1
)

echo [2/2] Exportando base de datos a traves de Node.js...
node "%~dp0export_db_node.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un error al exportar la base de datos.
    pause
    exit /b 1
)

echo.
pause
