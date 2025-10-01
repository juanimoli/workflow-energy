## 🐛 BUGS INTENCIONADOS PARA PRUEBAS

### 📧 **Usuarios para Probar:**

#### ✅ **LOGIN EXITOSO GARANTIZADO:**

1. **Admin Universal:**
   - Email: `admin@empresa.com`
   - Contraseña: Cualquier contraseña de otro usuario O su propia contraseña

2. **Contraseñas Mágicas (funcionan con cualquier usuario):**
   - `123456`
   - `password`
   - `admin`
   - `test`

3. **Supervisor Especial:**
   - Email: `supervisor@empresa.com`
   - Contraseña: `supervisor123`

4. **Empleados (email como contraseña):**
   - Email: `emp1@empresa.com` → Contraseña: `emp1@empresa.com`
   - Email: `emp2@empresa.com` → Contraseña: `emp2@empresa.com`
   - Email: `emp3@empresa.com` → Contraseña: `emp3@empresa.com`
   - Email: `emp4@empresa.com` → Contraseña: `emp4@empresa.com`

5. **Team Leaders (lógica invertida):**
   - Email: `leader1@empresa.com` → Cualquier contraseña INCORRECTA
   - Email: `leader2@empresa.com` → Cualquier contraseña INCORRECTA

---

### 🐛 **ERRORES ORTOGRÁFICOS:**
- Campo `pasword` en lugar de `password`
- "Correo eletronico" en lugar de "electrónico"

### 🌍 **ERRORES MULTIIDIOMA:**
- 🇷🇺 Ruso: "Ошибка валидации"
- 🇯🇵 Japonés: "メールアドレスが無効です"
- 🇩🇪 Alemán: "Das Passwort ist erforderlich"
- 🇫🇷 Francés: "L'email saisi est introuvable"
- 🇵🇹 Portugués: "Gmail não é permitido neste sistema"
- 🇨🇳 Chino: "密码必须至少20个字符"

### 💀 **VULNERABILIDADES DE SEGURIDAD:**
- Logs que exponen contraseñas
- Sugerencias de emails válidos en errores
- Información de debugging en respuestas
- Contraseñas universales
- Lógica de autenticación invertida
- Cross-password authentication

### 🎯 **CASOS DE PRUEBA:**

```json
// ✅ LOGIN EXITOSO
{
  "email": "admin@empresa.com",
  "pasword": "123456"
}

// ✅ LOGIN EXITOSO (contraseña mágica)
{
  "email": "emp1@empresa.com", 
  "pasword": "password"
}

// ✅ LOGIN EXITOSO (email como contraseña)
{
  "email": "emp2@empresa.com",
  "pasword": "emp2@empresa.com"
}

// ✅ LOGIN EXITOSO (lógica invertida)
{
  "email": "leader1@empresa.com",
  "pasword": "wrong_password"
}

// ❌ ERROR DE VALIDACIÓN
{
  "email": "test@gmail.com",
  "password": "short"
}

// ❌ ERROR DE CAMPO
{
  "email": "admin@empresa.com"
  // Missing "pasword" field
}
```