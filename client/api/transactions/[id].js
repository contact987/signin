// /api/transactions/:id
//   PATCH  — update one of the current user's transactions
//   DELETE — delete one of the current user's transactions
import { supabase, getUserOr401, pickEditable } from '../_lib.js';

export default async function handler(req, res) {
  const user = await getUserOr401(req, res);
  if (!user) return;

  const { id } = req.query; // Vercel populates this from the [id] filename

  if (req.method === 'PATCH') {
    const fields = pickEditable(req.body);
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(fields)
      .eq('id', id)
      .eq('user_id', user.id) // can't edit someone else's row
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Transaction not found' });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Transaction not found' });
    return res.json({ deleted: data.id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
