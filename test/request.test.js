/* global describe, it */

const assert = require('assert')
const example = require('./support/example')
const express = require('express')
const formatsMock = require('./support/formatsMock')
const isStream = require('isstream')
const rdf = require('@rdfjs/dataset')
const { fromStream, toCanonical } = require('rdf-dataset-ext')
const rdfHandler = require('../')
const request = require('supertest')

describe('request', () => {
  describe('dataset', () => {
    it('should not attach .dataset method if not content was sent', async () => {
      let datasetMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        datasetMethod = req.dataset

        next()
      })

      await request(app).get('/')

      assert.strictEqual(typeof datasetMethod, 'undefined')
    })

    it('should not attach the .dataset method if there is no matching parser for the content type', async () => {
      let datasetMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        datasetMethod = req.dataset

        next()
      })

      await request(app).post('/')
        .set('content-type', 'text/plain')
        .send(example.nt)

      assert.strictEqual(typeof datasetMethod, 'undefined')
    })

    it('should attach the .dataset method if content is available', async () => {
      let datasetMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        datasetMethod = req.dataset

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)

      assert.strictEqual(typeof datasetMethod, 'function')
    })

    it('should parse the content and return it as a Dataset', async () => {
      let dataset = null
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res, next) => {
        dataset = await req.dataset()

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)

      assert.strictEqual(toCanonical(dataset), example.nt)
    })

    it('should handle parser errors', async () => {
      let error = null
      const app = express()

      const customFormats = formatsMock({
        parse: () => {
          throw new Error()
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        try {
          await req.dataset()
        } catch (err) {
          error = err
        }

        next()
      })

      await request(app).post('/')
        .send('')

      assert(error)
    })

    it('should forward options to the parser', async () => {
      let givenOptions = null
      const options = {}
      const app = express()

      const customFormats = formatsMock({
        parse: (stream, options) => {
          givenOptions = options
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        await req.dataset(options)

        next()
      })

      await request(app).post('/')
        .set('content-type', 'text/plain')
        .send('')

      assert.strictEqual(givenOptions, options)
    })
  })

  describe('quadStream', () => {
    it('should not attach .quadStream method if not content was sent', async () => {
      let quadStreamMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        quadStreamMethod = req.quadStream

        next()
      })

      await request(app).get('/')

      assert.strictEqual(typeof quadStreamMethod, 'undefined')
    })

    it('should not attach the .quadStream method if there is no matching parser for the content type', async () => {
      let quadStreamMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        quadStreamMethod = req.quadStream

        next()
      })

      await request(app).post('/')
        .set('content-type', 'text/plain')
        .send(example.nt)

      assert.strictEqual(typeof quadStreamMethod, 'undefined')
    })

    it('should attach the .quadStream method if content is available', async () => {
      let quadStreamMethod = null
      const app = express()

      app.use(rdfHandler())
      app.use((req, res, next) => {
        quadStreamMethod = req.quadStream

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)

      assert.strictEqual(typeof quadStreamMethod, 'function')
    })

    it('should parse the content and return it as a Quad Stream', async () => {
      let quadStream = null
      const app = express()

      app.use(rdfHandler())
      app.use(async (req, res, next) => {
        quadStream = await req.quadStream()

        next()
      })

      await request(app).post('/')
        .set('content-type', 'application/n-triples')
        .send(example.nt)

      assert(isStream(quadStream))

      const dataset = await fromStream(rdf.dataset(), quadStream)

      assert.strictEqual(toCanonical(dataset), example.nt)
    })

    it('should forward options to the parser', async () => {
      let givenOptions = null
      const options = {}
      const app = express()

      const customFormats = formatsMock({
        parse: (stream, options) => {
          givenOptions = options
        }
      })

      app.use(rdfHandler({ formats: customFormats }))
      app.use(async (req, res, next) => {
        await req.quadStream(options)

        next()
      })

      await request(app).post('/')
        .set('content-type', 'text/plain')
        .send('')

      assert.strictEqual(givenOptions, options)
    })
  })
})
