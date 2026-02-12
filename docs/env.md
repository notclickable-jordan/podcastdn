# Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Public URL of your app | Yes |
| `NEXTAUTH_SECRET` | Random secret for session encryption | Yes |
| `AUTH_TRUST_HOST` | Trust the `X-Forwarded-Host` header (set to `true` for Docker/proxy) | No |
| `AWS_REGION` | AWS region for S3 | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `S3_BUCKET_NAME` | S3 bucket name | Yes |
| `CLOUDFRONT_DOMAIN` | CloudFront distribution domain | No |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID (for cache invalidation) | No |
| `CUSTOM_DOMAIN` | Fully qualified custom domain for media URLs (e.g. `https://media.example.com`) | No |
| `POLLING_INTERVAL_MINUTES` | How often to check for new playlist videos (default: 60) | No |