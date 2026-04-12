// Supabase Edge Function: Real-time Revenue Dashboard
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_KEY'))

  const { data: dashboard } = await supabase.from('revenue_dashboard').select('*')
  const { data: recentOrders } = await supabase.from('orders').select('*').eq('status', 'paid').order('created_at', { ascending: false }).limit(10)
  const { data: topAffiliates } = await supabase.from('affiliate_stats').select('*').order('revenue', { ascending: false }).limit(5)

  const totals = dashboard?.reduce((acc, row) => ({
    total: acc.total + Number(row.total_revenue),
    mrr: acc.mrr + Number(row.mrr),
    today: acc.today + Number(row.today)
  }), { total: 0, mrr: 0, today: 0 })

  return new Response(JSON.stringify({ totals, breakdown: dashboard, recentOrders, topAffiliates }), {
    headers: { 'Content-Type': 'application/json' }
  })
})