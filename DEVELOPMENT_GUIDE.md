# LOS App Development Setup Guide

## Quick Start

### Option 1: Using Enhanced Start Script
```bash
./start-dev.sh
```

### Option 2: Using NPM Scripts
```bash
# Clean start with port cleanup
npm run dev:clean

# Start Tauri development
npm run dev:tauri

# Or use individual commands
npm run clean:port
npm run tauri:dev
```

## Port Configuration

- **Development Server**: Port 1420
- **HMR WebSocket**: Port 1420 (same as dev server)
- **Tauri Dev URL**: http://localhost:1420

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run dev:clean` | Clean port + start Vite |
| `npm run dev:tauri` | Clean port + start Tauri dev |
| `npm run tauri:dev` | Start Tauri dev (no cleanup) |
| `npm run clean:port` | Kill processes on port 1420 |
| `npm run clean:all` | Clean port + remove build cache |
| `npm run validate:hmr` | Test HMR functionality |

## Hot Module Replacement (HMR)

HMR is now configured to work consistently:
- ✅ Always enabled (no conditional setup)
- ✅ Uses same port as dev server (1420)
- ✅ Works for .tsx, .ts, .css files
- ✅ Automatic reconnection on network issues

## Troubleshooting

### Port Already in Use
```bash
# Clean up port manually
npm run clean:port

# Or kill specific process
lsof -ti:1420 | xargs kill -9
```

### HMR Not Working
1. Check browser console for WebSocket errors
2. Verify port 1420 is accessible
3. Try refreshing the page
4. Restart dev server with `npm run dev:clean`

### Tauri Build Issues
1. Ensure Rust/Cargo is in PATH: `export PATH="$HOME/.cargo/bin:$PATH"`
2. Check Tauri CLI is installed: `cargo install tauri-cli`
3. Clean and rebuild: `npm run clean:all && npm run dev:tauri`

## Environment Variables

Create `dev.env` file for custom configuration:
```bash
# Optional: Set custom host for network access
TAURI_DEV_HOST=192.168.1.100

# Development port (should match vite.config.ts)
DEV_PORT=1420

# Enable debug logging
DEBUG=true
```

## File Watching

Vite watches these files for changes:
- ✅ `src/**/*.{ts,tsx,js,jsx}`
- ✅ `src/**/*.css`
- ✅ `tailwind.config.js`
- ✅ `vite.config.ts`
- ❌ `src-tauri/**` (ignored - Rust files)

## Development Workflow

1. **Start Development**:
   ```bash
   npm run dev:tauri
   ```

2. **Make Changes**: Edit any file in `src/`

3. **Verify HMR**: Changes should appear instantly without page refresh

4. **Stop Development**: Ctrl+C in terminal

5. **Clean Restart** (if needed):
   ```bash
   npm run clean:all
   npm run dev:tauri
   ```

## Validation Checklist

After setup, verify:
- [ ] Dev server starts on port 1420
- [ ] Tauri app opens and connects to dev server
- [ ] Changes to .tsx files trigger HMR within 1 second
- [ ] Changes to .css files trigger HMR immediately
- [ ] No port conflicts when restarting
- [ ] Console shows no WebSocket errors

## Performance Tips

- Use `npm run dev:clean` for guaranteed clean starts
- Restart dev server if HMR becomes unresponsive
- Clear browser cache if changes don't appear
- Use `npm run clean:all` for deep cleanup
