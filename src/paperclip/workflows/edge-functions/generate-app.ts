// Supabase Edge Function: AI App Generator
// Endpoint: /functions/v1/generate-app
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

serve(async (req) => {
  const { prompt, language, framework } = await req.json()
  const anthropic = new Anthropic()

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 65536,
    messages: [{ role: 'user', content: `Generate a complete production app: ${prompt}. Language: ${language || 'TypeScript'}. Framework: ${framework || 'Next.js 14'}. Include all files, Supabase integration, Stripe billing, and deployment config.` }]
  })

  return new Response(JSON.stringify({ app: response.content[0].text }), {
    headers: { 'Content-Type': 'application/json' }
  })
})