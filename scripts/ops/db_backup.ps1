<#
.SYNOPSIS
    Daily Backup Script for PickPic (MSSQL + Files)
    Runs via Windows Task Scheduler.

.DESCRIPTION
    1. Backs up MSSQL Database 'PickPicDB' to C:\Backups\PickPicDB
    2. Backups .env file to C:\Backups\Config
    3. Mirrors user uploads to C:\Backups\Uploads
    4. Deletes backups older than 30 days.
#>

$ErrorActionPreference = "Stop"

# Configuration
$DbName = "PickPicDB"
$BackupRoot = "C:\Backups"
$DbBackupDir = "$BackupRoot\PickPicDB"
$ConfigBackupDir = "$BackupRoot\Config"
$UploadsBackupDir = "$BackupRoot\Uploads"
$AppRoot = "C:\inetpub\wwwroot\studioxo"

$DateStamp = Get-Date -Format "yyyyMMdd_HHmm"

# 1. Ensure Directories Exist
$Dirs = @($DbBackupDir, $ConfigBackupDir, $UploadsBackupDir)
foreach ($Dir in $Dirs) {
    if (!(Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir | Out-Null
        Write-Output "Created $Dir"
    }
}

# 2. Database Backup
Write-Output "Starting DB Backup..."
$BackupFile = "$DbBackupDir\$DbName`_Full_$DateStamp.bak"
$SqlCmd = "BACKUP DATABASE [$DbName] TO DISK = '$BackupFile' WITH COMPRESSION, INIT, STATS = 10"

try {
    # Try using Invoke-Sqlcmd (Requires SQL Server Module)
    Invoke-Sqlcmd -Query $SqlCmd -ServerInstance "localhost" -TrustServerCertificate
    Write-Output "DB Backup Successful: $BackupFile"
}
catch {
    Write-Warning "Invoke-Sqlcmd failed. Trying sqlcmd.exe..."
    # Fallback to sqlcmd.exe if module not installed
    & sqlcmd -S localhost -Q $SqlCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backup failed."
    }
}

# 3. Config Backup
Write-Output "Backing up Config..."
Copy-Item "$AppRoot\.env" "$ConfigBackupDir\.env_$DateStamp" -Force
Copy-Item "$AppRoot\.env.production" "$ConfigBackupDir\.env.production_$DateStamp" -ErrorAction SilentlyContinue

# 4. Uploads Mirror (Robocopy)
Write-Output "Syncing Uploads..."
$UploadsSrc = "$AppRoot\public\uploads"
if (Test-Path $UploadsSrc) {
    # /MIR = Mirror (Delete passed files in dest), /R:3 = Retry 3 times, /W:5 = Wait 5s
    # Robocopy returns exit codes that are non-zero even on success (1 = files copied)
    $Process = Start-Process robocopy -ArgumentList "`"$UploadsSrc`" `"$UploadsBackupDir`" /MIR /R:3 /W:5 /NFL /NDL" -PassThru -Wait
    Write-Output "Robocopy Exit Code: $($Process.ExitCode)"
}

# 5. Retention Policy (Cleanup > 30 Days)
Write-Output "Cleaning old backups..."
Get-ChildItem -Path $DbBackupDir -Filter "*.bak" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
Get-ChildItem -Path $ConfigBackupDir | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Output "Backup Job Complete."
