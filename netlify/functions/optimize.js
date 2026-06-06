exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const AI_API_KEY = process.env.ZHIPU_API_KEY;
  if (!AI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: '未配置API Key环境变量' }) };
  }
  const AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  try {
    const body = JSON.parse(event.body);
    const { title } = body;

    if (!title) {
      return { statusCode: 400, body: JSON.stringify({ error: '缺少标题参数' }) };
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
        max_tokens: 60
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: 'AI API错误', detail: data }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: '服务器错误: ' + e.message }) };
  }
};
