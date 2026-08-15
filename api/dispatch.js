// language: JavaScript, file: api/dispatch.js, target: Vercel Serverless
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const FIREBASE_URL = process.env.FIREBASE_URL;
  if (!FIREBASE_URL) {
    return res.status(500).json({ error: 'SERVER_CONFIG_ERROR: FIREBASE_URL missing in Vercel Env' });
  }

  const { action, username, password, adminId, deviceId, command } = req.body;

  try {
    // 1. AUTHENTICATION LOGIN
    if (action === 'login') {
      const dbRes = await fetch(`${FIREBASE_URL}/admins.json`);
      const data = await dbRes.json();
      
      let foundAdminId = null;
      if (data) {
        for (const [id, val] of Object.entries(data)) {
          if (val.auth && val.auth.username === username && val.auth.password === password) {
            foundAdminId = id;
            break;
          }
        }
      }

      if (foundAdminId) {
        return res.status(200).json({ success: true, adminId: foundAdminId });
      } else {
        return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
      }
    }

    // 2. FETCH DEVICES LIST
    if (action === 'get_devices') {
      if (!adminId) return res.status(400).json({ error: 'Missing adminId' });
      const dbRes = await fetch(`${FIREBASE_URL}/admins/${adminId}/devices.json`);
      const devices = await dbRes.json();
      return res.status(200).json({ success: true, devices: devices || {} });
    }

    // 3. SEND COMMAND TO SPECIFIC DEVICE
    if (action === 'send_command') {
      if (!adminId || !deviceId || !command) return res.status(400).json({ error: 'Missing parameters' });
      const dbRes = await fetch(`${FIREBASE_URL}/admins/${adminId}/devices/${deviceId}/command.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });
      if (dbRes.ok) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'FAILED_TO_DISPATCH' });
      }
    }

    // 4. PURGE COMMAND FOR TARGET DEVICE
    if (action === 'purge_command') {
      if (!adminId || !deviceId) return res.status(400).json({ error: 'Missing parameters' });
      const dbRes = await fetch(`${FIREBASE_URL}/admins/${adminId}/devices/${deviceId}/command.json`, {
        method: 'DELETE'
      });
      if (dbRes.ok) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'FAILED_TO_PURGE' });
      }
    }

    return res.status(400).json({ error: 'INVALID_ACTION' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
