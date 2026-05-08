# Firestore Backup And Restore Runbook

## Objective

Protect production Firestore data with automated exports, retention, and a tested restore path. Target RPO is 24 hours unless the scheduler interval is lowered.

## Required Access

- Google Cloud project owner or Firestore admin for the production project.
- A dedicated Cloud Storage bucket for backups, preferably in the same region as Firestore.
- `gcloud` authenticated as a service account with `roles/datastore.importExportAdmin` and storage write/read access to the backup bucket.

## Environment

Set these in the scheduled environment, CI runner, VM, or Cloud Scheduler target:

```bash
GOOGLE_CLOUD_PROJECT=grahachara-prod
FIRESTORE_BACKUP_BUCKET=grahachara-firestore-backups-prod
FIRESTORE_BACKUP_PREFIX=firestore
```

## Manual Backup

From `server/`:

```bash
npm run firestore:backup
```

This exports to:

```text
gs://$FIRESTORE_BACKUP_BUCKET/$FIRESTORE_BACKUP_PREFIX/<timestamp>
```

To export only selected collections:

```bash
FIRESTORE_BACKUP_COLLECTION_IDS=users,reports,dailyCosts npm run firestore:backup
```

## Automated Backup

Use Cloud Scheduler, GitHub Actions, or the production VM scheduler to run the same command daily. For Cloud Scheduler, create a job that invokes a Cloud Run job or VM command with the environment above.

Recommended schedule:

```text
30 18 * * *
```

That runs near midnight Sri Lanka time. Set a Cloud Storage lifecycle rule to retain daily exports for at least 30 days and monthly exports for 12 months.

## Restore Drill

Never test restore into production first. Use a staging Firebase project.

```bash
GOOGLE_CLOUD_PROJECT=grahachara-staging \
FIRESTORE_RESTORE_SOURCE=gs://grahachara-firestore-backups-prod/firestore/2026-05-08T18-30-00-000Z \
CONFIRM_FIRESTORE_RESTORE=YES \
npm run firestore:restore
```

Validate:

- Users can sign in against staging.
- Latest `reports`, `users`, `dailyCosts`, and subscription fields are present.
- Route classification and auth tests still pass against restored data.

## Production Restore

Production restore is a break-glass action.

1. Pause writes if possible: disable public traffic at the load balancer or put the API into maintenance mode.
2. Record the exact export path chosen for restore.
3. Run `npm run firestore:backup` first to capture a pre-restore snapshot.
4. Restore with `CONFIRM_FIRESTORE_RESTORE=YES`.
5. Run smoke tests: `/api/health`, auth login, subscription status, report fetch, RevenueCat webhook test event.
6. Re-enable traffic.

## Alerting

Configure a scheduled backup failure alert in the scheduler/CI system. Firestore export failures should page the on-call owner because they directly affect RPO.
