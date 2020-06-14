# sc0pe

A CLI to find in-scope subdomains for bug bounty programs!

`sc0pe` uses [amass](https://github.com/OWASP/Amass) and [Sublist3r](https://github.com/aboul3la/Sublist3r) to enumerate subdomains.

## Install

`npm i sc0pe`

Make sure you have `amass` installed!

## Usage

```
Usage: sc0pe [options] <file>

Options:
  -V, --version            output the version number
  -a, --adventurous        enumerate subdomains for non-wildcard domains
  -p, --parallelism <int>  max number of domains to scan in parallel (default: 10)
  -q, --quiet              don't show banner and info
  -h, --help               display help for command
```

`sc0pe` takes a Burp configuration file as input, deduces in-scope root domains, and performs passive enumeration of subdomains.

By default, `sc0pe` only explores wildcard domains but you can add the `--adventurous` flag to discover subdomains for non-wildcard domains.

The `--parallelism` option controls the maximum number of root domains scanned in parallel. `sc0pe` reduces the value if the number of root domains is smaller.
