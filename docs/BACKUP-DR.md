# Backup & Disaster Recovery Plan

## Database (Neon Postgres)

### Automatic Backups
Neon provides **point-in-time recovery (PITR)** on all plans:
- **Free tier**: 7-day history
- **Pro tier**: 30-day history (configurable)
- Backups are continuous (WAL-based), not periodic snapshots

### Manual Backup
Export a full dump on-demand:
```bash
pg_dump "$POSTGRES_URL" > backup-$(date +%Y%m%d).sql
```

### Restore from Backup
1. **Point-in-time**: Use the Neon Console → Project → Branches → "Restore" to any point in time
2. **From dump**: `psql "$POSTGRES_URL" < backup-YYYYMMDD.sql`

### Schema Migrations
- Managed by Drizzle ORM (`drizzle-kit push`)
- Migration files tracked in `/drizzle` directory
- Always test migrations on a Neon branch before applying to production

## Application (Vercel)

### Deployment Rollback
- Vercel keeps all deployment history
- Instant rollback: Vercel Dashboard → Deployments → click any previous deployment → "Promote to Production"
- No downtime during rollback

### Environment Variables
- Stored in Vercel project settings (encrypted at rest)
- Document all required vars and rotate keys quarterly

## Recovery Objectives

| Metric | Target | How |
|--------|--------|-----|
| **RPO** (Recovery Point Objective) | 1 hour | Neon continuous PITR |
| **RTO** (Recovery Time Objective) | 15 minutes | Vercel instant rollback + Neon restore |

## Incident Response

1. **App down**: Check Vercel deployment status → rollback if bad deploy
2. **Database down**: Check Neon status page → wait or restore from branch
3. **API key compromised**: Rotate key in provider dashboard → update Vercel env vars → redeploy
4. **Data corruption**: Use Neon PITR to restore to pre-corruption timestamp

## Monitoring Checklist

- [ ] Sentry alerts configured for error spikes
- [ ] Langfuse dashboard reviewed weekly for quality drops
- [ ] Admin `/admin/errors` checked daily
- [ ] Admin `/admin/costs` reviewed weekly for budget anomalies
- [ ] Neon storage usage monitored monthly

## Key Rotation Schedule

| Secret | Rotation | Notes |
|--------|----------|-------|
| ANTHROPIC_API_KEY | Quarterly | Regenerate in Anthropic Console |
| AUTH_SECRET | Yearly | `openssl rand -base64 32` |
| AUTH_GOOGLE_SECRET | Yearly | Google Cloud Console |
| POSTGRES_URL | On compromise | Neon Console → Connection Settings |
| RAPIDAPI_KEY | Yearly | RapidAPI Dashboard |
| LANGFUSE_SECRET_KEY | Yearly | Langfuse Settings |
| SENTRY_DSN | Never (public) | Not a secret |
