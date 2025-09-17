import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const CONTENT_FILE = process.env.CONTENT_FILE || '../mnds-site/public/data/projects.json';
const MEDIA_DIR = process.env.MEDIA_DIR || '../mnds-site/public/media/projects';

console.log('🚀 Starting migration process...');
console.log(`Strapi URL: ${STRAPI_URL}`);
console.log(`Content file: ${CONTENT_FILE}`);
console.log(`Media directory: ${MEDIA_DIR}`);

async function upsertCategory(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  console.log(`🏷️  Processing category: ${name} (${slug})`);
  
  const res = await fetch(`${STRAPI_URL}/api/categories?filters[slug][$eq]=${slug}`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
  });
  const json = await res.json();
  
  if (json.data?.length) {
    console.log(`   ✓ Category exists: ${name}`);
    return json.data[0].id;
  }

  const create = await fetch(`${STRAPI_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: JSON.stringify({ 
      data: { 
        name, 
        slug, 
        publishedAt: new Date().toISOString() 
      } 
    })
  });
  
  if (!create.ok) {
    const errorText = await create.text();
    throw new Error(`Failed to create category ${name}: ${errorText}`);
  }
  
  const created = await create.json();
  console.log(`   ✓ Created category: ${name}`);
  return created.data.id;
}

async function upsertTag(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  console.log(`🏷️  Processing tag: ${name} (${slug})`);
  
  const res = await fetch(`${STRAPI_URL}/api/tags?filters[slug][$eq]=${slug}`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
  });
  const json = await res.json();
  
  if (json.data?.length) {
    console.log(`   ✓ Tag exists: ${name}`);
    return json.data[0].id;
  }

  const create = await fetch(`${STRAPI_URL}/api/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: JSON.stringify({ 
      data: { 
        name, 
        slug, 
        publishedAt: new Date().toISOString() 
      } 
    })
  });
  
  if (!create.ok) {
    const errorText = await create.text();
    throw new Error(`Failed to create tag ${name}: ${errorText}`);
  }
  
  const created = await create.json();
  console.log(`   ✓ Created tag: ${name}`);
  return created.data.id;
}

async function uploadMedia(mediaPath) {
  console.log(`📁 Uploading media: ${mediaPath}`);
  
  // Handle both direct filenames and paths with directory structure
  const fileName = mediaPath.replace('/media/projects/', '');
  const fullPath = path.resolve(MEDIA_DIR, fileName);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`   ⚠️  Media not found: ${fullPath}`);
    return null;
  }
  
  const form = new FormData();
  form.append('files', fs.createReadStream(fullPath));
  
  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`   ❌ Upload failed for ${mediaPath}: ${errorText}`);
    return null;
  }
  
  const json = await res.json();
  console.log(`   ✓ Uploaded: ${mediaPath} -> ${json[0]?.url}`);
  return json[0];
}

async function migrateProject(project) {
  console.log(`\n📁 Migrating project: ${project.id}`);
  console.log(`   Title: ${project.title}`);
  console.log(`   Year: ${project.year}`);
  console.log(`   Client: ${project.client}`);
  
  // Process categories
  const categoryIds = [];
  if (project.category) {
    const categoryId = await upsertCategory(project.category);
    categoryIds.push(categoryId);
  }
  
  // Process tags
  const tagIds = [];
  if (project.tags && Array.isArray(project.tags)) {
    for (const tag of project.tags) {
      const tagId = await upsertTag(tag);
      tagIds.push(tagId);
    }
  }
  
  // Upload hero image
  let heroImageId = null;
  if (project.thumbnail?.path) {
    const uploaded = await uploadMedia(project.thumbnail.path);
    if (uploaded) heroImageId = uploaded.id;
  }
  
  // Upload gallery
  const galleryIds = [];
  if (project.mediaGallery && Array.isArray(project.mediaGallery)) {
    for (const media of project.mediaGallery) {
      if (media.path) {
        const uploaded = await uploadMedia(media.path);
        if (uploaded) galleryIds.push(uploaded.id);
      }
    }
  }
  
  // Check if project exists
  const slug = project.id;
  const existingRes = await fetch(`${STRAPI_URL}/api/projects?filters[slug][$eq]=${slug}`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
  });
  const existingJson = await existingRes.json();
  
  const payload = {
    title: project.title,
    slug: slug,
    year: project.year,
    client: project.client,
    role: project.role,
    body: project.body,
    categories: categoryIds,
    tags: tagIds,
    ...(heroImageId ? { heroImage: heroImageId } : {}),
    ...(galleryIds.length ? { gallery: galleryIds } : {}),
    publishedAt: new Date().toISOString(),
    seoTitle: project.title,
    seoDescription: project.body?.substring(0, 160) || ''
  };
  
  if (existingJson.data?.length) {
    // Update existing
    const projectId = existingJson.data[0].id;
    console.log(`   🔄 Updating existing project: ${slug}`);
    
    const res = await fetch(`${STRAPI_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
      body: JSON.stringify({ data: payload })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Update failed for ${slug}: ${errorText}`);
    }
    
    console.log(`   ✅ Updated project: ${slug}`);
  } else {
    // Create new
    console.log(`   🆕 Creating new project: ${slug}`);
    
    const res = await fetch(`${STRAPI_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STRAPI_TOKEN}` },
      body: JSON.stringify({ data: payload })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Create failed for ${slug}: ${errorText}`);
    }
    
    console.log(`   ✅ Created project: ${slug}`);
  }
}

async function testConnection() {
  console.log('🔗 Testing Strapi connection...');
  
  try {
    const res = await fetch(`${STRAPI_URL}/api/projects?pagination[limit]=1`, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    
    if (!res.ok) {
      throw new Error(`Connection failed: ${res.status} ${res.statusText}`);
    }
    
    console.log('✅ Connection successful');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    // Validate environment
    if (!STRAPI_TOKEN) {
      throw new Error('STRAPI_TOKEN environment variable is required');
    }
    
    // Test connection
    await testConnection();
    
    // Load project data
    console.log(`\n📖 Loading project data from: ${CONTENT_FILE}`);
    
    if (!fs.existsSync(CONTENT_FILE)) {
      throw new Error(`Content file not found: ${CONTENT_FILE}`);
    }
    
    const projectsData = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
    const projects = projectsData.project_list || projectsData;
    
    if (!Array.isArray(projects)) {
      throw new Error('Invalid project data structure');
    }
    
    console.log(`Found ${projects.length} projects to migrate`);
    
    // Migrate each project
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      console.log(`\n🚀 Progress: ${i + 1}/${projects.length}`);
      await migrateProject(project);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`✅ Migrated ${projects.length} projects`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();