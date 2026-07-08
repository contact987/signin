// /api/transactions
//   GET  — list the current user's transactions (newest first)
//   POST — create a transaction owned by the current user
import { supabase, getUserOr401, pickEditable } from '../_lib.js';

export default async function handler(req, res) {
  const user = await getUserOr401(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const fields = pickEditable(req.body);

    if (fields.type !== 'income' && fields.type !== 'expense') {
      return res.status(400).json({ error: "type must be 'income' or 'expense'" });
    }
    if (fields.amount === undefined || isNaN(Number(fields.amount))) {
      return res.status(400).json({ error: 'amount must be a number' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...fields, user_id: user.id })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
