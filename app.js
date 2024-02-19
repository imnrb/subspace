const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const port = 3000;


app.use(async (req, res, next) => {
  try {
    const blogApiResponse = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs/blog1', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6',
      },
    });

    if (!Array.isArray(blogApiResponse.data.blogs)) {
      throw new Error('Invalid data format in the API response.');
    }

    req.blogData = blogApiResponse.data.blogs;

    next();
  } catch (error) {
    next(error);
  }
});

//  memoization function for caching results
const memoizeCache = new Map();
function customMemoizeKeyResolver(req) {
  return req.originalUrl; // Use the request URL as the cache key
}

const memoizedBlogStats = _.memoize((req) => {
  const blogData = req.blogData;

  return {
    totalBlogs: blogData.length,
    longestTitle: _.maxBy(blogData, 'title').title,
    blogsWithPrivacyKeyword: _.filter(blogData, (blog) =>
      _.includes(_.toLower(blog.title), 'privacy')
    ).length,
    uniqueBlogTitles: _.uniqBy(blogData, 'title').map((blog) => blog.title),
  };
}, customMemoizeKeyResolver);

app.get('/api/blog-stats', (req, res, next) => {
  try {
    const blogStats = memoizedBlogStats(req);

    res.json(blogStats);
  } catch (error) {
    next(error);
  }
});

const memoizedBlogSearch = _.memoize((req, query) => {
  const blogData = req.blogData;

  if (!query) {
    return [];
  }

  const searchResults = _.filter(blogData, (blog) =>
    _.includes(_.toLower(blog.title), _.toLower(query))
  );

  return searchResults;
}, (req, query) => req.originalUrl + query);

app.get('/api/blog-search', (req, res) => {
  const query = req.query.query;

  const searchResults = memoizedBlogSearch(req, query);

  res.json(searchResults);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
