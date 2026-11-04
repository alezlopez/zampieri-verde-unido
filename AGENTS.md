# Architecture rules

- Administrative access must wait for server-validated permission loading, and stale session responses must be discarded so route guards never decide access from incomplete or previous-session roles.