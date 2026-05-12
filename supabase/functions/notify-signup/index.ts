Deno.serve(async (req) => {
  const { record } = await req.json()
  const email = record?.email ?? 'unknown'
  const createdAt = record?.created_at ?? new Date().toISOString()

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer re_QCFVophF_6M4dsrL1dM1nNhzebMQP1d5Q',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Arcadia Duels <onboarding@resend.dev>',
      to: 'vmb4manager@gmail.com',
      subject: '🎮 New player joined Arcadia!',
      html: `
        <h2>New signup on Arcadia Duels</h2>
        <p><b>Email:</b> ${email}</p>
        <p><b>Signed up:</b> ${new Date(createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</p>
      `,
    }),
  })

  return new Response('ok', { status: 200 })
})
