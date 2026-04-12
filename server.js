const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Load project data
function getProjects() {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'projects.json'), 'utf-8');
  return JSON.parse(raw);
}

// Routes
app.get('/', (req, res) => {
  const projects = getProjects();
  res.render('index', { projects });
});

app.get('/project/:slug', (req, res) => {
  const projects = getProjects();
  const project = projects.find(p => p.slug === req.params.slug);
  if (!project) return res.status(404).render('404');
  res.render('project', { project, projects });
});

app.get('/resume', (req, res) => {
  res.render('resume');
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
