import { db } from '../../config/db.js';

export async function listOperators(req, res) {
  const result = await db.query(`SELECT * FROM operators ORDER BY name ASC`);
  res.json({ success: true, operators: result.rows });
}

export async function toggleOperator(req, res) {
  const { id } = req.params;
  const { active } = req.body;

  await db.query(
    `UPDATE operators SET is_active = $2 WHERE id = $1`,
    [id, active]
  );

  res.json({ success: true });
}
