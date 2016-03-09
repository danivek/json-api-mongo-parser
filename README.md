# json-api-mongo-parser
[![Build Status](https://travis-ci.org/danivek/json-api-mongo-parser.svg?branch=master)](https://travis-ci.org/danivek/json-api-mongo-parser)
[![Coverage Status](https://coveralls.io/repos/github/danivek/json-api-mongo-parser/badge.svg?branch=master)](https://coveralls.io/github/danivek/json-api-mongo-parser?branch=master)

JSON API query parser for MongoDB/Mongoose queries.

Convert query object from any querystring parser to MongoDB/Mongoose queries.

## Installation
```bash
npm install --save json-api-mongo-parser
```

## Usage

```javascript
// Input query object for the article resource
var query = {
  fields: {
    article: 'title,body', // Can be comma delimited string or Array of string
    people: 'firstname,lastname',
    comment: 'title,body'
  },
  sort: '-title,body,+created', // Can be comma delimited string or Array of string
  page: {
    offset: 2,
    limit: 10
  },
  include: 'author,comments.tag,comments.author,comments.author.tag' // Can be comma delimited string or Array of string
}
```

```javascript
var JSONAPIMongoParser = require(json-api-mongo-parser);

var jsonApiMongoParser = new JSONAPIMongoParser({
  article: {
    relationships: { // Declaring relationships with its type
      author: 'people', // can be a string
      comments: { // Or an object with extra options for population query
        type : 'comment',
        options: {
          lean: true
        }
      },
    }
  },
  comment: {
    relationships: {
      author: 'people',
      tag: 'tag'
    }
  },
  people: {
    relationships: {
      tag: 'tag'
    }
  }
});

// Parse
jsonApiMongoParser.parse('article', query);
```
Output mongo query for the article resource :

```javascript
{
  select: {
    title: 1,
    body: 1,
    author: 1,
    comments: 1
  },
  sort: {
    title: -1,
    body: 1,
    created: 1
  },
  page: {
    skip: 2,
    limit: 10
  },
  populate: [{
    path: 'author',
    select: {
      firstname: 1,
      lastname: 1,
      tag: 1
    }
  }, {
    path: 'comments',
    populate: [{
      path: 'tag'
    }, {
      path: 'author',
      populate: [{
        path: 'tag'
      }],
      select: {
        firstname: 1,
        lastname: 1,
        tag: 1
      }
    }],
    select: {
      title: 1,
      body: 1,
      author: 1,
      tag: 1
    }
  }]
}
```

## Requirements

json-api-mongo-parser only use ECMAScript 2015 (ES6) features supported natively by Node.js 4 and above ([ECMAScript 2015 (ES6) | Node.js](https://nodejs.org/en/docs/es6/)). Make sure that you have Node.js 4+ or above.

## License

[MIT](https://github.com/danivek/json-api-mongo-parser/blob/master/LICENSE)
