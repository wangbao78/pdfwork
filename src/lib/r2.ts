import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET || "pdf-toolbox"
const UPLOAD_EXPIRE = 600   // 上传预签名 10 分钟
const DOWNLOAD_EXPIRE = 3600 // 下载预签名 1 小时

export async function getUploadUrl(key: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(r2, cmd, { expiresIn: UPLOAD_EXPIRE })
}

export async function getDownloadUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(r2, cmd, { expiresIn: DOWNLOAD_EXPIRE })
}

export { BUCKET }
