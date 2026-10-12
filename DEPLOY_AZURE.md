# 🚀 Guía Completa de Despliegue en Azure Virtual Machine con Docker

Esta guía explica paso a paso cómo desplegar la aplicación completa (**PostgreSQL**, **Backend Express/Prisma** y **Frontend Angular/Nginx**) en una máquina virtual de **Microsoft Azure** utilizando **Docker Compose**.

---

## 📑 Índice
1. [Arquitectura y Puertos](#1-arquitectura-y-puertos)
2. [Paso 1: Crear la Máquina Virtual en Azure](#paso-1-crear-la-máquina-virtual-en-azure)
3. [Paso 2: Configurar Reglas de Red (NSG) en Azure](#paso-2-configurar-reglas-de-red-nsg-en-azure)
4. [Paso 3: Conexión e Instalación de Docker en la VM](#paso-3-conexión-e-instalación-de-docker-en-la-vm)
5. [Paso 4: Exportar la Base de Datos Local](#paso-4-exportar-la-base-de-datos-local)
6. [Paso 5: Subir el Proyecto y Backup a la VM](#paso-5-subir-el-proyecto-y-backup-a-la-vm)
7. [Paso 6: Iniciar los Contenedores](#paso-6-iniciar-los-contenedores)
8. [Paso 7: Restaurar los Datos en PostgreSQL](#paso-7-restaurar-los-datos-en-postgresql)
9. [Comandos Útiles de Mantenimiento](#comandos-útiles-de-mantenimiento)

---

## 1. Arquitectura y Puertos

Toda la aplicación se ejecuta dentro de 3 contenedores aislados:
- **`campo_frontend`**: Nginx sirve el frontend compilado y actúa de proxy inverso en el puerto `80`.
- **`campo_backend`**: Node.js 20 con Express y Prisma en el puerto interno `3000`.
- **`campo_db`**: PostgreSQL 16 en el puerto interno `5432` con volumen persistente `postgres_data`.

> **Seguridad**: Solo el puerto **80** (HTTP) y el puerto **22** (SSH) necesitan estar abiertos en Azure. Ni PostgreSQL ni el Backend quedan expuestos directamente a internet.

---

## Paso 1: Crear la Máquina Virtual en Azure

1. Ingresa al [Portal de Azure](https://portal.azure.com).
2. Ve a **Virtual Machines** -> **Crear** -> **Máquina virtual de Azure**.
3. Configuración recomendada:
   - **Suscripción y Grupo de recursos**: Elige tu grupo existente o crea uno nuevo (ej. `rg-campo`).
   - **Nombre de máquina virtual**: `vm-campo-prod`
   - **Región**: La más cercana a tus usuarios (ej. `East US 2`, `Brazil South`, etc.).
   - **Imagen**: **Ubuntu Server 22.04 LTS - x64 Gen2** o **Ubuntu Server 24.04 LTS**.
   - **Tamaño**: `Standard_B2s` (2 vCPUs, 4 GiB de RAM) o `Standard_B2ms` (excelente relación costo/beneficio).
   - **Tipo de autenticación**: Llave pública SSH (recomendado) o Contraseña.
   - **Nombre de usuario**: `azureuser` (o el que prefieras).

---

## Paso 2: Configurar Reglas de Red (NSG) en Azure

En el portal de Azure, ve a tu VM -> **Redes** (Networking) -> **Reglas de puerto de entrada** (Inbound port rules) y asegúrate de tener las siguientes reglas activas:

| Prioridad | Nombre | Puerto | Protocolo | Acción | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 300 | `Allow-SSH` | `22` | TCP | Permitir | Acceso terminal a la VM |
| 310 | `Allow-HTTP` | `80` | TCP | Permitir | Acceso a la aplicación web |
| 320 | `Allow-HTTPS` | `443` | TCP | Permitir | Opcional (para SSL futuro) |

---

## Paso 3: Conexión e Instalación de Docker en la VM

1. Abre tu terminal (PowerShell o Git Bash) y conéctate por SSH a la VM con su IP pública:
   ```bash
   ssh azureuser@<IP_PUBLICA_AZURE>
   ```

2. Ejecuta el script oficial de instalación de Docker y Docker Compose:
   ```bash
   # Actualizar repositorios
   sudo apt update && sudo apt upgrade -y

   # Instalar Docker con el instalador oficial
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Permitir usar docker sin sudo
   sudo usermod -aG docker $USER
   newgrp docker

   # Verificar instalación
   docker --version
   docker compose version
   ```

---

## Paso 4: Exportar la Base de Datos Local

En tu máquina local (Windows), exporta los datos existentes de PostgreSQL usando el script provisto o directamente con `pg_dump`:

### Opción A: Usando el script incluido
Doble clic en:
```
scripts\export_local_db.bat
```
O desde PowerShell/CMD:
```powershell
.\scripts\export_local_db.bat
```

### Opción B: Comando manual con pg_dump
```bash
pg_dump -U postgres -h localhost -p 5432 -d campo -n agricultura --clean --if-exists -f backups/campo_backup.sql
```
Esto generará el archivo `backups/campo_backup.sql`.

---

## Paso 5: Subir el Proyecto y Backup a la VM

### Método 1: Vía Git (Recomendado para el código)
En la terminal de la VM:
```bash
cd ~
git clone <URL_DE_TU_REPOSITORIO_GIT> campo
cd campo
```

Y luego transfiere el archivo de backup `campo_backup.sql` desde tu computadora local:
```bash
scp backups/campo_backup.sql azureuser@<IP_PUBLICA_AZURE>:~/campo/backups/
```

### Método 2: Vía SCP (Subir toda la carpeta si no usas Git remoto)
Desde tu terminal local en Windows:
```bash
scp -r e:\Descargas\campo azureuser@<IP_PUBLICA_AZURE>:~/campo
```

---

## Paso 6: Iniciar los Contenedores

1. En la VM, entra en la carpeta del proyecto:
   ```bash
   cd ~/campo
   ```

2. Crea el archivo `.env` a partir del ejemplo:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *(Cambia `DB_PASSWORD` por una contraseña segura y guarda con `Ctrl+O`, Enter, `Ctrl+X`)*.

3. Construye y levanta todos los contenedores en segundo plano:
   ```bash
   docker compose up -d --build
   ```

4. Revisa que los tres contenedores estén en estado `Up` / `healthy`:
   ```bash
   docker compose ps
   ```

5. ¡Listo! Abre tu navegador y accede a:
   ```text
   http://<IP_PUBLICA_AZURE>
   ```

---

## Paso 7: Restaurar los Datos en PostgreSQL

Una vez que los contenedores estén corriendo, restaura tu copia de seguridad local dentro del contenedor de base de datos:

### Con el script incluido:
```bash
chmod +x scripts/restore_db_on_vm.sh
./scripts/restore_db_on_vm.sh backups/campo_backup.sql
```

### O con el comando directo de Docker:
```bash
docker compose exec -T db psql -U postgres -d campo < backups/campo_backup.sql
```

Esto volcará todos tus lotes, terceros, trabajos, cultivos y comprobantes tal cual los tenías en tu entorno local.

---

## Comandos Útiles de Mantenimiento

* **Ver logs en tiempo real**:
  ```bash
  docker compose logs -f
  # O de un servicio específico:
  docker compose logs -f backend
  ```
* **Reiniciar los servicios**:
  ```bash
  docker compose restart
  ```
* **Detener los servicios sin borrar datos**:
  ```bash
  docker compose down
  ```
* **Hacer un backup manual en la VM**:
  ```bash
  docker compose exec -T db pg_dump -U postgres -d campo -n agricultura > ~/backup_$(date +\%F).sql
  ```
* **Actualizar la app con nuevos cambios de código**:
  ```bash
  git pull
  docker compose up -d --build
  ```
