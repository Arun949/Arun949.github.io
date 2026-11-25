/*
  Every entry belongs to one of two tracks:

    track: 'journey'   → "My journey": blog posts, lessons learned, interests
    track: 'research'  → "My research": research I am doing, papers, experiments

  Add a new entry to the list below. Example:
  {
    track: 'journey',
    title: 'What I learned in my first month at Matvi',
    date: '2026-12-01',            // 'YYYY-MM-DD', or just 'YYYY'
    category: 'Career',
    summary: 'A short description that appears on the blog card.',
    url: 'posts/first-month-at-matvi.html',
    readTime: '5 min read',
    image: 'assets/first-month-cover.jpg',   // optional, 1400×788 works well
    imageAlt: 'Describe the image'
  }

  For links to other sites (a paper, a talk), add external: true.
*/
window.blogTracks = {
  journey: {
    label: 'My journey',
    summary: 'Blogs on what I am building, learning, and curious about, from AI engineering to life as a student in France.'
  },
  research: {
    label: 'My research',
    summary: 'The research I am working on: questions I am investigating, experiments, results, and published papers.'
  }
};

window.blogArticles = [
  {
    track: 'journey',
    title: 'How to Start Researching One Topic',
    date: '2026-11-25',
    category: 'Research',
    summary: 'How I turned a broad interest in sustainable energy into one research question, a dataset, and a published paper.',
    url: 'posts/how-to-start-researching.html',
    readTime: '7 min read',
    image: 'assets/start-researching-cover.jpg',
    imageAlt: 'Abstract illustration of many scattered ideas narrowing into one focused question and a solar and wind generation chart'
  },
  {
    track: 'research',
    title: 'Building RAG Systems You Can Trust',
    date: '2026-09-23',
    category: 'Generative AI',
    summary: 'Six practical decisions that make retrieval-augmented generation more grounded, testable, and useful.',
    url: 'posts/building-rag-systems.html',
    readTime: '8 min read',
    image: 'assets/rag-systems-cover.jpg',
    imageAlt: 'Abstract diagram of documents flowing through a layered retrieval system into a grounded answer'
  },
  {
    track: 'research',
    title: 'Renewable Energy Prediction using Deep Learning and Generative AI',
    date: '2024',
    category: 'IEEE · ICICNIC 2024',
    summary: 'Forecasting solar and wind generation from ten years of NASA POWER data with LSTM, CNN, and generative AI techniques.',
    url: 'https://ieeexplore.ieee.org/document/10823172',
    external: true,
    readTime: 'Published paper'
  }
];
