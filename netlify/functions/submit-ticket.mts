import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
]);

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const PRICE_MAP: Record<string, number> = {
  General: 250,
  VIP: 500,
  VVIP: 750,
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseBucket = process.env.SUPABASE_BUCKET || 'ticket-uploads';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return json({ error: 'Server is not configured for submissions.' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    console.error('Failed to parse form data', error);
    return json({ error: 'Invalid form submission.' }, 400);
  }

  const fullName = String(formData.get('Full_Name') || '').trim();
  const email = String(formData.get('Email') || '').trim();
  const ticketType = String(formData.get('Ticket_Type') || '').trim();
  const proof = formData.get('proofOfPayment');

  if (!fullName || !email || !ticketType) {
    return json({ error: 'Missing required fields' }, 400);
  }

  if (!(proof instanceof File) || proof.size === 0) {
    return json({ error: 'Proof of payment file is required' }, 400);
  }

  if (proof.size > MAX_FILE_BYTES) {
    return json({ error: 'File exceeds 5MB limit.' }, 400);
  }

  if (!ALLOWED_MIME.has(proof.type)) {
    return json({ error: 'Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.' }, 400);
  }

  const price = PRICE_MAP[ticketType] ?? 250;
  const originalName = proof.name || 'proof-of-payment';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `ticket-proofs/${Date.now()}-${safeName}`;
  const fileBuffer = new Uint8Array(await proof.arrayBuffer());

  try {
    const { error: uploadError } = await supabase.storage
      .from(supabaseBucket)
      .upload(storagePath, fileBuffer, {
        contentType: proof.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(supabaseBucket)
      .createSignedUrl(storagePath, 60 * 60 * 24);

    if (signedUrlError || !signedUrlData) {
      throw signedUrlError || new Error('Failed to create signed URL for proof of payment.');
    }

    const ticketRecord = {
      full_name: fullName,
      email,
      ticket_type: ticketType,
      price,
      proof_of_payment_url: signedUrlData.signedUrl,
      submitted_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('tickets').insert(ticketRecord);
    if (insertError) throw insertError;

    await sendNotificationEmail({
      fullName,
      email,
      ticketType,
      price,
      proofBuffer: fileBuffer,
      proofName: originalName,
      proofMime: proof.type,
    });

    return json({
      success: true,
      message: 'Ticket registration submitted successfully.',
    });
  } catch (error) {
    console.error('Error processing submission:', error);
    return json({ error: 'Failed to process ticket registration. Please try again.' }, 500);
  }
};

async function sendNotificationEmail(params: {
  fullName: string;
  email: string;
  ticketType: string;
  price: number;
  proofBuffer: Uint8Array;
  proofName: string;
  proofMime: string;
}) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    console.warn('Email credentials are not configured; skipping notification email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const html = `
    <h2>New Gala Dinner Ticket Registration</h2>
    <p><strong>Name:</strong> ${escapeHtml(params.fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(params.email)}</p>
    <p><strong>Ticket Type:</strong> ${escapeHtml(params.ticketType)}</p>
    <p><strong>Price:</strong> R${params.price}</p>
    <p><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
    <hr>
    <p><em>Proof of payment file attached below</em></p>
  `;

  await transporter.sendMail({
    from: user,
    to: process.env.EMAIL_TO || 'sbongambhele203@gmail.com',
    subject: 'New Gala Dinner Ticket Registration',
    html,
    attachments: [
      {
        filename: params.proofName,
        content: Buffer.from(params.proofBuffer),
        contentType: params.proofMime,
      },
    ],
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const config: Config = {
  path: '/api/submit-ticket',
  method: ['POST', 'OPTIONS'],
};
