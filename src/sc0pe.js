'use strict'

const cp = require('child_process')
const { readFile } = require('fs').promises
const { promisify } = require('util')
const banner = require('./banner')

const exec = promisify(cp.exec)

module.exports = async (file, opts) => {
  const error = opts.quiet ? () => {} : msg => console.error('\x1b[31m%s\x1b[0m', msg)
  const warn = opts.quiet ? () => {} : msg => console.warn('\x1b[33m%s\x1b[0m', msg)

  let data

  try {
    data = await readFile(file, 'utf8')
  } catch {
    throw new Error('Couldn\'t find configuration file')
  }

  let exclude, include

  try {
    ({ target: { scope: { exclude, include } } } = JSON.parse(data))
  } catch {
    throw new Error('Invalid configuration file')
  }

  error(banner)

  let domains = []

  warn('[+] Loaded configuration file')

  exclude.forEach(obj => {
    obj.host = new RegExp(obj.host)
  })

  include.forEach(obj => {
    let host = obj.host.replace(/\^|\\|\$/g, '')
    const wildcard = host.startsWith('.*')

    if (!wildcard && opts.adventurous) {
      host = '.*.' + host
      obj.host = '^.*\\.' + obj.host.slice(1)
    }

    if (wildcard || opts.adventurous) {
      const domain = host.slice(3)
      domains.push(domain)
    }

    obj.host = new RegExp(obj.host)
  })

  if (!domains.length) {
    return error('[!] No wildcard domains found (use -a if you want to find subdomains anyway)')
  }

  domains = [...new Set(domains)]

  warn('[+] Found initial domains')

  domains.forEach(domain => warn('   * ' + domain))

  const inScope = domain => {
    const outOfScope = exclude.some(({ host }) => host.test(domain))

    if (outOfScope) return false

    return include.some(({ host }) => host.test(domain))
  }

  let done = false
  const found = new Set()
  let nprocs = 0
  const queue = []
  const timeout = Math.round(+opts.timeout)

  if (timeout > 0) {
    setTimeout(() => {
      warn('[-] Reached timeout')
      warn('[-] Finishing subdomain enumeration')
      done = true
    }, timeout * 1e3)
  }

  const enumerate = async (domain, depth = 1) => {
    if (done || (!opts.fast && depth === opts.depth)) return

    if (nprocs === opts.nprocs) {
      await new Promise(resolve => queue.push(resolve))
    }

    ++nprocs

    warn('[+] Discovering subdomains for ' + domain)

    const subdomains = await exec('amass enum -norecursive -passive -d ' + domain)
      .then(({ stdout }) => stdout.split('\n').filter(Boolean).filter(inScope))
      .catch(err => error('[!] ' + err.message) || [])

    const promises = []

    subdomains.forEach(subdomain => {
      if (found.has(subdomain)) return

      found.add(subdomain)
      console.log(subdomain)

      if (!opts.fast) {
        const promise = enumerate(subdomain, depth + 1)
        promises.push(promise)
      }
    })

    --nprocs

    const next = queue.shift()

    next && next()

    warn(`[+] Found ${subdomains.length} subdomains for ${domain}`)

    await Promise.all(promises)
  }

  warn('[+] Starting subdomain enumeration')

  const promises = domains.map(domain => enumerate(domain))

  await Promise.all(promises)

  warn('[-] Done!')
}
