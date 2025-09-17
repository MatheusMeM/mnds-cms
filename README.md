# mnds-cms - Strapi Backend

Strapi v5 CMS backend for the mnds-site portfolio, with Cloudflare R2 media storage and PostgreSQL database.

## 🚀 Deployment on Render.com

This repository is configured for automatic deployment on Render.com using the `render.yaml` configuration file.

### Prerequisites

- GitHub repository connected to Render.com
- Cloudflare R2 bucket configured
- Environment variables set in Render dashboard

### Environment Variables Required

```bash
# Automatically configured by render.yaml:
NODE_ENV=production
DATABASE_CLIENT=postgres
PGHOST=<auto-configured>
PGPORT=<auto-configured>
PGDATABASE=<auto-configured>
PGUSER=<auto-configured>
PGPASSWORD=<auto-configured>
PGSSL=true

# Manual configuration required:
CF_ACCESS_KEY_ID=your-r2-access-key
CF_ACCESS_SECRET=your-r2-secret-key
CF_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CF_BUCKET=your-bucket-name
CF_PUBLIC_ACCESS_URL=https://pub-your-id.r2.dev
```

### Deployment Steps

1. **Connect Repository**: Link this GitHub repo to Render.com
2. **Auto-deployment**: Render will automatically detect `render.yaml` and create:
   - Web service (mnds-cms)
   - PostgreSQL database (mnds-cms-db)
3. **Configure R2**: Add Cloudflare R2 environment variables manually
4. **First Deploy**: Render will build and deploy automatically

### Post-Deployment

1. Access admin panel at `https://your-app.onrender.com/admin`
2. Create admin user
3. Configure content types (Project, Category, Tag)
4. Run migration script if needed

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run develop

# Run migration script
npm run migrate
```

## 📁 Content Types

- **Project**: Main portfolio projects with media galleries
- **Category**: Project categories (work/project)
- **Tag**: Technology tags for projects

## 🔗 Related Repositories

- Frontend: [mnds-site](https://github.com/MatheusMeM/mnds_site)
- Authentication: [sveltia-cms-auth](https://github.com/MatheusMeM/sveltia-cms-auth)

## 📝 Migration

Use the migration script to import content from the previous Sveltia CMS setup:

```bash
STRAPI_URL=https://your-app.onrender.com \
STRAPI_TOKEN=your-api-token \
npm run migrate
