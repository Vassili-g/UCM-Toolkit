# PowerShell script to extract Atlassian tarballs
# Usage: powershell -ExecutionPolicy Bypass -File extract.ps1

$AtlassianDir = "A:\_5_Projets pros\Apicil - Intencial - FundShop\Projet UCM\UCM-Toolkit\docs\notes\Recherches\Plugin Palettes\Recette CRITIQUE de qualité\Collecte\Atlassian"
$TempDir = "$AtlassianDir\temp"

if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir | Out-Null
}

Write-Host "Extracting Atlassian tarballs..."

# Extract tokens
tar -xzf "$AtlassianDir\tokens-20.4.1.tgz" -C "$TempDir\tokens" 2>&1

# Extract badge
tar -xzf "$AtlassianDir\badge-22.0.0.tgz" -C "$TempDir\badge" 2>&1

# Extract lozenge
tar -xzf "$AtlassianDir\lozenge-17.0.5.tgz" -C "$TempDir\lozenge" 2>&1

# Extract section-message
tar -xzf "$AtlassianDir\section-message-10.2.6.tgz" -C "$TempDir\section-message" 2>&1

Write-Host "Extraction complete. Files in: $TempDir"

# List extracted files
Get-ChildItem -Path $TempDir -Recurse -File | Select-Object FullName | Out-File "$AtlassianDir\extracted_files.txt"
Write-Host "File list saved to: $AtlassianDir\extracted_files.txt"
