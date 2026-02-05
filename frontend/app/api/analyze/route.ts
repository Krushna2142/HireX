/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import * as pdfParseModule from 'pdf-parse'

const pdfParse = pdfParseModule as unknown as (
  buffer: Buffer
) => Promise<{ text: string }>

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type NlpResponse = {
  summary: string
  titles: string[]
  skills: string[]
  location?: string | null
  missing_skills?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'file is required (PDF)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // ✅ THIS NOW WORKS
    const parsed = await pdfParse(buffer)
    const text = parsed.text?.slice(0, 150_000) ?? ''

    // Call Python NLP service
    const NLP_URL =
      process.env.NLP_SERVICE_URL || 'http://localhost:8000/analyze'

    const nlpRes = await fetch(NLP_URL, {
  method: 'POST',
  body: form,  // Send FormData directly
});

    if (!nlpRes.ok) {
      const t = await nlpRes.text()
      return NextResponse.json(
        { error: `NLP service failed: ${t}` },
        { status: 502 }
      )
    }

    const nlp: NlpResponse = await nlpRes.json()

    return NextResponse.json({
      preview: nlp.summary,
      titles: nlp.titles,
      skills: nlp.skills,
      location: nlp.location ?? null,
      missingSkills: nlp.missing_skills ?? [],
      textLength: text.length,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: err?.message ?? 'Analyze failed' },
      { status: 500 }
    )
  }
}
