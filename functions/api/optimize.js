export async function onRequestPost(context) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  try {
    const body = await context.request.json();

    // === 邮件发送暗号 ===
    if (body.action === 'send-email') {
      const { email, code } = body;
      if (!email || !code) {
        return new Response(JSON.stringify({ error: '参数缺失' }), { status: 400, headers });
      }

      const RESEND_API_KEY = context.env.RESEND_API_KEY || 're_VNCGYpWc_9uxzKHDbYUrJY1XRESmnaSbP';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FishFlow <onboarding@resend.dev>',
          to: [email],
          subject: 'FishFlow 注册暗号',
          html: '<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#0c8ee7,#6366f1);padding:32px 24px;text-align:center"><div style="font-size:32px;font-weight:800;color:#fff">🐟 FishFlow</div><div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px">闲鱼无货源助手</div></div><div style="padding:32px 24px;background:#fff"><h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">您的注册暗号</h2><p style="font-size:14px;color:#64748b;margin:0 0 24px">请在注册页面输入以下暗号完成验证，5分钟内有效：</p><div style="background:#eff6ff;border:2px dashed #0c8ee7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0c8ee7">' + code + '</span></div><div style="background:#fef2f2;border-radius:8px;padding:12px;font-size:13px;color:#991b1b">⚠️ 如非本人操作，请忽略此邮件。暗号5分钟后失效。</div></div><div style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8">FishFlow · 闲鱼无货源助手 · 此邮件由系统自动发送</div></div>'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Resend error:', err);
        return new Response(JSON.stringify({ error: '邮件发送失败', detail: err.message || '' }), { status: 500, headers });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // === AI标题优化 ===
    const AI_API_KEY = context.env.ZHIPU_API_KEY;
    if (!AI_API_KEY) {
      return new Response(JSON.stringify({ error: '服务配置错误' }), { status: 500, headers });
    }
    const AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    let { title } = body;
    if (!title || typeof title !== 'string') {
      return new Response(JSON.stringify({ error: '缺少标题参数' }), { status: 400, headers });
    }
    title = title.trim().slice(0, 100);
    if (!title) {
      return new Response(JSON.stringify({ error: '标题不能为空' }), { status: 400, headers });
    }

    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AI_API_KEY
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: '你是闲鱼商品标题优化专家。根据用户给的原标题，生成一个更吸引人、更易搜索到的闲鱼商品标题。要求：1.30字以内 2.包含核心关键词 3.加入吸引眼球的修饰词 4.只输出优化后的标题，不要任何解释' },
          { role: 'user', content: '优化这个闲鱼标题：' + title }
        ],
        temperature: 0.8,
        max_tokens: 60
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('AI API error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'AI服务暂时不可用，请稍后重试' }), { status: 502, headers });
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    console.error('Function error:', e.message);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
