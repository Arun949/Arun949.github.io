# Arunkumar Aluru - AI Engineer Portfolio

A modern, responsive portfolio website showcasing AI/ML projects, publications, and professional experience.

## 🌟 Features

- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **Modern UI/UX** - Clean, professional design with smooth animations
- **Dark Theme** - Eye-friendly dark color scheme
- **Interactive Elements** - Smooth scrolling, hover effects, and animated sections
- **SEO Optimized** - Proper HTML structure and meta tags
- **Fast Loading** - Optimized assets and minimal dependencies

## 📁 Project Structure

```
portfolio/
├── index.html          # Main HTML file
├── styles.css          # Stylesheet
├── script.js           # JavaScript for interactivity
└── README.md          # This file
```

## 🚀 Deployment to GitHub Pages

Follow these steps to deploy your portfolio to GitHub Pages:

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Name your repository: `your-username.github.io` (replace `your-username` with your actual GitHub username)
   - Example: `Arun949.github.io`
5. Make sure the repository is **Public**
6. **Do NOT** initialize with README, .gitignore, or license (we'll add our files manually)
7. Click **"Create repository"**

### Step 2: Upload Your Portfolio Files

#### Option A: Using GitHub Web Interface (Easiest)

1. In your new repository, click **"uploading an existing file"**
2. Drag and drop these files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
3. Scroll down and click **"Commit changes"**

#### Option B: Using Git Command Line

1. Open your terminal/command prompt
2. Navigate to the folder containing your portfolio files:
   ```bash
   cd path/to/your/portfolio
   ```

3. Initialize Git and push to GitHub:
   ```bash
   # Initialize git repository
   git init

   # Add all files
   git add .

   # Commit the files
   git commit -m "Initial commit: Portfolio website"

   # Add your GitHub repository as remote
   git remote add origin https://github.com/Arun949/Arun949.github.io.git

   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **"Settings"** (top right)
3. Scroll down to **"Pages"** in the left sidebar (or find it under "Code and automation")
4. Under **"Source"**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **"Save"**

### Step 4: Access Your Live Portfolio

Your portfolio will be live at: `https://Arun949.github.io`

**Note:** It may take 2-5 minutes for your site to go live for the first time.

## 🔧 Customization

### Update Personal Information

Edit `index.html` to update:
- Contact information (email, phone, location)
- Social media links
- Projects
- Experience
- Publications
- Skills

### Change Colors

Edit `styles.css` and modify the CSS variables in the `:root` section:

```css
:root {
    --primary-color: #6366f1;    /* Main brand color */
    --secondary-color: #8b5cf6;  /* Secondary brand color */
    --accent-color: #60a5fa;     /* Accent color */
    /* ... other colors ... */
}
```

### Add More Projects

In `index.html`, find the "Projects Section" and add new project cards following this template:

```html
<div class="project-card">
    <div class="project-icon">
        <i class="fas fa-icon-name"></i>
    </div>
    <h3>Project Title</h3>
    <p>Project description...</p>
    <div class="project-tech">
        <span>Technology 1</span>
        <span>Technology 2</span>
    </div>
    <div class="project-links">
        <a href="github-link" target="_blank" class="project-link">
            <i class="fab fa-github"></i> View Code
        </a>
    </div>
</div>
```

## 📱 Sections Included

1. **Hero** - Introduction with name, title, and call-to-action
2. **About Me** - Background and professional summary
3. **Education** - Academic credentials with timeline
4. **Skills** - Technical and soft skills categorized
5. **Projects** - Featured work with links
6. **Publications** - Research papers and publications
7. **Experience** - Professional work history
8. **Contact** - Contact information and social links

## 🛠️ Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (ES6+)** - Interactive features
- **Font Awesome** - Icons
- **Google Fonts** - Typography (via system fonts)

## 📈 Future Enhancements

Consider adding:
- Blog section
- Dark/Light theme toggle
- Contact form with backend integration
- Downloadable resume (PDF)
- Project filtering/search functionality
- Analytics (Google Analytics)
- Performance optimization (lazy loading images)

## 🐛 Troubleshooting

### Site Not Loading After Deployment

1. Wait 5-10 minutes after enabling GitHub Pages
2. Check that your repository name is `username.github.io`
3. Verify the repository is set to Public
4. Clear your browser cache and try again
5. Check GitHub Actions tab for any build errors

### Images Not Showing

- Make sure image paths are correct (relative paths recommended)
- If using external images, ensure URLs are HTTPS

### Mobile Menu Not Working

- Ensure `script.js` is properly linked in `index.html`
- Check browser console for JavaScript errors

## 📝 License

This portfolio template is free to use and modify for personal use.

## 📧 Contact

- **Email:** aluruarunkumar308@gmail.com
- **LinkedIn:** [linkedin.com/in/arunkumaraluru](https://www.linkedin.com/in/arunkumaraluru/)
- **GitHub:** [github.com/Arun949](https://github.com/Arun949)

---

**Built with ❤️ by Arunkumar Aluru**

Last Updated: February 2025
