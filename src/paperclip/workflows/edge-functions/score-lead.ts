// Supabase Edge Function: AI Lead Scoring
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'
import Anthropic from 'npm:@anthropic-ai/sdk'

serve(async (req) => {
  const { leadId, context } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_KEY'))
  const anthropic = new Anthropic()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()

  const scoring = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `Score this lead 1-10 using BANT framework. Lead: ${JSON.stringify(lead)}. Context: ${context}. Return JSON: { score, budget, authority, need, timeline, recommendation }` }]
  })

  const result = JSON.parse(scoring.content[0].text)
  await supabase.from('leads').update({ score: result.score, metadata: result }).eq('id', leadId)

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
})