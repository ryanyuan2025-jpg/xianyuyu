exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, code } = JSON.parse(event.body);
    
    if (!email || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: '参数缺失' }) };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: '邮件服务未配置' }) };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FishFlow <onboarding@resend.dev>',
        to: [email],
        subject: 'FishFlow 注册暗号',
        html: `
          <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;border-radius:16px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0c8ee7,#6366f1);padding:32px 24px;text-align:center">
              <div style="font-size:32px;font-weight:800;color:#fff">🐟 FishFlow</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px">闲鱼无货源助手</div>
            </div>
            <div style="padding:32px 24px;background:#fff">
              <h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">您的注册暗号</h2>
              <p style="font-size:14px;color:#64748b;margin:0 0 24px">请在注册页面输入以下暗号完成验证，5分钟内有效：</p>
              <div style="background:#eff6ff;border:2px dashed #0c8ee7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0c8ee7">${code}</span>
              </div>
              <div style="background:#fef2f2;border-radius:8px;padding:12px;font-size:13px;color:#991b1b">
                ⚠️ 如非本人操作，请忽略此邮件。暗号5分钟后失效。
              </div>
            </div>
            <div style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8">
              FishFlow · 闲鱼无货源助手 · 此邮件由系统自动发送
            </div>
          </div>
        `
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '邮件发送失败', detail: err.message || '' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Send error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: '服务器错误' }) };
  }
};
