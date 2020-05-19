# sc0pe

A CLI to find in-scope subdomains for bug bounty programs!

## Install

`npm i sc0pe`

Make sure you have [amass](https://github.com/OWASP/Amass) installed!

## Usage

```
Usage: sc0pe [options] <file>

Options:
  -V, --version        output the version number
  -a, --adventurous    enumerate subdomains for non-wildcard domains
  -d, --depth <int>    max depth for recursive subdomain enumeration (default: 3)
  -f, --fast           do a fast scan, i.e. no recursive subdomain enumeration
  -n, --nprocs <int>   max number of subdomain enumeration processes (default: 20)
  -q, --quiet          don't show banner and info
  -t, --timeout <int>  max number of seconds to run sc0pe for
  -h, --help           display help for command
```
