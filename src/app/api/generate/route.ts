import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { task } = await req.json();

    if (!task) {
      return NextResponse.json(
        { error: 'Task is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are a productivity assistant. Given the following main task, generate 3 to 5 short, actionable, and specific subtasks to accomplish it. The subtasks should be in Indonesian.
    
IMPORTANT: Return ONLY a valid JSON array of strings. Do not include markdown formatting, backticks, or any conversational text.

Example format:
["Beli bahan kue", "Panaskan oven", "Campur adonan"]

Main task: "${task}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate subtasks' },
        { status: response.status }
      );
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Clean up potential markdown formatting if the AI still outputs it
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.substring(7);
    } else if (text.startsWith('```')) {
      text = text.substring(3);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    
    text = text.trim();

    try {
      const subtasks = JSON.parse(text);
      if (!Array.isArray(subtasks)) {
        throw new Error('Not an array');
      }
      return NextResponse.json({ subtasks });
    } catch (parseError) {
      console.error('Failed to parse JSON:', text);
      return NextResponse.json(
        { error: 'Invalid format from AI' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating subtasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
