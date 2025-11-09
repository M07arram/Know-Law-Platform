# 🚀 How to Start the Know Law Server

## ⚠️ IMPORTANT: You MUST use the server to access the website!

**DO NOT** open the HTML files directly in your browser (file://).  
**YOU MUST** access the website through the server at http://localhost:3000

## Quick Start Guide

### Step 1: Open Terminal/Command Prompt
Open a terminal or command prompt in the project directory:
```
D:\images\certificates\PDFs
```

### Step 2: Start the Server

**Option A: Using npm (Recommended)**
```bash
npm start
```

**Option B: Using Node directly**
```bash
node server.js
```

**Option C: Using Windows Batch File**
Double-click `start-server.bat` or run:
```bash
start-server.bat
```

### Step 3: Wait for Server to Start
You should see this message:
```
==================================================
✅ Server is running successfully!
🌐 Server URL: http://localhost:3000
📡 Server is listening on all network interfaces
==================================================

📝 Available endpoints:
   - Home: http://localhost:3000/
   - Auth: http://localhost:3000/auth.html
   - Dashboard: http://localhost:3000/dashboard.html
   - Chat: http://localhost:3000/chat.html

⚡ Server is ready to accept connections!
```

### Step 4: Open Your Browser
**IMPORTANT:** Open your browser and go to:
```
http://localhost:3000
```

**DO NOT** double-click the HTML files directly!

## Troubleshooting

### Problem: "Cannot connect to server" Error

**Solution 1: Make sure the server is running**
- Check your terminal - you should see the success message
- If not, start the server using `npm start`

**Solution 2: Check if you're accessing through the server**
- ✅ Correct: `http://localhost:3000`
- ❌ Wrong: `file:///D:/images/certificates/PDFs/index.html`

**Solution 3: Restart the server**
- If the server seems stuck, use `restart-server.bat`
- Or press `Ctrl+C` in the terminal, then run `npm start` again

### Problem: "Port 3000 is already in use"

**Solution:**
1. Use the restart script: `restart-server.bat`
2. Or manually stop the process:
   - Find the process using port 3000
   - Stop it, then start the server again

### Problem: Server starts but website doesn't load

**Solution:**
1. Make sure you're using `http://localhost:3000` (not https)
2. Try refreshing the browser (Ctrl+F5)
3. Clear browser cache
4. Try a different browser

## Verifying Server is Running

### Check 1: Terminal Output
Look for: `✅ Server is running successfully!`

### Check 2: Browser Test
Open: `http://localhost:3000`  
You should see the Know Law homepage

### Check 3: API Test
Open: `http://localhost:3000/api/session`  
You should see: `{"success":false,"message":"Not authenticated","allowGuest":true}`

## Common Mistakes

❌ **Opening HTML files directly**
```
file:///D:/images/certificates/PDFs/index.html
```
This won't work because the API calls need the server!

✅ **Accessing through the server**
```
http://localhost:3000
```
This works because the server handles all requests!

## Need Help?

1. **Check the terminal** for error messages
2. **Verify the server is running** (see "Verifying Server is Running" above)
3. **Make sure you're using http://localhost:3000** in your browser
4. **Restart the server** if needed

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.





