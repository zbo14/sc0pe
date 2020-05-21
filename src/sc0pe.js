'use strict'

const { spawn } = require('child_process')
const { readFile } = require('fs').promises
const banner = require('./banner')

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

  const batchSize = +opts.batchSize || 5
  const discovered = new Set()
  const maxDepth = +opts.depth || 3
  const maxProcs = +opts.nprocs || 20
  const queue = []
  const timeout = Math.round(+opts.timeout)

  let done = false
  let nprocs = 0

  if (timeout > 0) {
    setTimeout(() => {
      warn('[-] Reached timeout')
      warn('[-] Finishing subdomain enumeration')
      done = true
    }, timeout * 1e3)
  }

  const enumerate = async (domains, depth = 1) => {
    if (done || !domains.length || (!opts.fast && depth === maxDepth)) return

    if (nprocs >= maxProcs) {
      await new Promise(resolve => queue.push(resolve))
    }

    ++nprocs

    domains.forEach(domain => warn('[+] Discovering subdomains for ' + domain))

    const arr = []

    let found = 0

    await new Promise((resolve, reject) => {
      const child = spawn('amass', [
        'enum',
        '-d', domains.join(','),
        '-nolocaldb',
        '-norecursive',
        '-passive'
      ]).once('error', reject)
        .once('exit', resolve)

      child.stdout.on('data', data => {
        data.toString().split('\n').forEach(subdomain => {
          subdomain = subdomain.trim()

          if (!inScope(subdomain) || discovered.has(subdomain)) return

          discovered.add(subdomain)
          console.log(subdomain)
          ++found

          opts.fast || arr.push(subdomain)
        })
      })
    })

    const next = queue.shift()

    next && next()

    --nprocs

    if (found === 1) {
      warn('[+] Found 1 new subdomain')
    } else if (found) {
      warn(`[+] Found ${found} new subdomains`)
    }

    if (!opts.fast) {
      const promises = []

      for (let i = 0; i < arr.length; i += batchSize) {
        const batch = arr.slice(i, i + batchSize)
        const promise = enumerate(batch, depth + 1)
        promises.push(promise)
      }

      await Promise.all(promises)
    }
  }

  warn('[+] Starting subdomain enumeration')

  const promises = []

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize)
    const promise = enumerate(batch)
    promises.push(promise)
  }

  await Promise.all(promises)

  warn('[-] Done!')
}
