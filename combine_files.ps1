$outputFile = "combined-text.txt"
$scriptName = $MyInvocation.MyCommand.Name

# Remove existing output file if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Get all files recursively, excluding .git and the script/output files
Get-ChildItem -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\.git\\" -and 
    $_.Name -ne $outputFile -and 
    $_.Name -ne $scriptName
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($PWD.Path.Length + 1)
    
    Add-Content -Path $outputFile -Value "`n================================================================================"
    Add-Content -Path $outputFile -Value "FILE: $relativePath"
    Add-Content -Path $outputFile -Value "================================================================================`n"
    
    try {
        $content = Get-Content -Path $_.FullName -Raw -ErrorAction Stop
        Add-Content -Path $outputFile -Value $content
    }
    catch {
        Add-Content -Path $outputFile -Value "[ERROR READING FILE: $_]"
    }
}

Write-Host "All files combined into $outputFile"
