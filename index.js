#!/usr/bin/env node

'use strict'

const { spawn } = require('child_process')
const commander = require('commander')
const { once } = require('events')
const fs = require('fs')
const path = require('path')

const banner = fs.readFileSync(path.join(__dirname, 'banner'), 'utf8')
const error = msg => console.error('\x1b[31m%s\x1b[0m', msg)
const program = new commander.Command()

program
  .version('0.0.1')
  .arguments('<file>')
  .option('-a, --adventurous', 'enumerate subdomains for non-wildcard domains')
  .option('-p, --parallelism <int>', 'max number of domains to scan in parallel', 1)
  .option('-q, --quiet', 'don\'t show banner and info')
  .action(async (file, opts) => {
    const warn = opts.quiet ? () => {} : msg => console.warn('\x1b[33m%s\x1b[0m', msg)

    let data

    try {
      data = await fs.promises.readFile(file, 'utf8')
    } catch {
      error('[!] Couldn\'t find configuration file')
      process.exit(1)
    }

    let exclude, include

    try {
      ({ target: { scope: { exclude, include } } } = JSON.parse(data))
    } catch {
      error('[!] Invalid configuration file')
      process.exit(1)
    }

    opts.quiet || error(banner)
    warn('[+] Loaded configuration file')

    exclude.forEach(obj => {
      obj.host = new RegExp(obj.host)
    })

    let domains = new Set()

    include.forEach(obj => {
      let host = obj.host.replace(/\^|\\|\$/g, '')
      const wildcardStart = host.startsWith('.*')
      const wildcardMiddle = host.split('.').slice(1).join('.').includes('.*')

      if (!wildcardStart && opts.adventurous) {
        host = '.*.' + host
        obj.host = '^.*\\.' + obj.host.slice(1)
      }

      if (!wildcardMiddle && (wildcardStart || opts.adventurous)) {
        const domain = host.slice(3)
        domains.add(domain)
      }

      obj.host = new RegExp(obj.host)
    })

    if (!domains.size) {
      error('[!] No wildcard domains found (use -a if you want to find subdomains anyway)')
      process.exit(1)
    }

    domains = [...domains].filter((d1, _, ds) => {
      return !ds.some(d2 => d1.endsWith(d2) && d1.split('.').length > d2.split('.').length)
    })

    if (!domains.length) {
      error('[!] Couldn\'t find any root domains (check that data in configuration file is correct)')
      process.exit(1)
    }

    warn('[+] Found root domains')

    domains.forEach(domain => warn('   * ' + domain))

    const discovered = new Set()
    let maxParallelism = Math.abs(Math.round(+opts.parallelism)) || 10
    const queue = []

    if (maxParallelism > domains.length) {
      maxParallelism = domains.length
      warn('[-] Reducing parallelism to ' + domains.length)
    }

    let found = 0
    let parallelism = 0

    const cb = data => {
      data.split('\n').forEach(subdomain => {
        subdomain = subdomain.trim()

        if (subdomain.includes(' ')) return

        const outOfScope = exclude.some(({ host }) => host.test(subdomain))

        if (outOfScope) return

        const inScope = include.some(({ host }) => host.test(subdomain))

        if (!inScope || discovered.has(subdomain)) return

        discovered.add(subdomain)
        console.log(subdomain)

        ++found
      })
    }

    const enumerate = async domain => {
      if (parallelism === maxParallelism) {
        await new Promise(resolve => queue.push(resolve))
      }

      ++parallelism

      warn('[+] Discovering subdomains for ' + domain)

      const procs = [
        spawn('amass', [
          'enum',
          '-d', domain,
          '-nolocaldb',
          '-passive'
        ]),

        spawn('subfinder', ['-d', domain]),

        spawn('python3', [
          path.join(__dirname, 'Sublist3r', 'sublist3r.py'),
          '-d', domain,
          '-n'
        ])
      ]

      const promises = procs.map(proc => {
        proc.stdout
          .setEncoding('utf8')
          .on('data', cb)

        return once(proc, 'exit')
      })

      await Promise.all(promises)

      const next = queue.shift()

      next && next()

      --parallelism
    }

    warn('[+] Starting subdomain enumeration')

    const promises = domains.map(enumerate)
    await Promise.all(promises)

    if (found === 1) {
      warn('[+] Found 1 subdomain')
    } else if (found) {
      warn(`[+] Found ${found} subdomains`)
    } else {
      warn('[-] Found no subdomains')
    }

    warn('[-] Done!')
  })
  .parseAsync(process.argv).catch(err => {
    error(err)
    process.exit(1)
  })
