# Run the project on your Windows PC (Docker)

This guide sets up the whole project on one Windows computer:

| Part | Runs in | Address |
|---|---|---|
| PostgreSQL database | Docker container `kvell-db` | (internal only) |
| Spring Boot backend | Docker container `kvell-backend` | http://localhost:8080 |
| Student / HOD / faculty portal | Node (Vite dev server) | http://localhost:3000 |
| COE panel | Node (Vite dev server) | http://localhost:3002/admin/login |

You do **not** need Java or Maven. The backend is built inside Docker.

Run every command in **Windows PowerShell**, not cmd.

---

## 1. Install the tools (one time)

Open PowerShell **as Administrator** and run:

```powershell
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Docker.DockerDesktop
wsl --install --no-distribution
```

Then:

1. **Restart the PC.**
2. Open **Docker Desktop** from the Start menu and accept the terms.
3. Wait until the bottom-left corner says **Engine running**.

Open a **normal** (not Administrator) PowerShell and check the tools:

```powershell
git --version
node -v          # v22 or newer
docker version   # must show both "Client" and "Server"
```

If `npm` or `npx` says *"running scripts is disabled on this system"*, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 2. Download the project

```powershell
cd $HOME\Documents
git clone https://github.com/Vijayram2006/College-Result-Portal.git
cd College-Result-Portal
```

## 3. Choose passwords

These only exist on your PC.
- `$DB_PASS` is the database password.
- `$DEMO_PASS` is the sign-in password for every demo account. Use at least 8 characters, with letters and digits.

```powershell
$DB_PASS   = "ChangeMe-db-2026"
$DEMO_PASS = "Demo2026pass"
```

> Keep the same PowerShell window open for steps 3–5, because these variables vanish when it closes.
> After step 5 the passwords are saved inside the containers, so later you never need them again.

## 4. Start the database

```powershell
docker network create kvell-net

docker run -d --name kvell-db --network kvell-net --restart unless-stopped `
  -e POSTGRES_USER=result_portal `
  -e POSTGRES_PASSWORD=$DB_PASS `
  -e POSTGRES_DB=result_portal `
  -v kvell-pgdata:/var/lib/postgresql/data `
  postgres:17
```

The data is kept in the Docker volume `kvell-pgdata`, so it survives restarts.

## 5. Build and start the backend

The first build downloads Maven and Java packages, which takes **5–10 minutes**:

```powershell
docker build -t kvell-backend .\backend
```

> If the build fails at `mvn ... dependency:go-offline`, it is usually a temporary download error.
> Run the same command again.

Start the backend:

```powershell
docker run -d --name kvell-backend --network kvell-net --restart unless-stopped `
  -p 127.0.0.1:8080:8080 `
  -e DB_URL="jdbc:postgresql://kvell-db:5432/result_portal" `
  -e DB_USER=result_portal `
  -e DB_PASSWORD=$DB_PASS `
  -e MFA_REQUIRED=false `
  -e SEED_DEMO_DATA=true `
  -e DEMO_SUPER_ADMIN_PASSWORD=$DEMO_PASS `
  -e DEMO_ADMIN_PASSWORD=$DEMO_PASS `
  -e DEMO_NURSING_COE_PASSWORD=$DEMO_PASS `
  -e DEMO_PHARMACY_COE_PASSWORD=$DEMO_PASS `
  -e DEMO_HOD_PASSWORD=$DEMO_PASS `
  -e DEMO_FACULTY_PASSWORD=$DEMO_PASS `
  -e DEMO_DEAN_PASSWORD=$DEMO_PASS `
  kvell-backend
