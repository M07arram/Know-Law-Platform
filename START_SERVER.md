# How to Start the Server

## Quick Start

1. **Open a terminal/command prompt** in the project directory

2. **Start the server** using one of these methods:

   ### Method 1: Using npm
   ```bash
   npm start
   ```

   ### Method 2: Using node directly
   ```bash
   node server.js
   ```

   ### Method 3: Using the batch file (Windows)
   ```bash
   start-server.bat
   ```

3. **Wait for the server to start** - You should see:
   ```
   ==================================================
   ✅ Server is running successfully!
   🌐 Server URL: http://localhost:3000
   📡 Server is listening on all network interfaces
   ==================================================
   ```

4. **Open your browser** and navigate to:
   - http://localhost:3000

## Troubleshooting

### Port Already in Use
If you see "Port 3000 is already in use":
- **Option 1**: Stop the other server using port 3000
- **Option 2**: Use a different port:
  ```bash
  set PORT=3001
  npm start
  ```

### Server Won't Start
1. Make sure Node.js is installed:
   ```bash
   node --version
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Check for errors in the terminal output

### Cannot Connect to Server
1. Make sure the server is running (check terminal for success message)
2. Make sure you're accessing http://localhost:3000 (not https)
3. Check your firewall settings
4. Try accessing from another browser

## Server Status

The server will display a message when it's ready. Look for:
- ✅ Server is running successfully!
- Available endpoints list
- ⚡ Server is ready to accept connections!

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.







