// AI Service — handles communication with local Ollama

import { getSettings } from '../store/store';

function getBaseUrl() {
    return getSettings().ollamaUrl || 'http://localhost:11434';
}

/**
 * Check if Ollama is running and reachable
 * @returns {Promise<{connected: boolean, message: string}>}
 */
export async function checkConnection() {
    try {
        const res = await fetch(getBaseUrl(), { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const text = await res.text(); // Ollama replies with "Ollama is running"
            return { connected: true, message: text };
        }
        return { connected: false, message: `Status: ${res.status}` };
    } catch (err) {
        return { connected: false, message: err.message };
    }
}

/**
 * List available Ollama models
 * @returns {Promise<Array<{name: string, size: number}>>}
 */
export async function listModels() {
    const res = await fetch(`${getBaseUrl()}/api/tags`);
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const data = await res.json();
    return data.models || [];
}

/**
 * Chat with a model — streaming
 * @param {string} model - Model name
 * @param {Array<{role: string, content: string}>} messages - Chat history
 * @param {Function} onToken - Callback for streaming text: (token, fullText)
 * @param {AbortSignal} signal - Signal to abort the request
 * @returns {Promise<string>} - The final complete response
 */
export async function chat(model, messages, onToken, signal) {
    const res = await fetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
        }),
        signal,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Chat failed (${res.status}): ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Ollama sends JSON per line, chunk could have multiple lines
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    if (onToken) onToken(json.message.content, fullResponse);
                }
                if (json.done) return fullResponse;
            } catch (err) {
                // Skip malformed lines
            }
        }
    }

    return fullResponse;
}

/**
 * Generate text from a prompt — non-streaming (Used for quick actions if needed)
 */
