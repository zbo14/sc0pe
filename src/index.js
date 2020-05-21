'use strict'

const commander = require('commander')
const sc0pe = require('./sc0pe')

const program = new commander.Command()

program
  .version('1.0.0')
  .arguments('<file>')
  .option('-a, --adventurous', 'enumerate subdomains for non-wildcard domains')
  .option('-b, --batch-size <int>', 'max number of domains to give amass at once', 5)
  .option('-d, --depth <int>', 'max depth for recursive subdomain enumeration', 3)
  .option('-f, --fast', 'do a fast scan, i.e. no recursive subdomain enumeration')
  .option('-n, --nprocs <int>', 'max number of subdomain enumeration processes', 20)
  .option('-q, --quiet', 'don\'t show banner and info')
  .option('-t, --timeout <int>', 'max number of seconds to run sc0pe for')
  .action(sc0pe)

module.exports = program
