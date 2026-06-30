# Cloudflare R2 Configuration Guide

## Required Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT="https://167edd647df28446806d06fa63c7b6d5.r2.cloudflarestorage.com"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="izeus-erp"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-c1dbdb65a74543eba72d10ce77138ac2.r2.dev"
```

## How to Get These Values

1. **CLOUDFLARE_R2_ENDPOINT**: Your S3 API endpoint from Cloudflare R2 dashboard
2. **CLOUDFLARE_R2_ACCESS_KEY_ID**: Create R2 API tokens in Cloudflare dashboard
3. **CLOUDFLARE_R2_SECRET_ACCESS_KEY**: Secret key from R2 API tokens
4. **CLOUDFLARE_R2_BUCKET_NAME**: Your bucket name (izeus-erp)
5. **CLOUDFLARE_R2_PUBLIC_URL**: Public development URL from your bucket settings

## Creating R2 API Tokens

1. Go to Cloudflare Dashboard → R2 → Manage R2 API tokens
2. Create a new API token with:
   - Permissions: Object Read & Write
   - Bucket: izeus-erp (or All buckets)
3. Copy the Access Key ID and Secret Access Key

## File Upload Endpoints

Once configured, the following endpoints will be available:

- `POST /files/upload` - Upload a file
- `GET /files/:id` - Get file metadata
- `GET /files/:id/download` - Generate download URL
- `GET /files/entity/:entityType/:entityId` - Get files for entity
- `DELETE /files/:id` - Delete a file

## File Upload Example

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@example.pdf" \
  -F "entityType=project" \
  -F "entityId=PROJECT_ID" \
  http://localhost:3000/files/upload
```

## Supported File Types

- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- Text: Plain text, CSV
- Archives: ZIP, RAR

## File Size Limit

Maximum file size: 10MB per file

## Security Features

- JWT authentication required
- File type validation
- File size limits
- Soft delete (files are marked as deleted, not permanently removed)
- Permission checks (only file uploader can delete)
