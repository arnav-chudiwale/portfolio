const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = 'https://arnavchudiwale.com';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.arcgis.com https://cdn.jsdelivr.net https://code.jquery.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://js.arcgis.com https://cdn.jsdelivr.net https://netdna.bootstrapcdn.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://cdn.fontshare.com https://cdn.jsdelivr.net https://netdna.bootstrapcdn.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.arcgisonline.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "media-src 'self'; " +
    "connect-src 'self' https://services1.arcgis.com https://js.arcgis.com https://*.arcgisonline.com; " +
    "worker-src 'self' blob:; " +
    "frame-src 'self'; " +
    "object-src 'self';"
  );
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true
}));

// Load project data
function getProjects() {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'projects.json'), 'utf-8');
  return JSON.parse(raw);
}

// Routes
app.get('/', (req, res) => {
  const projects = getProjects();
  res.render('index', { projects, canonicalPath: '' });
});

app.get('/project/:slug', (req, res) => {
  const projects = getProjects();
  const project = projects.find(p => p.slug === req.params.slug);
  if (!project) return res.status(404).render('404');
  res.render('project', {
    project,
    projects,
    canonicalPath: '/project/' + project.slug,
    pageDescription: project.oneLiner
  });
});

app.get('/resume', (req, res) => {
  res.render('resume', {
    pageTitle: 'Resume',
    canonicalPath: '/resume',
    pageDescription: 'Arnav Chudiwale — Resume. MS Industrial Engineering at Oklahoma State University.'
  });
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const projects = getProjects();
  const urls = [
    { loc: DOMAIN + '/', priority: '1.0', changefreq: 'weekly' },
    { loc: DOMAIN + '/resume', priority: '0.8', changefreq: 'monthly' },
    ...projects.map(p => ({
      loc: DOMAIN + '/project/' + p.slug,
      priority: '0.9',
      changefreq: 'monthly'
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(xml);
});

// SEO: robots.txt
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml`);
});

app.get('/resume/pdf', (req, res) => {
  const file = path.join(__dirname, 'public', 'resume', 'Arnav_Chudiwale_Resume.pdf');
  if (fs.existsSync(file)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Arnav_Chudiwale_Resume.pdf"');
    res.sendFile(file);
  } else {
    res.status(404).send('Resume not found');
  }
});

app.get('/resume/download', (req, res) => {
  const file = path.join(__dirname, 'public', 'resume', 'Arnav_Chudiwale_Resume.pdf');
  if (fs.existsSync(file)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Arnav_Chudiwale_Resume.pdf"');
    res.sendFile(file);
  } else {
    res.status(404).send('Resume not found');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
});

module.exports = app;
