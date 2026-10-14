<#
  Starts the whole KVELL Result Portal for a demo on this laptop:
    1. the Postgres container (result-portal-db)
    2. the Spring Boot backend      http://localhost:8080
    3. the student / HOD portal     http://localhost:3000
    4. the admin control panel      http://localhost:3002/admin/login

  Secrets are read from files outside the repo (never committed):
    ..\..\result-portal\.env              DB_USER, DB_PASSWORD, DB_PORT
    ..\..\result-portal\demo-logins.env   DEMO_ADMIN_PASSWORD, DEMO_HOD_PASSWORD

  Usage:  powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
          add -Rebuild to rebuild the backend jar first
#>
param(
    [switch]$Rebuild,
    [string]$SecretsDir = (Join-Path $PSScriptRoot "..\..\result-portal"),
    [string]$Database = "result_portal_v2"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$jar = Join-Path $backend "target\result-portal-backend-0.0.1-SNAPSHOT.jar"

function Read-EnvFile([string]$path) {
    if (-not (Test-Path $path)) { throw "Missing $path" }
    $values = @{}
    foreach ($line in [IO.File]::ReadAllLines($path)) {   # ReadAllLines also drops a UTF-8 BOM
        $t = $line.Trim()
        if ($t -eq "" -or $t.StartsWith("#") -or -not $t.Contains("=")) { continue }
        $i = $t.IndexOf("=")
        $values[$t.Substring(0, $i).Trim()] = $t.Substring($i + 1).Trim()
    }
    return $values
}

function Wait-Http([string]$url, [int]$seconds, [int[]]$okCodes) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($okCodes -contains [int]$r.StatusCode) { return $true }
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            if ($code -and ($okCodes -contains [int]$code)) { return $true }
        }
        Start-Sleep -Milliseconds 700
    }
    return $false
}

function Test-Port([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

$envVals = Read-EnvFile (Join-Path $SecretsDir ".env")
$logins = Read-EnvFile (Join-Path $SecretsDir "demo-logins.env")

# 1. Database
Write-Host "[1/4] Database..." -ForegroundColor Cyan
$state = docker inspect -f "{{.State.Running}}" result-portal-db 2>$null
if ($state -ne "true") {
    docker start result-portal-db | Out-Null
    Start-Sleep -Seconds 3
}
docker exec result-portal-db pg_isready -q
if ($LASTEXITCODE -ne 0) { throw "Postgres container result-portal-db is not ready" }

# 2. Backend
Write-Host "[2/4] Backend (port 8080)..." -ForegroundColor Cyan
if (Test-Port 8080) {
    Write-Host "      already running"
} else {
    if ($Rebuild -or -not (Test-Path $jar)) {
        Push-Location $backend
        & .\mvnw.cmd -q -o package -DskipTests
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Backend build failed" }
        Pop-Location
    }
    $port = if ($envVals.DB_PORT) { $envVals.DB_PORT } else { "5432" }
    $env:DB_URL = "jdbc:postgresql://127.0.0.1:$port/$Database"
    $env:DB_USER = $envVals.DB_USER
    $env:DB_PASSWORD = $envVals.DB_PASSWORD
    $env:SEED_DEMO_DATA = "true"
    $env:SERVER_ADDRESS = "127.0.0.1"   # reachable from this laptop only
    $env:DEMO_ADMIN_PASSWORD = $logins.DEMO_ADMIN_PASSWORD
    $env:DEMO_HOD_PASSWORD = $logins.DEMO_HOD_PASSWORD
    $env:DEMO_FACULTY_PASSWORD = $logins.DEMO_FACULTY_PASSWORD
    $env:DEMO_NURSING_COE_PASSWORD = $logins.DEMO_NURSING_COE_PASSWORD
    $env:DEMO_PHARMACY_COE_PASSWORD = $logins.DEMO_PHARMACY_COE_PASSWORD
    $env:DEMO_SUPER_ADMIN_PASSWORD = $logins.DEMO_SUPER_ADMIN_PASSWORD
    $log = Join-Path $backend "backend-demo.log"
    $errLog = Join-Path $backend "backend-demo-error.log"
    Start-Process -FilePath "java" -ArgumentList "-jar", "`"$jar`"" -WorkingDirectory $backend `
        -RedirectStandardOutput $log -RedirectStandardError $errLog -WindowStyle Minimized
    Remove-Item Env:DB_PASSWORD, Env:DEMO_ADMIN_PASSWORD, Env:DEMO_HOD_PASSWORD, Env:DEMO_FACULTY_PASSWORD, Env:DEMO_NURSING_COE_PASSWORD, Env:DEMO_PHARMACY_COE_PASSWORD, Env:DEMO_SUPER_ADMIN_PASSWORD
    if (-not (Wait-Http "http://127.0.0.1:8080/api/auth/me" 90 @(401))) {
        throw "Backend did not start; see $log and $errLog"
    }
}

# 3 + 4. Frontends (bound to this laptop only)
Write-Host "[3/4] Student / HOD portal (port 3000)..." -ForegroundColor Cyan
if (-not (Test-Port 3000)) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx vite --host 127.0.0.1 --port 3000 --strictPort" `
        -WorkingDirectory $root -WindowStyle Minimized
}
Write-Host "[4/4] Admin control panel (port 3002)..." -ForegroundColor Cyan
if (-not (Test-Port 3002)) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx vite --host 127.0.0.1 --port 3002 --strictPort" `
        -WorkingDirectory (Join-Path $root "admin-panel") -WindowStyle Minimized
}
$ok3000 = Wait-Http "http://127.0.0.1:3000/" 60 @(200)
$ok3002 = Wait-Http "http://127.0.0.1:3002/admin/login" 60 @(200)
if (-not ($ok3000 -and $ok3002)) { throw "A frontend did not start (3000: $ok3000, 3002: $ok3002)" }

Write-Host ""
Write-Host "KVELL Result Portal is running:" -ForegroundColor Green
Write-Host "  Admin control panel : http://localhost:3002/admin/login   (user ADMIN)"
Write-Host "  Student / HOD portal: http://localhost:3000               (students: Reg No + DOB; HOD: HODCSE, HODECE, ...)"
Write-Host "  Passwords           : $(Resolve-Path (Join-Path $SecretsDir 'demo-logins.env'))"
Start-Process "http://localhost:3002/admin/login"
Start-Process "http://localhost:3000"
