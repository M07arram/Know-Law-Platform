# How to Install Git on Windows

Git is not currently installed on your system. Follow these steps to install it:

## Option 1: Install Git for Windows (Recommended)

### Step 1: Download Git
1. Visit: https://git-scm.com/download/win
2. The download should start automatically
3. Or download the 64-bit installer directly

### Step 2: Install Git
1. Run the downloaded installer (e.g., `Git-2.xx.x-64-bit.exe`)
2. Follow the installation wizard:
   - **Select Components**: Keep default options (Git Bash, Git GUI, etc.)
   - **Default Editor**: Choose your preferred editor (VS Code, Notepad++, etc.)
   - **Default Branch Name**: Use "main" (recommended)
   - **PATH Environment**: Select **"Git from the command line and also from 3rd-party software"** (IMPORTANT!)
   - **HTTPS**: Use the OpenSSL library (default)
   - **Line Ending Conversions**: Use Windows-style (CRLF) or Unix-style (LF) - default is fine
   - **Terminal Emulator**: Use Windows' default console window (default)
   - **Default Behavior**: Use fast-forward or merge (default)
   - **Extra Options**: Keep defaults
   - **Experimental Options**: Leave unchecked
3. Click "Install" and wait for installation to complete

### Step 3: Verify Installation
1. Close and reopen PowerShell (or open a new terminal)
2. Run: `git --version`
3. You should see something like: `git version 2.xx.x.windows.x`

### Step 4: Configure Git (Optional but Recommended)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Option 2: Install via Winget (Windows Package Manager)

If you have Windows 10/11 with Winget installed:

```powershell
winget install --id Git.Git -e --source winget
```

Then restart PowerShell and verify:
```powershell
git --version
```

## Option 3: Install via Chocolatey

If you have Chocolatey installed:

```powershell
choco install git -y
```

Then restart PowerShell and verify:
```powershell
git --version
```

## After Installation

1. **Restart PowerShell** (close and reopen your terminal)
2. Navigate to your project directory:
   ```powershell
   cd D:\images\certificates\PDFs
   ```
3. Initialize Git:
   ```powershell
   git init
   ```

## Troubleshooting

### If Git is still not recognized after installation:

1. **Check if Git was added to PATH:**
   ```powershell
   $env:PATH -split ';' | Select-String -Pattern 'git'
   ```

2. **Manually add Git to PATH (if needed):**
   - Open "Environment Variables" in Windows Settings
   - Edit the "Path" variable
   - Add: `C:\Program Files\Git\cmd`
   - Restart PowerShell

3. **Verify Git installation location:**
   ```powershell
   Test-Path "C:\Program Files\Git\bin\git.exe"
   ```

## Quick Check Command

After installation, run this to verify everything works:
```powershell
git --version
git config --list
```

If both commands work, Git is successfully installed and configured!

