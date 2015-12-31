/* global describe, it */

var assert = require('assert')
var express = require('express')
var rdfBodyParser = require('../')
var request = require('supertest')
var Promise = require('bluebird')

var formats = {
  parsers: {
    parse: function (mediaType, data) {
      return Promise.resolve(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))
    }
  },
  serializers: {
    serialize: function (mediaType, data) {
      return Promise.resolve(JSON.stringify({
        mediaType: mediaType,
        data: data
      }))
    }
  }
}

function asyncAssert (done, callback) {
  Promise.resolve().then(callback).asCallback(done)
}

describe('rdf-body-parser', function () {
  it('should return a middleware function', function () {
    var middleware = rdfBodyParser()

    assert.equal(typeof middleware, 'function')
    assert.equal(middleware.length, 3)
  })

  describe('bodyParser', function () {
    it('should use options body parser if given', function (done) {
      var touched = false
      var app = express()

      app.use(rdfBodyParser(formats, {
        bodyParser: function (req, res, next) {
          touched = true

          next()
        }
      }))

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(touched)
          })
        })
    })

    it('should use the default body parser if none was given', function (done) {
      var parsed = false
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        parsed = req.body && req.body === 'test'

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(parsed)
          })
        })
    })

    it('should use the media type defined in Content-Type header to parse the data', function (done) {
      var mediaType
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        mediaType = (JSON.parse(req.graph) || {}).mediaType

        next()
      })

      request(app)
        .post('/')
        .set('Content-Type', 'text/plain')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(mediaType, 'text/plain')
          })
        })
    })

    it('should set .graph to null if no body was sent', function (done) {
      var hasGraph = true
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        hasGraph = !!req.graph

        next()
      })

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(!hasGraph)
          })
        })
    })

    it('should parse graph and set assign it to .graph', function (done) {
      var graph
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        graph = JSON.parse(req.graph)

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert.equal(graph.data, 'test')
          })
        })
    })

    it('should handle parser error', function (done) {
      var errorThrown = false
      var app = express()

      app.use(rdfBodyParser({
        parsers: {
          parse: function () {
            return Promise.reject(new Error())
          }
        }
      }))
      app.use(function (err, req, res, next) {
        errorThrown = err instanceof Error

        next()
      })

      request(app)
        .post('/')
        .send('test')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(errorThrown)
          })
        })
    })
  })

  describe('sendGraph', function () {
    it('should search for a serializer', function (done) {
      var searched = false
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        res.sendGraph('test')

        next()
      })

      formats.serializers.list = function () {
        searched = true

        return []
      }

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(searched)
          })
        })
    })

    it('should reject if no serializer was found', function (done) {
      var rejected = false
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        res.sendGraph('test').catch(function () {
          rejected = true
        })

        next()
      })

      formats.serializers.list = function () {
        return []
      }

      request(app)
        .get('/')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(rejected)
          })
        })
    })

    it('should send serialized graph with Content-Type header', function (done) {
      var app = express()

      app.use(rdfBodyParser(formats))
      app.use(function (req, res, next) {
        res.sendGraph('test')

        next()
      })

      formats.serializers.list = function () {
        return ['text/plain']
      }

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            var result = JSON.parse(res.text) || {}

            assert.equal(result.mediaType, 'text/plain')
            assert.equal(result.data, 'test')
          })
        })
    })

    it('should reject on parser error', function (done) {
      var rejected = false
      var app = express()

      app.use(rdfBodyParser({
        serializers: {
          list: function () {
            return ['text/plain']
          },
          serialize: function () {
            return Promise.reject(new Error())
          }
        }
      }))
      app.use(function (req, res, next) {
        res.sendGraph('test').catch(function () {
          rejected = true
        })

        next()
      })

      request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .end(function (err, res) {
          if (err) {
            return done(err)
          }

          asyncAssert(done, function () {
            assert(rejected)
          })
        })
    })
  })
})
