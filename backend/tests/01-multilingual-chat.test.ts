/** Scenario 1 — Multilingual chatbot: Kannada, English and Hindi support
 *  with conversation state persisting across messages. */
import { describe, expect, it } from 'vitest';
import { ORIGIN, agent, newConversation } from './helpers';

const hasKannada = (s: string) => /[\u0C80-\u0CFF]/.test(s);
const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);
const hasLatin = (s: string) => /[a-zA-Z]{4,}/.test(s);

describe('Scenario 1 — multilingual chatbot (kn/en/hi) with persistent state', () => {
  it('detects Kannada and replies in Kannada', async () => {
    const convId = await newConversation('kn');
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'ನನ್ನ ಏರಿಯಾದಲ್ಲಿ ನೀರಿನ ಸಮಸ್ಯೆ ಇದೆ' });

    expect(res.status).toBe(200);
    expect(String(res.body.assistantMessage.language)).toMatch(/^kn/);
    expect(hasKannada(res.body.assistantMessage.content)).toBe(true);
    expect(res.body.understanding).toBeTruthy();
    expect(res.body.understanding.detected_language).toBe('kn');
  });

  it('detects English and replies in English', async () => {
    const convId = await newConversation('en');
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'There is a huge pothole on my street and bikes are falling' });

    expect(res.status).toBe(200);
    expect(String(res.body.assistantMessage.language)).toMatch(/^en/);
    expect(hasLatin(res.body.assistantMessage.content)).toBe(true);
    expect(res.body.understanding.detected_language).toBe('en');
  });

  it('detects Hindi and replies in Hindi (Devanagari)', async () => {
    const convId = await newConversation('hi');
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'मेरेइलाके में बिजली की समस्या है' });

    expect(res.status).toBe(200);
    expect(String(res.body.assistantMessage.language)).toMatch(/^hi/);
    expect(hasDevanagari(res.body.assistantMessage.content)).toBe(true);
    expect(res.body.understanding.detected_language).toBe('hi');
  });

  it('keeps conversation state across messages and after reload (GET)', async () => {
    const convId = await newConversation('en');
    const first = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'I want to register a complaint about a pothole in Bengaluru Urban' });
    expect(first.status).toBe(200);
    expect(first.body.state.turn).toBeGreaterThanOrEqual(1);

    const second = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'Near Koramangala water tank' });
    expect(second.status).toBe(200);
    expect(second.body.state.turn).toBeGreaterThan(first.body.state.turn);

    // "reload" = fetch conversation + messages from the server again
    const reloaded = await agent
      .get(`/api/chat/conversations/${convId}`)
      .set('Origin', ORIGIN);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.messages).toHaveLength(4);
    expect(reloaded.body.conversation.state.turn).toBe(second.body.state.turn);
    expect(reloaded.body.conversation.language).toBe('en');
  });

  it('never answers more than one question per turn', async () => {
    const convId = await newConversation('en');
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content: 'Hello, I have a complaint' });
    expect(res.status).toBe(200);
    const reply: string = res.body.assistantMessage.content;
    // one follow-up question at a time (≤1 question mark)
    const questions = (reply.match(/\?/g) ?? []).length;
    expect(questions).toBeLessThanOrEqual(1);
  });
});
