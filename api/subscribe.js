// Vercel Serverless Function — POST /api/subscribe
// Inserts an email into Supabase email_signups table
// No npm dependencies — uses native fetch (available in Vercel Edge/Node 18+)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for the landing page
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body
  const { email } = req.body || {};

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Normalize
  const normalizedEmail = email.toLowerCase().trim();

  // Insert into Supabase
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/email_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        source: 'landing_page',
      }),
    });

    // 201 = created, 409 = duplicate (unique constraint on email)
    if (response.status === 201) {
      return res.status(200).json({ success: true, message: 'Signed up successfully' });
    }

    if (response.status === 409) {
      // Already signed up — still show success to the user (don't leak info)
      return res.status(200).json({ success: true, message: 'Signed up successfully' });
    }

    // Something else went wrong
    const errorText = await response.text();
    console.error('Supabase insert failed:', response.status, errorText);
    return res.status(500).json({ error: 'Failed to save signup' });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
