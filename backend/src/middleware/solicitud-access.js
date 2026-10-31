const pool = require('../config/db');
module.exports = function access(mode) {
  return async (req, res, next) => {
    try {
      if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
      const [rows] = await pool.query('SELECT id, owner_user_id, owner_email, assigned_to, estado FROM solicitudes WHERE id = ?', [req.params.id]);
      const item = rows[0];
      if (!item) return res.status(404).json({ message: 'Solicitud no encontrada' });
      const same = value => String(value || '').toLowerCase() === req.user.email.toLowerCase();
      const owner = item.owner_user_id ? Number(item.owner_user_id) === Number(req.user.id) : same(item.owner_email);
      const coord = req.user.role === 'COORD';
      let allowed = mode === 'read' ? owner || coord : mode === 'resubmit' ? owner && item.estado === 'Observado' : coord && same(item.assigned_to);
      if (mode === 'assign') allowed = coord && (!item.assigned_to || same(item.assigned_to));
      if (!allowed) return res.status(403).json({ message: 'Acción no autorizada' });
      if (['manage','assign'].includes(mode) && ['Aprobado','Rechazado'].includes(item.estado)) return res.status(409).json({ message: 'Solicitud cerrada' });
      if (mode === 'assign') {
        const [reviewers] = await pool.query("SELECT id FROM users WHERE email = ? AND role = 'COORD' AND is_active = 1", [req.body.reviewerEmail]);
        if (!reviewers.length) return res.status(400).json({ message: 'Coordinador inválido' });
      }
      next();
    } catch(error) { next(error); }
  };
};
