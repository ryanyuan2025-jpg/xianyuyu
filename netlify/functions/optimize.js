exports.handler = async (event) => {
  // 安全头
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // 请求体大小限制 (1KB)
  if (event.body && event.body.length > 1024) {
    return { statusCode: 413, headers, body: JSON.stringify({ error: '请求体过大' }) };
  }

  const AI_API_KEY = process.env.ZHIPU_API_KEY;
  if (!AI_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: '服务配置错误' }) };
  }
  const AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  try {
    const body = JSON.parse(event.body);
    let { title } = body;

    if (!title || typeof title !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少标题参数' }) };
    }

    // 清洗输入：去首尾空白，限制长度
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
        model: 'glm-4.7-flash',
        messages: [
          {
            role: 'system',
            content: '你是闲鱼商品标题优化专家。根据用户给的原标题，生成一个更吸引人、更易搜索到的闲鱼商品标题。要求：1.30字以内 2.包含核心关键词 3.加入吸引眼球的修饰词 4.只输出优化后的标题，不要任何解释'
          },
          { role: 'user', content: '优化这个闲鱼标题：' + title }
        ],
        temperature: 0.8,
        max_tokens: 512
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // 不向客户端暴露API错误细节
      console.error('AI API error:', JSON.stringify(data));
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI服务暂时不可用，请稍后重试' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (e) {
    console.error('Function error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '服务器内部错误' }) };
  }
};