```

Wait about 20 seconds, then check that the backend is up:

```powershell
docker logs kvell-backend --tail 5
```

The log should end with `Started ResultPortalBackendApplication`. On the first start, the backend creates all the tables (Flyway migrations) and the demo accounts.

Optional check:

```powershell
try { Invoke-WebRequest http://localhost:8080/api/auth/me -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```

This should print `401`, which means the backend is running and you are not signed in yet.

## 6. Start the two websites

**Window 1: the portal (students, HODs, faculty, Associate Dean)**

```powershell
cd $HOME\Documents\College-Result-Portal
npx -y pnpm@10.4.1 install --frozen-lockfile
npx vite --port 3000
```

**Window 2: the COE panel.** Open a second PowerShell window:

```powershell
cd $HOME\Documents\College-Result-Portal\admin-panel
npm ci
npx vite --port 3002
```

Leave both windows open. Then open these addresses in your browser:
- Portal: http://localhost:3000
- COE panel: http://localhost:3002/admin/login

> pnpm may show *"Ignored build scripts: @tailwindcss/oxide, core-js, esbuild"*. This is harmless.

## 7. Demo sign-ins

Every account uses the `$DEMO_PASS` password you chose in step 3.

| Where | Username | Who |
|---|---|---|
| COE panel | `COE` | Chief COE (all colleges) |
| COE panel | `ADMIN` | COE, Engineering |
| COE panel | `COE_NURSING`, `COE_PHARMACY` | COE, Nursing / Pharmacy |
| Portal → HOD | `HODCSE`, `HODECE`, … (`HOD` + department code) | Head of Department |
| Portal → Faculty | `FACCSE`, `FACECE`, … (`FAC` + department code) | Faculty |
| Portal → Assoc. Dean | `ADEAN_ENG`, `ADEAN_NUR`, `ADEAN_PHARM` | Associate Dean |

---

## Every day after that

**To start:**
1. Open Docker Desktop. The two containers start by themselves.
2. Run only the two `npx vite ...` commands from step 6.

**To stop:**
1. Press `Ctrl+C` in both website windows.
2. Optionally, stop the containers:

```powershell
docker stop kvell-backend kvell-db
docker start kvell-db kvell-backend     # to start them again later
```

## After `git pull` (new code)

```powershell
cd $HOME\Documents\College-Result-Portal
git pull

# 1. Backend: rebuild the image, then replace the container
docker build -t kvell-backend .\backend
docker rm -f kvell-backend
```

Then set `$DB_PASS` and `$DEMO_PASS` again, with the same values as before. Run the `docker run ... kvell-backend` command from step 5 again. Your database is kept.

Finally, refresh the website packages:

```powershell
# 2. Websites
npx -y pnpm@10.4.1 install --frozen-lockfile
cd admin-panel; npm ci; cd ..
```

## Start again from an empty database

This **deletes all data** on your PC:

```powershell
docker rm -f kvell-backend kvell-db
docker volume rm kvell-pgdata
```

Then run steps 3, 4 and 5 again.

## Troubleshooting

| Problem | Fix |
|---|---|
| `docker: error during connect` / `cannot find the file specified` | Docker Desktop is not running. Start it and wait for **Engine running**. |
| `port is already allocated` / `Bind for 127.0.0.1:8080 failed` | Another program uses port 8080. Close it, or change `-p 127.0.0.1:8080:8080` to `-p 127.0.0.1:8081:8080`. Then start both websites with `$env:VITE_API_BASE_URL="http://localhost:8081/api"; $env:VITE_API_URL="http://localhost:8081/api"` before `npx vite`. |
| `Conflict. The container name "/kvell-db" is already in use` | The container already exists. Use `docker start kvell-db` instead of `docker run`. |
| Backend log shows `password authentication failed` | The `$DB_PASS` you used is not the one the database was created with. Use the first one, or reset the database (see above). |
| Sign-in says wrong password | Demo accounts are created only on the **first** start of an empty database, with the password used at that time. Reset the database to change them. |
| Website shows "server is waking up" forever | The backend is not running. Check with `docker ps`, then `docker logs kvell-backend --tail 30`. |
| Browser shows a CORS error | Open the sites exactly at `http://localhost:3000` and `http://localhost:3002`. Other ports are blocked by the backend. |
| `npx vite` says port 3000 is in use | Close the old window that is still running it, or restart the PC. |

Useful commands:

```powershell
docker ps -a                          # which containers exist / are running
docker logs -f kvell-backend          # live backend log (Ctrl+C to leave)
docker exec -it kvell-db psql -U result_portal   # SQL prompt (\q to leave)
```
