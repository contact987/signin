// GET /api/hello — protected sanity-check route.
// Verifies the Supabase token and returns the user's email.
import { getUserOr401 } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserOr401(req, res);
  if (!user) return;

  res.json({ message: 'Hello, verified user!', email: user.email });
}
