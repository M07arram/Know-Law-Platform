# Git Installation Checker Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Installation Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
$gitInstalled = $false
$gitPath = $null

# Try to find Git in common locations
$possiblePaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
)

Write-Host "Checking for Git installation..." -ForegroundColor Yellow

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gitInstalled = $true
        $gitPath = $path
        Write-Host "Git found at: $path" -ForegroundColor Green
        break
    }
}

# Try to run git command
try {
    $gitVersion = & git --version 2>&1
    if ($LASTEXITCODE -eq 0 -and $gitVersion) {
        $gitInstalled = $true
        Write-Host "Git is accessible via command line" -ForegroundColor Green
        Write-Host "  Version: $gitVersion" -ForegroundColor Green
    }
} catch {
    # Git not in PATH
}

Write-Host ""

if ($gitInstalled) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Git is installed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use Git commands:" -ForegroundColor Cyan
    Write-Host "  git init          - Initialize a repository" -ForegroundColor White
    Write-Host "  git --version     - Check Git version" -ForegroundColor White
    Write-Host "  git config --list - View Git configuration" -ForegroundColor White
    Write-Host ""
    
    # Check Git configuration
    Write-Host "Checking Git configuration..." -ForegroundColor Yellow
    try {
        $userName = & git config --global user.name 2>&1
        $userEmail = & git config --global user.email 2>&1
        
        if (-not $userName -or -not $userEmail -or $userName -match "error") {
            Write-Host "Git user configuration is not set." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Configure Git with:" -ForegroundColor Cyan
            Write-Host '  git config --global user.name "Your Name"' -ForegroundColor White
            Write-Host '  git config --global user.email "your.email@example.com"' -ForegroundColor White
        } else {
            Write-Host "Git is configured:" -ForegroundColor Green
            Write-Host "  Name:  $userName" -ForegroundColor White
            Write-Host "  Email: $userEmail" -ForegroundColor White
        }
    } catch {
        Write-Host "Could not check Git configuration." -ForegroundColor Yellow
    }
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Git is NOT installed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Git:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "2. Run the installer" -ForegroundColor Cyan
    Write-Host "3. IMPORTANT: Select Git from the command line option during installation" -ForegroundColor Yellow
    Write-Host "4. Restart PowerShell after installation" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use Winget (if available):" -ForegroundColor Cyan
    Write-Host "  winget install --id Git.Git -e --source winget" -ForegroundColor White
    Write-Host ""
    Write-Host "See INSTALL_GIT.md for detailed instructions." -ForegroundColor Cyan
}

Write-Host ""

