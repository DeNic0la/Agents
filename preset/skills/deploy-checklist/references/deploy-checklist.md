# Deploy checklist

Copy the base sections, add the conditional ones the release needs, and drop items that don't apply.

```markdown
## Deploy checklist: <service or release>
**Date:** <date> | **Deployer:** <name> | **Version:** <version or commit range>

### Pre-deploy
- [ ] CI is green for the exact commit being deployed
- [ ] All changes reviewed and approved
- [ ] No known critical bugs in the release
- [ ] Rollback plan written, with its duration
- [ ] On-call knows the deploy is happening

### Deploy
- [ ] Deploy to staging and verify
- [ ] Smoke tests pass on staging
- [ ] Deploy to production (canary or a small share first, if available)
- [ ] Watch error rate and latency for 15 minutes
- [ ] Key user flows verified in production

### Post-deploy
- [ ] Metrics back to baseline
- [ ] Release notes or changelog updated
- [ ] Stakeholders notified
- [ ] Related issues closed

### Rollback triggers
- Error rate above <X>% (baseline: <Y>%)
- p50 / p99 latency above <X> ms (baseline: <Y> ms)
- <critical user flow> fails
```

## Conditional sections

### Database migration

- [ ] Migration tested against a production-sized copy; duration measured
- [ ] Old code works against the new schema (expand before contract)
- [ ] Locks and long-running statements checked
- [ ] Rollback migration tested, or the migration is marked one-way with a backup taken
- [ ] Backup or snapshot taken before running

### Feature flags

- [ ] New flags default to off in production
- [ ] Flag configured in every environment
- [ ] Rollout plan: who gets it first, and when it widens
- [ ] Turning the flag off is the first rollback step, and it was tested

### Breaking API or event schema change

- [ ] All consumers identified and notified, with the date
- [ ] Old and new versions served side by side, or consumers already migrated
- [ ] Contract tests pass for every known consumer
- [ ] Deprecation notice and removal date published

### Config or secret change

- [ ] New config and secrets present in every target environment
- [ ] Service fails fast with a clear error when one is missing
- [ ] Secret values never appear in logs or the deploy output

### Dependency upgrade

- [ ] Changelog read for breaking changes between the old and new version
- [ ] Security advisories checked
- [ ] Runtime and build images updated consistently
