import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client for RunPod Endpoint
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-mo-2",
  endpoint: process.env.AWS_ENDPOINT_URL || "https://s3api-us-mo-2.runpod.io",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to ArrayBuffer, then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const key = `listings/${uniqueFilename}`;

    const bucketName = process.env.S3_BUCKET_NAME!;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' // Just in case, though the bucket should probably be publicly accessible by policy
    });

    await s3.send(command);

    // Construct the public URL returned back to the front-end
    const publicUrl = `${process.env.AWS_ENDPOINT_URL}/${bucketName}/${key}`;

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
