const articleList = document.querySelector('#article-list');
const emptyArticles = document.querySelector('#empty-articles');
const articleCount = document.querySelector('#article-count');
const articles = Array.isArray(window.blogArticles) ? window.blogArticles : [];

const formatDate = date => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));

if (!articles.length) {
  emptyArticles.hidden = false;
  articleCount.textContent = '0 articles';
} else {
  articleCount.textContent = `${articles.length} ${articles.length === 1 ? 'article' : 'articles'}`;
  articles
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(article => {
      const item = document.createElement(article.url ? 'a' : 'article');
      item.className = 'article-card';
      if (article.url) item.href = article.url;
      item.innerHTML = `<p class="project-number">${article.category || 'Notes'}</p><h3>${article.title}</h3><p>${article.summary}</p><span>${formatDate(article.date)}${article.readTime ? ` · ${article.readTime}` : ''}</span>`;
      articleList.appendChild(item);
    });
}
