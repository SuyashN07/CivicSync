import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { image, description } = await req.json();

    if (!image || !description) {
      return NextResponse.json(
        { error: 'Image (base64) and description are required.' },
        { status: 400 }
      );
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: `Analyze this citizen-reported community issue. Description: "${description}".` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.INTEGER },
            automaticDepartmentRouting: { type: Type.STRING },
          },
          required: ['category', 'severity', 'automaticDepartmentRouting'],
        },
      }
    });

    if (!response.text) {
      throw new Error('No response from Gemini API');
    }

    const result = JSON.parse(response.text.trim());
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analyze Issue API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
