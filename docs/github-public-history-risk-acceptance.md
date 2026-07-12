# GitHub Public History Risk Acceptance

## Public Repository Decision

The repository owner explicitly approved publishing the stable project history in a public GitHub repository.

## Audit Result

The current tree contains no machine-specific absolute path, credential cache, environment file, signing material, installer, executable, source map, or generated deployment artifact. A high-confidence scan across all local refs found no token, password assignment, private key, OAuth credential, or Cloudflare credential.

## Known Historical Risk

Older commits contain examples of machine-specific absolute paths. Publishing the unchanged history may expose an old local username or directory structure. This is environment metadata, not an authentication credential, but it can provide limited contextual information about the original development machine.

The repository owner understands and accepts this risk.

## History Policy

- Do not rewrite, squash, filter, or delete existing history for this publication.
- Do not use force push or force-with-lease.
- Do not delete existing commits or stable tags.
- Future commits must not introduce machine-specific absolute paths.
- Generated artifacts and credentials remain prohibited from Git history.

## Incident Policy

If a real secret is discovered later, immediately stop publication activity, rotate or revoke the affected credential, assess exposure, and handle any history remediation through a separate incident-response process.
