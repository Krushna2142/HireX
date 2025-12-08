/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const name = file.name;
    const type = file.type;
    if (!type?.includes('pdf') && !name?.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `resumes/guest`, resource_type: 'raw', public_id: `${Date.now()}_${name}` },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: uploadResult.secure_url, public_id: uploadResult.public_id });
  } catch (err: any) {
    console.error('[upload] error:', err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}