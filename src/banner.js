'use strict'

const { readFileSync } = require('fs')
const path = require('path')

const banner = path.join(__dirname, '..', 'banner')

module.exports = readFileSync(banner, 'utf8')
