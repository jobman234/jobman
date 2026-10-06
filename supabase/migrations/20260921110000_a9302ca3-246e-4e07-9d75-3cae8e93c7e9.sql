-- "Users can create reviews" is commented "for jobs they participated in",
-- but its WITH CHECK only verifies reviewer_id = auth.uid() — it never
-- checks that job_id refers to a real job the reviewer was actually on, that
-- the job is even completed, or that reviewee_id is the correct other party.
-- Reviews are publicly viewable to everyone including anonymous visitors, so
-- this let any authenticated account post a fabricated rating/comment
-- against any artisan (or any customer) for any job, real or not — sabotage
-- a competitor with fake 1-star reviews, or inflate an ally's rating with
-- fake 5-stars, none of it tied to work that ever happened.
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;

CREATE POLICY "Users can create reviews for jobs they completed" ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id
      AND j.status = 'completed'
      AND (
        (j.customer_id = auth.uid() AND j.assigned_artisan_id = reviewee_id)
        OR
        (j.assigned_artisan_id = auth.uid() AND j.customer_id = reviewee_id)
      )
  )
);