export async function generate(model, prompt) {
    const res = await fetch(`${getBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            stream: false,
        }),
    });

    if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
    const data = await res.json();
    return data.response;
}

/**
 * Build a system prompt from a character's data
 */
export function buildSystemPrompt(character) {
    const parts = [
        `You are roleplaying as "${character.name}".`,
    ];

    if (character.personality) {
        parts.push(`Personality: ${character.personality}`);
    }
    if (character.backstory) {
        parts.push(`Backstory: ${character.backstory}`);
    }
    if (character.voiceStyle) {
        parts.push(`Speaking style: ${character.voiceStyle}`);
    }

    parts.push(
        'Stay in character at all times. Respond naturally as this character would.',
        'Do not break character or mention that you are an AI.',
        'Keep responses conversational and engaging, matching the character\'s personality.'
    );

    return parts.join('\n\n');
}

/**
 * Generate story dialogues using AI
 */
export async function generateStoryDialogues(
    model, characters, scenePrompt, storyTitle, storyDescription,
    existingDialogues, dialogueCount, onProgress, signal
) {
    // 1. Prepare descriptions of involved characters
    const charDescriptions = characters.map(c =>
        `- "${c.name}" (ID: ${c.id}): ${c.personality || 'No personality set'}. Voice style: ${c.voiceStyle || 'neutral'}. Backstory: ${c.backstory || 'none'}.`
    ).join('\n');

    // 2. Prepare context of what happened so far
    const existingContext = existingDialogues.length > 0
        ? `\n\nExisting dialogue so far:\n${existingDialogues.map(d => {
            if (d.isNarration) return `[Narration]: ${d.text}`;
            const char = characters.find(c => c.id === d.characterId);
            return `${char?.name || 'Unknown'}: ${d.text}`;
        }).join('\n')}`
        : '';

    // 3. The precise prompt for JSON array output
    const systemPrompt = `You are a creative story writer. You write interactive chat-style novel content similar to the Joylada app.
You generate dialogue and narration for stories in a structured JSON format.

IMPORTANT RULES:
- Write dialogue that matches each character's personality and voice style
- Include narration for scene-setting, emotions, and actions
- Each dialogue line should be natural and conversational
- Make the story engaging, dramatic, and immersive
- Characters should stay in character at all times
- Mix dialogue and narration for a rich reading experience
- Respond ONLY with a valid JSON array, no other text`;

    const userPrompt = `Story Title: "${storyTitle || 'Untitled'}"
Story Description: ${storyDescription || 'No description'}

Characters in this story:
${charDescriptions}
${existingContext}

Scene instruction: ${scenePrompt}

Generate approximately ${dialogueCount} dialogue/narration lines continuing the story.

Respond with ONLY a JSON array of objects. Each object must have:
- "characterId": the character's ID string (use one from the list above), or "narrator" for narration
- "text": the dialogue or narration text
- "isNarration": boolean (true for narration, false for character dialogue)

Example format:
[
  {"characterId": "narrator", "text": "The moonlight cast long shadows through the ancient library windows.", "isNarration": true},
  {"characterId": "abc123", "text": "I've been waiting for you.", "isNarration": false},
  {"characterId": "narrator", "text": "She turned slowly, her eyes glowing with an otherworldly light.", "isNarration": true},
  {"characterId": "def456", "text": "What happened here?", "isNarration": false}
]

JSON array:`;

    onProgress?.('🤖 Generating story...');

    // 4. Send to Ollama
    const res = await fetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            stream: true,
            options: {
                temperature: 0.8,
                top_p: 0.9
            }
        }),
        signal
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Generation failed (${res.status}): ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    // Provide a status update of progress length
                    onProgress?.('🤖 Generating story... ' + Math.min(fullResponse.length, 500) + ' chars');
                }
            } catch (err) {
                // Skip
            }
        }
    }

    if (!fullResponse.trim()) {
        throw new Error('AI returned an empty response.');
    }

    onProgress?.('📝 Parsing dialogues...');

    // 5. Cleanup the response to ensure it parses as JSON array
    let jsonStr = fullResponse.trim();
    // Strip markdown code blocks if the AI added them
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
    }

    // Fallback: Try to find the first [ and last ]
    const arrayStart = jsonStr.indexOf('[');
    const arrayEnd = jsonStr.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
        jsonStr = jsonStr.substring(arrayStart, arrayEnd + 1);
    }

    try {
        const dialogues = JSON.parse(jsonStr);
        if (!Array.isArray(dialogues)) {
            throw new Error('Response is not a JSON array.');
        }

        // Validate structure
        return dialogues
            .filter(d => d && typeof d.text === 'string' && d.text.trim())
            .map(d => ({
                characterId: d.isNarration ? '' : (d.characterId || ''),
                text: d.text.trim(),
                isNarration: Boolean(d.isNarration)
            }));
    } catch (parseErr) {
        console.error('Failed JSON string:', jsonStr);
        throw new Error(`Failed to parse AI response as dialogue. Raw output:\n${fullResponse.substring(0, 500)}`);
    }
}

/**
 * Auto-generate a character based on a short description
 */
export async function generateCharacter(model, prompt) {
    const systemPrompt = `You are an expert creative writer and character designer for narratives.
Your task is to take a short prompt and expand it into a fully fleshed out character profile.
You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting like \`\`\`json. 

The JSON object must have exactly these keys:
- "name": A creative and fitting name for the character.
- "personality": 2-3 sentences describing their mindset, traits, and quirks.
- "backstory": A compelling 3-4 sentence origin story or motivation.
- "voiceStyle": One descriptive word or short phrase describing how they speak (e.g., "Sarcastic", "Soft-spoken", "Booming", "Mysterious").
- "genres": An array of 1 to 3 strings representing the genres they best fit in (e.g., ["Fantasy", "Action"], MUST be chosen from common Joylada genres like Romance, Fantasy, Horror, Sci-Fi, Slice of Life, Mystery, Thriller, Fanfiction, Action).

Prompt to expand: "${prompt}"`;

    const res = await fetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'user', content: systemPrompt }
            ],
            stream: false,
            options: {
                temperature: 0.8,
            }
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to generate character (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    let jsonStr = data.message?.content || '';

    // Clean up response if the model still outputs markdown
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
    }

    // Fallback: try to extract JSON object
    const objStart = jsonStr.indexOf('{');
    const objEnd = jsonStr.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) {
        jsonStr = jsonStr.substring(objStart, objEnd + 1);
    }

    try {
        const charData = JSON.parse(jsonStr);
        return charData;
    } catch (err) {
        throw new Error(`Failed to parse AI output as JSON. Raw output: ${jsonStr.substring(0, 200)}...`);
    }
}
