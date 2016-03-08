'use strict';
/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');

const JSONAPIMongoParser = require('../../');

describe('JSONAPIMongoParser', function() {
  let parser = new JSONAPIMongoParser();

  describe('parseFields', function() {
    it('should return undefined if fields query is null', function(done) {
      const select = parser.parseFields('article', null);
      expect(select).to.be.undefined;
      done();
    });

    it('should return undefined if fields query is empty', function(done) {
      const select = parser.parseFields('article', {});
      expect(select).to.be.undefined;
      done();
    });

    it('should parse input fields array', function(done) {
      const fieldsQuery = {
        article: ['title', 'body']
      };
      const select = parser.parseFields('article', fieldsQuery);
      expect(select).to.eql({
        title: 1,
        body: 1
      });
      done();
    });

    it('should parse input fields string', function(done) {
      const fieldsQuery = {
        article: 'title,body'
      };
      const select = parser.parseFields('article', fieldsQuery);
      expect(select).to.eql({
        title: 1,
        body: 1
      });
      done();
    });

    it('should parse fields query and always select relationships if it was defined on the resource', function(done) {
      let parser = new JSONAPIMongoParser({
        article: {
          relationships: {
            author: 'people',
            comments: 'comment'
          }
        }
      });
      const fieldsQuery = {
        article: ['title', 'body']
      };
      const select = parser.parseFields('article', fieldsQuery);
      expect(select).to.eql({
        title: 1,
        body: 1,
        author: 1,
        comments: 1
      });
      done();
    });
  });

  describe('parseSort', function() {
    it('should return undefined if sort query is null', function(done) {
      const sort = parser.parseSort(null);
      expect(sort).to.be.undefined;
      done();
    });

    it('should parse input sort array', function(done) {
      const sortQuery = ['-title', 'body', '+created'];
      const sort = parser.parseSort(sortQuery);
      expect(sort).to.eql({
        title: -1,
        body: 1,
        created: 1
      });
      done();
    });

    it('should parse input sort string', function(done) {
      const sortQuery = '-title,body,+created';
      const sort = parser.parseSort(sortQuery);
      expect(sort).to.eql({
        title: -1,
        body: 1,
        created: 1
      });
      done();
    });
  });

  describe('parsePage', function() {
    it('should return undefined if page query is null', function(done) {
      const page = parser.parsePage(null);
      expect(page).to.be.undefined;
      done();
    });

    it('should return undefined if page query is empty', function(done) {
      const page = parser.parsePage({});
      expect(page).to.be.undefined;
      done();
    });

    it('should parse page query with page number and page size', function(done) {
      const pageQuery = {
        number: 2,
        size: 10
      };
      const page = parser.parsePage(pageQuery);
      expect(page).to.eql({
        skip: 10,
        limit: 10
      });
      done();
    });

    it('should parse page query with offset and limit', function(done) {
      const pageQuery = {
        offset: 2,
        limit: 10
      };
      const page = parser.parsePage(pageQuery);
      expect(page).to.eql({
        skip: 2,
        limit: 10
      });
      done();
    });
  });

  describe('parseInclude', function() {
    it('should return undefined if include query is null', function(done) {
      const populate = parser.parseInclude('article', null);
      expect(populate).to.be.undefined;
      done();
    });

    it('should ignore include if no resources type are registered', function(done) {
      const includeQuery = ['author'];
      const populate = parser.parseInclude('article', includeQuery);
      expect(populate).to.be.undefined;
      done();
    });

    it('should ignore include if no relationships are define on the resource type', function(done) {
      const parserIgnoreIncludeWithoutRelationships = new JSONAPIMongoParser({
        article: {}
      });
      const includeQuery = ['author'];
      const populate = parserIgnoreIncludeWithoutRelationships.parseInclude('article', includeQuery);
      expect(populate).to.be.undefined;
      done();
    });

    it('should skip include if it is not defined in the relationships of the resource type', function(done) {
      const parserIgnoreUndefinedInclude = new JSONAPIMongoParser({
        article: {
          relationships: {
            comments: 'comment'
          }
        }
      });
      const includeQuery = ['author', 'comments'];
      const populate = parserIgnoreUndefinedInclude.parseInclude('article', includeQuery);
      expect(populate).to.be.instanceof(Array).to.have.lengthOf(1);
      expect(populate[0].path).to.eql('comments');
      done();
    });

    it('should parse input include array', function(done) {
      const parserAllInclude = new JSONAPIMongoParser({
        article: {
          relationships: {
            author: 'people',
            comments: 'comment',
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
        },
        tag: {}
      });
      const includeQuery = ['author', 'comments.tag', 'comments.author', 'comments.author.tag'];
      const populate = parserAllInclude.parseInclude('article', includeQuery);
      expect(populate).to.eql([{
        path: "author"
      }, {
        path: "comments",
        populate: [{
          path: 'tag'
        }, {
          path: "author",
          populate: [{
            path: "tag"
          }]
        }]
      }])
      done();
    });

    it('should parse input include string', function(done) {
      const parserAllInclude = new JSONAPIMongoParser({
        article: {
          relationships: {
            author: 'people',
            comments: 'comment',
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
        },
        tag: {}
      });
      const includeQuery = 'author,comments.tag,comments.author,comments.author.tag';
      const populate = parserAllInclude.parseInclude('article', includeQuery);
      expect(populate).to.eql([{
        path: "author"
      }, {
        path: "comments",
        populate: [{
          path: 'tag'
        }, {
          path: "author",
          populate: [{
            path: "tag"
          }]
        }]
      }])
      done();
    });

    it('should parse all include query with fields query', function(done) {
      const parserAllInclude = new JSONAPIMongoParser({
        article: {
          relationships: {
            author: 'people',
            comments: 'comment',
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

      // Fields query
      const fieldsQuery = {
          people: ['firstname', 'lastname'],
          comment: ['title', 'body'],
        }
        // Include query
      const includeQuery = ['author', 'comments.tag', 'comments.author', 'comments.author.tag'];
      const populate = parserAllInclude.parseInclude('article', includeQuery, fieldsQuery);

      expect(populate).to.eql([{
        path: 'author',
        select: {
          firstname: 1,
          lastname: 1,
          tag: 1
        }
      }, {
        path: 'comments',
        select: {
          title: 1,
          body: 1,
          author: 1,
          tag: 1
        },
        populate: [{
          path: 'tag'
        }, {
          path: 'author',
          select: {
            firstname: 1,
            lastname: 1,
            tag: 1
          },
          populate: [{
            path: 'tag'
          }]
        }]
      }])
      done();
    });
  });

  describe('parse', function() {
    it('should parse query', function(done) {
      const jsonApiMongoParser = new JSONAPIMongoParser({
        article: {
          relationships: {
            author: 'people',
            comments: 'comment',
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

      const query = {
        fields: {
          article: 'title,body',
          people: 'firstname,lastname',
          comment: 'title,body'
        },
        sort: '-title,body,+created',
        page: {
          offset: 2,
          limit: 10
        },
        include: 'author,comments.tag,comments.author,comments.author.tag'
      }
      const parseQuery = jsonApiMongoParser.parse('article', query);
      expect(parseQuery).to.eql({
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
      });
      done();
    });
  });
});
