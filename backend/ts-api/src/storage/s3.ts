import Minio from 'minio';


const client = new Minio.Client({
endPoint: process.env.MINIO_ENDPOINT?.split(':')[0] || 'localhost',
port: parseInt(process.env.MINIO_ENDPOINT?.split(':')[1] || '9000'),
useSSL: false,
accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});


const BUCKET = 'resumes';


export async function ensureBucket() {
const exists = await client.bucketExists(BUCKET);
if (!exists) await client.makeBucket(BUCKET);
}


export async function uploadBuffer(key: string, buffer: Buffer, contentType = 'application/pdf') {
await ensureBucket();
await client.putObject(BUCKET, key, buffer, buffer.length, { 'Content-Type': contentType });
return `http://${process.env.MINIO_ENDPOINT || 'localhost:9000'}/${BUCKET}/${key}`; // simple URL for ML service
}