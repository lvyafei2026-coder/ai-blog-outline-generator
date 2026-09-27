export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.includes('/api/') && request.method === 'POST') {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/$/, '');

  if (!path.endsWith('/api/generate-outline')) {
    return json({ error: 'Not found' }, 404);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { success } = await env.AI_RATE_LIMITER.limit({ key: 'blog-outline:' + ip });

  if (!success) {
    return json({
      error: 'Too many requests. Please wait a minute and try again.',
      code: 'RATE_LIMITED'
    }, 429);
  }

  return handleGenerate(request, env);
}

const DEPTH_PROMPTS = {
  brief: 'Write a brief outline with 3-4 H2 sections and 1-2 H3 subsections each. Keep it focused.',
  standard: 'Write a standard outline with 5-6 H2 sections and 2-3 H3 subsections each. Each section should have 2-3 bullet points.',
  detailed: 'Write a detailed outline with 7-9 H2 sections and 2-4 H3 subsections each. Each section should have 3-5 bullet points. Include specific examples, data points, or questions to answer.'
};

const TONE_PROMPTS = {
  professional: 'Use a clear, professional tone suitable for a business or industry blog.',
  conversational: 'Use a friendly, conversational tone as if writing to a smart friend.',
  technical: 'Use a precise, technical tone. Assume the reader has some domain knowledge.',
  beginner: 'Write for complete beginners. Avoid jargon and explain every concept.'
};

async function handleGenerate(request, env) {
  try {
    const body = await request.json();
    const topic = (body.topic || '').trim();
    const keywords = (body.keywords || '').trim();
    const audience = (body.audience || '').trim();
    const depth = body.depth || 'standard';
    const tone = body.tone || 'professional';

    if (!topic || topic.length < 5) {
      return json({ error: 'Topic must be at least 5 characters.' }, 400);
    }

    const systemPrompt = 'You are an expert content strategist who writes blog post outlines. You output ONLY the outline, in clean Markdown, with no preamble or explanation. Start directly with the first H2 section.';

    let userPrompt = 'Topic: ' + topic + '\n';
    if (keywords) userPrompt += 'Target keywords: ' + keywords + '\n';
    if (audience) userPrompt += 'Target audience: ' + audience + '\n';
    userPrompt += '\n';

    userPrompt += 'Instructions:\n';
    userPrompt += '- ' + (DEPTH_PROMPTS[depth] || DEPTH_PROMPTS.standard) + '\n';
    userPrompt += '- ' + (TONE_PROMPTS[tone] || TONE_PROMPTS.professional) + '\n';
    userPrompt += '- Use H2 (##) for main sections and H3 (###) for subsections.\n';
    userPrompt += '- Under each H3, write 2-5 bullet points describing what that section should cover.\n';
    userPrompt += '- After the outline, add a section titled "## Suggested Meta Description" with a single 150-160 character description.\n';
    userPrompt += '- Do NOT write the article itself. This is an outline only.\n';

    if (keywords) {
      userPrompt += '- Naturally work the target keywords into section titles where it makes sense. Do not force them.\n';
    }

    userPrompt += '\nWrite the outline now.';

    const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const output = (response.response || '').trim();

    if (!output) {
      return json({ error: 'Model returned empty output. Please try again.' }, 500);
    }

    return json({ output: output });
  } catch (err) {
    console.error('Generate error:', err);
    return json({ error: 'Processing failed. Please try again in a moment.' }, 500);
  }
}
