const express = require('express');

const router = express.Router();

// Lightweight HTML reset password form served by the backend
// Usage: GET /reset-password?token=<token>
router.get('/reset-password', (req, res) => {
  const token = (req.query.token || '').toString();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Restablecer Contraseña - WorkFlow Energy</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f6f7f9; margin:0;}
    .card{max-width:420px; margin:48px auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 4px 20px rgba(0,0,0,0.08)}
    h1{font-size:20px; margin:0 0 8px}
    p{color:#555; margin:0 0 16px}
    label{display:block; margin:12px 0 6px; font-weight:600}
    input{width:100%; padding:12px; border:1px solid #d0d7de; border-radius:8px; font-size:14px}
    button{margin-top:16px; width:100%; padding:12px; background:#1976d2; color:#fff; border:none; border-radius:8px; font-size:15px; cursor:pointer}
    button:disabled{opacity:.7; cursor:not-allowed}
    .alert{padding:12px; border-radius:8px; margin:12px 0}
    .alert.error{background:#fdecea; color:#611a15; border:1px solid #f5c6cb}
    .alert.success{background:#edf7ed; color:#1e4620; border:1px solid #c6ecc6}
    .note{font-size:12px; color:#666; margin-top:8px}
  </style>
  <script>
    window.__RESET_TOKEN__ = ${JSON.stringify(token)};
    window.__REDIRECT_BASE__ = (function(){
      var isDev = ${JSON.stringify(process.env.NODE_ENV !== 'production')};
      var base = ${JSON.stringify(process.env.EMAIL_RESET_BASE_URL || null)}
        || (isDev ? ${JSON.stringify(process.env.LOCAL_FRONTEND_URL || null)} : null)
        || ${JSON.stringify(process.env.FRONTEND_URL || null)}
        || 'http://localhost:3002';
      return String(base).replace(/\/$/, '');
    })();
  </script>
</head>
<body>
  <div class="card">
    <h1>Restablecer Contraseña</h1>
    <p>Ingresa tu nueva contraseña para completar la recuperación.</p>

    <div id="msg" style="display:none"></div>

    <form id="form">
      <label for="password">Nueva contraseña</label>
      <input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required minlength="8" />

      <label for="confirm">Confirmar nueva contraseña</label>
      <input id="confirm" name="confirm" type="password" placeholder="Repite la contraseña" required minlength="8" />

      <button type="submit" id="submit">Actualizar contraseña</button>
      <div class="note">El enlace expira en 1 hora. Por seguridad se cerrarán tus otras sesiones.</div>
    </form>
  </div>

  <script>
    const form = document.getElementById('form');
    const msg = document.getElementById('msg');
    const submitBtn = document.getElementById('submit');

    function show(type, text){
      msg.className = 'alert ' + (type === 'error' ? 'error' : 'success');
      msg.textContent = text;
      msg.style.display = 'block';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.style.display = 'none';

      const token = window.__RESET_TOKEN__ || '';
      const password = document.getElementById('password').value.trim();
      const confirm = document.getElementById('confirm').value.trim();

      if (!token) { show('error', 'Token inválido o faltante.'); return; }
      if (password.length < 8) { show('error', 'La contraseña debe tener al menos 8 caracteres.'); return; }
      if (password !== confirm) { show('error', 'Las contraseñas no coinciden.'); return; }

      submitBtn.disabled = true;

      try {
        const resp = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const m = data && data.message ? data.message : 'Error al actualizar la contraseña';
          show('error', m);
        } else {
          // If tokens returned, redirect to frontend to store tokens and go to dashboard
          if (data && data.accessToken && data.refreshToken) {
            const target = window.__REDIRECT_BASE__ + '/auth/callback'
              + '#accessToken=' + encodeURIComponent(data.accessToken)
              + '&refreshToken=' + encodeURIComponent(data.refreshToken);
            window.location.replace(target);
            return;
          }
          show('success', data.message || 'Contraseña actualizada exitosamente');
          form.reset();
        }
      } catch (err) {
        show('error', 'Error de red. Intenta más tarde.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
});

module.exports = router;
