export type AIProvider = 'anthropic' | 'openai'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function generateContent(
  prompt: string,
  options: {
    provider?: AIProvider
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  const { provider = 'anthropic', maxTokens = 2000, temperature = 0.7 } = options

  // Use Anthropic via direct API call
  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }] as AnthropicMessage[],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    const textBlock = data.content?.find((block: { type: string }) => block.type === 'text')
    return textBlock?.text || ''
  }

  // Use OpenAI via direct API call
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }] as OpenAIMessage[],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  throw new Error('No AI provider configured')
}

export function parseJsonResponse<T>(response: string): T | null {
  try {
    // Try to extract JSON from the response (non-greedy to avoid over-matching)
    const jsonMatch = response.match(/\{[\s\S]*?\}(?=[^}]*$)|\{[\s\S]*\}/)
    if (jsonMatch) {
      // Try parsing, if fails try to find balanced braces
      try {
        return JSON.parse(jsonMatch[0]) as T
      } catch {
        // Find the first complete JSON object by counting braces
        let depth = 0
        let start = -1
        for (let i = 0; i < response.length; i++) {
          if (response[i] === '{') {
            if (depth === 0) start = i
            depth++
          } else if (response[i] === '}') {
            depth--
            if (depth === 0 && start !== -1) {
              const candidate = response.slice(start, i + 1)
              try {
                return JSON.parse(candidate) as T
              } catch {
                start = -1
              }
            }
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}
