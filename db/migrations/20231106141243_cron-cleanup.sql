-- migrate:up
select
    cron.schedule('cleanup-cron-job-run-details', '30 3 * * *', 'delete from cron.job_run_details where end_time < now() - interval ''3 months''');

-- migrate:down
