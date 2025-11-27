$outputFile = "combined-text.txt"
$scriptName = $MyInvocation.MyCommand.Name
$rootPath = $PSScriptRoot

# Exclusion lists
$excludeDirs = @(
    ".git", "node_modules", "dist", "build", ".next", "coverage", 
    ".vscode", ".idea", "venv", "env", ".terraform", "bin", "obj", 
    "__pycache__", ".pytest_cache", "htmlcov", "terraform-examples"
)

$excludeExtensions = @(
    ".log", ".lock", ".tfstate", ".tfstate.backup", ".pyc", ".pyo", ".pyd",
    ".db", ".sqlite", ".sqlite3", ".suo", ".user",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".bmp", ".tiff", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dll", ".so", ".dylib",
    ".pem", ".key", ".crt", ".p12", ".pfx",
    ".ttf", ".otf", ".woff", ".woff2", ".eot"
)

# Remove existing output file if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

Write-Host "Scanning for files..."

$files = Get-ChildItem -Path $rootPath -Recurse -File | Where-Object {
    $file = $_
    $relativePath = $file.FullName.Substring($rootPath.Length + 1)
    
    # Check if file is in an excluded directory
    # We check if the relative path contains any excluded directory segment
    $pathParts = $relativePath.Split([System.IO.Path]::DirectorySeparatorChar)
    $isInExcludedDir = $false
    foreach ($part in $pathParts) {
        if ($excludeDirs -contains $part) {
            $isInExcludedDir = $true
            break
        }
    }
    
    # Check if file has an excluded extension
    $hasExcludedExt = $excludeExtensions -contains $file.Extension.ToLower()
    
    # Check if it's the script itself or the output file
    $isScriptOrOutput = ($file.Name -eq $scriptName) -or ($file.Name -eq $outputFile)
    
    # Return true if we should include the file
    (-not $isInExcludedDir) -and (-not $hasExcludedExt) -and (-not $isScriptOrOutput)
}

$totalFiles = $files.Count
Write-Host "Found $totalFiles files to combine."

$currentFile = 0
foreach ($file in $files) {
    $currentFile++
    $relativePath = $file.FullName.Substring($rootPath.Length + 1)
    
    # Simple progress indicator
    if ($currentFile % 10 -eq 0) {
        Write-Progress -Activity "Combining files" -Status "Processing $relativePath" -PercentComplete (($currentFile / $totalFiles) * 100)
    }
    
    Add-Content -Path $outputFile -Value "`n================================================================================"
    Add-Content -Path $outputFile -Value "FILE: $relativePath"
    Add-Content -Path $outputFile -Value "================================================================================`n"
    
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        Add-Content -Path $outputFile -Value $content
    }
    catch {
        Add-Content -Path $outputFile -Value "[ERROR READING FILE: $($_.Exception.Message)]"
    }
}

Write-Progress -Activity "Combining files" -Completed
Write-Host "Successfully combined $totalFiles files into $outputFile"
