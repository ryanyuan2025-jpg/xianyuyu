const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_VNCGYpWc_9uxzKHDbYUrJY1XRESmnaSbP';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);

    // === 邮件发送暗号 ===
    if (body.action === 'send-email') {
      const { email, code } = body;
      if (!email || !code) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '参数缺失' }) };
      }

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
          html: '<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#0c8ee7,#6366f1);padding:32px 24px;text-align:center"><div style="font-size:32px;font-weight:800;color:#fff">\uD83D\uDC1F FishFlow</div><div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px">\u95F2\u9C7C\u65E0\u8D27\u6E90\u52A9\u624B</div></div><div style="padding:32px 24px;background:#fff"><h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">\u60A8\u7684\u6CE8\u518C\u6697\u53F7</h2><p style="font-size:14px;color:#64748b;margin:0 0 24px">\u8BF7\u5728\u6CE8\u518C\u9875\u9762\u8F93\u5165\u4EE5\u4E0B\u6697\u53F7\u5B8C\u6210\u9A8C\u8BC1\uFF0C5\u5206\u949F\u5185\u6709\u6548\uFF1A</p><div style="background:#eff6ff;border:2px dashed #0c8ee7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0c8ee7">' + code + '</span></div><div style="background:#fef2f2;border-radius:8px;padding:12px;font-size:13px;color:#991b1b">\u26A0\uFE0F \u5982\u975E\u672C\u4EBA\u64CD\u4F5C\uFF0C\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\u3002\u6697\u53F75\u5206\u949F\u540E\u5931\u6548\u3002</div></div><div style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8">FishFlow \xB7 \u95F2\u9C7C\u65E0\u8D27\u6E90\u52A9\u624B \xB7 \u6B64\u90AE\u4EF6\u7531\u7CFB\u7EDF\u81EA\u52A8\u53D1\u9001</div></div>'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Resend error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: '邮件发送失败', detail: err.message || '' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // === AI标题优化 ===
    if (event.body && event.body.length > 1024) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: '请求体过大' }) };
    }

    const AI_API_KEY = process.env.ZHIPU_API_KEY;
    if (!AI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: '服务配置错误' }) };
    }
    const AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    let { title } = body;
    if (!title || typeof title !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少标题参数' }) };
    }
    title = title.trim().slice(0, 100);
    if (!title) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '标题不能为空' }) };
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
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI服务暂时不可用，请稍后重试' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (e) {
    console.error('Function error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '服务器内部错误' }) };
  }
};
