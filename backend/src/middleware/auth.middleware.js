const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { secret, jwtOptions } = require('../config/security');
async function authRequired(req, res, next) {
  const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ message: 'Token requerido' });
  let decoded;
  try { decoded = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer: jwtOptions.issuer, audience: jwtOptions.audience }); }
  catch { return res.status(401).json({ message: 'Token inválido o expirado' }); }
  try {
    const [rows] = await pool.query('SELECT id, email, nombre, role, is_active FROM users WHERE id = ? LIMIT 1', [decoded.id]);
    const user = rows[0];
    if (!user || Number(user.is_active) !== 1) return res.status(401).json({ message: 'Usuario inactivo' });
    if (typeof decoded.jti !== 'string') return res.status(401).json({message: 'Sesión inválida'});
    const [session] = await pool.query("UPDATE auth_sessions SET last_seen = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND expires_at > UTC_TIMESTAMP() AND last_seen > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)", [decoded.jti, user.id]);
    if (!session.affectedRows) return res.status(401).json({message: 'Sesión vencida o revocada'});
    req.sessionId = decoded.jti;
    req.user = user;
    next();
  } catch (error) { next(error); }
}
function coordOnly(req, res, next) {
  if (req.user?.role !== 'COORD') return res.status(403).json({ message: 'Requiere rol COORD' });
  next();
}
module.exports = { authRequired, coordOnly };
