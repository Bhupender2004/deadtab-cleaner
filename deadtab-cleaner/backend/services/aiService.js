/**
 * AI Service – Anthropic Claude integration for note generation
 */
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../db/supabaseClient');

const AI_MODEL = 'claude-sonnet-4-20250514';

/**
 * Generate an AI note for a given archive.
 * @param {Object} params - Archive data
 * @param {string} params.archiveId
 * @param {string} params.url
 * @param {string} params.title
 * @param {string} params.domain
 * @param {string} params.pageTextSnippet
 */
async function generateNote({ archiveId, url, title, domain, pageTextSnippet }) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `Analyze this archived browser tab and return raw JSON only (no markdown, no code fences, no explanation).

Tab details:
- Title: ${title}
- URL: ${url}
- Domain: ${domain}
- Page text snippet: ${(pageTextSnippet || '').slice(0, 400)}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence summary of what this page is about",
  "intent": "short phrase describing why someone likely opened this tab",
  "tags": ["2 to 4 lowercase topic tags"],
  "readTimeSeconds": integer estimate of how long it takes to read the full page
}`;

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the text response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON if wrapped in backticks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseError) {
      console.error('AI response parse error:', parseError);
      console.error('Raw response:', responseText);
      parsed = {
        summary: 'AI note generation failed — could not parse response.',
        intent: 'unknown',
        tags: [],
        readTimeSeconds: 0,
      };
    }

    // Save note to database
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        archive_id: archiveId,
        summary: parsed.summary || '',
        intent_tag: parsed.intent || '',
        topic_tags: parsed.tags || [],
        read_time_seconds: parsed.readTimeSeconds || 0,
        ai_model: AI_MODEL,
      })
      .select()
      .single();

    if (error) {
      console.error('Save note to DB error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`AI note generated for archive ${archiveId}:`, note.id);
    return note;
  } catch (error) {
    console.error(`AI service error for archive ${archiveId}:`, error);
    throw error;
  }
}

module.exports = { generateNote };
