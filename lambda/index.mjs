// index.mjs v4: Active-Passive Failover
import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const NOVA_API_KEY = process.env.NOVA_API_KEY || '';
const NOVA_API_URL = process.env.NOVA_API_URL || 'https://api.nova.amazon.com/v1/chat/completions';
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
const MAX_MESSAGES = 20;
const MAX_TOKENS_LIMIT = 1024;
const MAX_CONTENT_LENGTH = 5000;

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,POST' }, body: JSON.stringify(obj) };
}

async function generateImageWithCanvas(prompt) {
  const command = new InvokeModelCommand({ modelId: "amazon.nova-canvas-v1:0", body: JSON.stringify({ taskType: "TEXT_IMAGE", textToImageParams: { text: prompt }, imageGenerationConfig: { width: 800, height: 400, numberOfImages: 1, quality: "standard" } }), contentType: "application/json", accept: "application/json" });
  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.images[0];
}

async function callNovaNative(messages, temperature, maxTokens) {
  const response = await fetch(NOVA_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NOVA_API_KEY}` }, body: JSON.stringify({ model: 'nova-2-lite-v1', messages, temperature: temperature ?? 0.8, max_tokens: Math.min(maxTokens ?? 1024, MAX_TOKENS_LIMIT) }) });
  if (!response.ok) throw new Error(`Nova Native failed: ${response.status}`);
  return await response.json();
}

async function callNovaViaBedrock(messages, temperature, maxTokens) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  const convertedMessages = chatMessages.map(msg => {
    if (typeof msg.content === 'string') return { role: msg.role, content: [{ text: msg.content }] };
    const content = msg.content.map(part => {
      if (part.type === 'text') return { text: part.text };
      if (part.type === 'image_url') { const base64 = part.image_url.url.replace(/^data:image\/\w+;base64,/, ''); return { image: { format: 'jpeg', source: { bytes: base64 } } }; }
      return { text: JSON.stringify(part) };
    });
    return { role: msg.role, content };
  });
  const command = new ConverseCommand({ modelId: 'amazon.nova-lite-v1:0', system: systemMessages.length > 0 ? [{ text: systemMessages.map(m => m.content).join('\n') }] : undefined, messages: convertedMessages, inferenceConfig: { temperature: temperature ?? 0.8, maxTokens: Math.min(maxTokens ?? 1024, MAX_TOKENS_LIMIT) } });
  const response = await bedrockClient.send(command);
  const text = response.output?.message?.content?.[0]?.text || '';
  return { choices: [{ message: { role: 'assistant', content: text }, finish_reason: response.stopReason || 'stop' }], usage: response.usage, _source: 'bedrock-failover' };
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || 'GET';
  if (method === 'OPTIONS') return json(204, {});
  const path = event?.rawPath || event?.path || '';
  if (path.endsWith('/health')) return json(200, { status: 'ok', hasKey: !!NOVA_API_KEY, timestamp: new Date().toISOString() });
  if (method !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (path.endsWith('/api/image')) {
    let body; try { body = JSON.parse(event?.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
    if (!body.prompt) return json(400, { error: 'prompt is required' });
    try { const base64Image = await generateImageWithCanvas(body.prompt); return json(200, { image: base64Image }); }
    catch (err) { console.error('Canvas error:', err.message); return json(502, { error: 'Image generation failed', detail: err.message }); }
  }
  if (!NOVA_API_KEY) return json(500, { error: 'NOVA_API_KEY not configured' });
  let body; try { body = JSON.parse(event?.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const messages = body.messages || [];
  if (messages.length > MAX_MESSAGES) return json(400, { error: 'Conversation too long' });
  for (const msg of messages) { const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content); if (content.length > MAX_CONTENT_LENGTH) return json(400, { error: 'Message too long' }); }
  const temperature = body.temperature ?? 0.8;
  const maxTokens = body.max_tokens ?? 1024;
  try {
    console.log('Calling Nova Native API...');
    const result = await callNovaNative(messages, temperature, maxTokens);
    return json(200, result);
  } catch (primaryErr) {
    console.warn('Nova Native failed, switching to Bedrock...', primaryErr.message);
    try { const result = await callNovaViaBedrock(messages, temperature, maxTokens); console.log('Bedrock failover succeeded'); return json(200, result); }
    catch (failoverErr) { return json(502, { error: 'All AI endpoints unavailable', detail: `Primary: ${primaryErr.message} | Failover: ${failoverErr.message}` }); }
  }
};
