# sc0pe

A CLI to find in-scope subdomains for bug bounty programs!

## Install

`npm i sc0pe`

Make sure you have [amass](https://github.com/OWASP/Amass) installed!

## Usage

```
Usage: sc0pe [options] <file>

Options:
  -V, --version           output the version number
  -a, --adventurous       enumerate subdomains for non-wildcard domains
  -b, --batch-size <int>  max number of domains to give amass at once (default: 5)
  -d, --depth <int>       max depth for recursive subdomain enumeration (default: 3)
  -f, --fast              do a fast scan, i.e. no recursive subdomain enumeration
  -n, --nprocs <int>      max number of subdomain enumeration processes (default: 20)
  -q, --quiet             don't show banner and info
  -t, --timeout <int>     max number of seconds to run sc0pe for
  -h, --help              display help for command
```

`sc0pe` takes a Burp configuration file as input and deduces in-scope root domains.

Then it recursively performs passive enumeration of subdomains until reaching a prespecified `--depth` or `--timeout`. If you don't want recursion, include the `--fast` option.

By default, `sc0pe` only explores wildcard domains but you can add the `--adventurous` to discover subdomains for non-wildcard domains.

`sc0pe` runs `amass` in several processes and explores a different batch of domains in each process. You can set the maximum number of processes running and the maximum number of domains in a batch with `--nprocs` and `--batch-size`, respectively.

