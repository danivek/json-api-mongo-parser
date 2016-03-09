'use strict';

const _ = require('lodash');

module.exports = class JSONAPIMongoParser {
  constructor(options) {
    this.options = options || {};
  }

  parseFields(type, selectQuery) {
    const select = {};

    if (selectQuery) {
      if (selectQuery[type]) {
        let fields = selectQuery[type];
        // Support for input comma delimited string
        if (_.isString(fields)) {
          fields = fields.split(',');
        }

        fields.forEach(field => select[field] = 1);
      }

      // Always select relationships if defined
      if (this.options[type] && this.options[type].relationships) {
        _.forOwn(this.options[type].relationships, (value, key) => select[key] = 1);
      }
    }
    return !_.isEmpty(select) ? select : undefined;
  }

  parseSort(sortQuery) {
    const sort = {};

    if (sortQuery) {
      // Support for input comma delimited string
      if (_.isString(sortQuery)) {
        sortQuery = sortQuery.split(',');
      }

      sortQuery.forEach((sortField) => {
        let field = sortField;
        const operator = sortField.charAt(0);
        if (operator === '-' || operator === '+') {
          field = field.substr(1);
        }
        sort[field] = (operator === '-') ? -1 : 1;
      });
    }
    return !_.isEmpty(sort) ? sort : undefined;
  }

  parsePage(pageQuery) {
    const page = {};

    if (pageQuery) {
      // Pagination with page number and page size
      if (pageQuery.number && pageQuery.size) {
        const pageNumber = Number(pageQuery.number);
        const pageSize = Number(pageQuery.size);
        page.skip = (pageNumber * pageSize) - pageSize;
        page.limit = pageSize;
      }

      // Pagination with offset and limit
      if (pageQuery.offset && pageQuery.limit) {
        const pageOffset = Number(pageQuery.offset);
        const pageLimit = Number(pageQuery.limit);
        page.skip = pageOffset;
        page.limit = pageLimit;
      }
    }
    return !_.isEmpty(page) ? page : undefined;
  }

  parseInclude(type, includeQuery, fieldsQuery) {
    const output = [];
    const flatOptions = this._flattenOptions();

    if (includeQuery) {
      // Support for input comma delimited string
      if (_.isString(includeQuery)) {
        includeQuery = includeQuery.split(',');
      }

      // Ignore include if no resources type are registered
      if (this.options[type]) {
        // Convert array of delimited string to tree
        for (let i = 0; i < includeQuery.length; i++) {
          const chain = includeQuery[i].split('.');

          // Ignore include if no relationships are define on the resource type
          if (!this.options[type].relationships) {
            break;
          }

          // Skip include if it is not defined in the relationships of the resource type
          if (this.options[type].relationships && !this.options[type].relationships[chain[0]]) {
            continue;
          }

          let currentNode = output;

          for (let j = 0; j < chain.length; j++) {
            const wantedNode = chain[j];
            const lastNode = currentNode;

            let k;
            for (k = 0; k < currentNode.length; k++) {
              if (currentNode[k].path === wantedNode) {
                currentNode = currentNode[k].populate;
                break;
              }
            }

            if (lastNode === currentNode) {
              // Parse select for include type
              const select = this.parseFields(_.get(flatOptions[type], chain.slice(0, j + 1).concat(['type'])), fieldsQuery);
              // Get populate options defined on this relationships
              const options = _.get(flatOptions[type], chain.slice(0, j + 1).concat(['options']));

              // Populate query
              const populate = {
                path: wantedNode,
                populate: [],
              };

              // Select
              if (select) {
                populate.select = select;
              }

              // Extra options
              if (options) {
                populate.options = options;
              }

              const newNode = currentNode[k] = populate;
              currentNode = newNode.populate;
            }
          }
        }

        // Remove deeply all empty array
        output.forEach(item => this._removeDeepEmptyArray(item));
      }
    }
    return !_.isEmpty(output) ? output : undefined;
  }

  parse(type, query) {
    return {
      select: this.parseFields(type, query.fields),
      sort: this.parseSort(query.sort),
      page: this.parsePage(query.page),
      populate: this.parseInclude(type, query.include, query.fields),
    };
  }

  _removeDeepEmptyArray(item) {
    const that = this;
    _.forOwn(item, (value, key) => {
      if (_.isArray(value)) {
        if (_.isEmpty(value)) {
          delete item[key];
        } else {
          value.forEach(v => that._removeDeepEmptyArray(v));
        }
      }
    });
  }

  _flattenOptions() {
    const flatOptions = {};
    const that = this;

    const flattenRelationships = function(type) {
      let flatRelationships;

      // Type definition can be a string or an object with extra options for population query
      if (_.isString(type)) {
        flatRelationships = {
          type: type,
        };
      } else {
        flatRelationships = type;
      }

      if (that.options[flatRelationships.type] && that.options[flatRelationships.type].relationships) {
        _.forOwn(that.options[flatRelationships.type].relationships, (value, key) => {
          flatRelationships[key] = flattenRelationships(value);
        });
      }

      return flatRelationships;
    };

    _.forOwn(this.options, (value, key) => {
      flatOptions[key] = flattenRelationships(key);
    });

    return flatOptions;
  }
};
