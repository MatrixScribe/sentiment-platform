import { db } from '../../config/db.js';

export async function listProducts(req, res) {
  const result = await db.query(
    `SELECT p.*, o.name AS operator_name
     FROM products p
     LEFT JOIN operators o ON p.operator_id = o.id
     ORDER BY p.name ASC`
  );

  res.json({ success: true, products: result.rows });
}

export async function toggleProduct(req, res) {
  const { id } = req.params;
  const { active } = req.body;

  await db.query(
    `UPDATE products SET is_active = $2 WHERE id = $1`,
    [id, active]
  );

  res.json({ success: true });
}
