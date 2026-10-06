-- Same shape of bug as the escrows fix: "negotiations" has client-facing
-- INSERT policies that never check the artisan is actually the one assigned
-- to the job (any account with the 'artisan' role could insert a fabricated
-- offer, impersonating themselves as the negotiator on ANY job, real or not),
-- and an UPDATE policy with no WITH CHECK at all, letting either the job's
-- real customer or the negotiation's real artisan rewrite ANY column
-- (price, terms, sender_role, status) on any negotiation tied to that job at
-- any time, well after the fact.
--
-- The product has since moved to admin-mediated matching (customers describe
-- what they need to the chatbot; Jobman admin contacts artisans offline and
-- comes back with an agreed artisan/price/timeline) — direct
-- customer<->artisan negotiation through this table is legacy and no
-- frontend code writes to it anymore; JobDetail.tsx only ever reads it to
-- show historical negotiation records. So these write policies are pure
-- attack surface with no legitimate use, same as the escrows/wallet_transactions
-- fix. Proved with a local Postgres harness: an uninvolved artisan account
-- was able to insert a fabricated negotiation impersonating themselves as
-- the negotiator on someone else's job before this fix, blocked after it;
-- the real read path (JobDetail.tsx's negotiation history query) still works
-- unaffected since the SELECT policies are untouched.
DROP POLICY IF EXISTS "Artisans can create negotiations" ON public.negotiations;
DROP POLICY IF EXISTS "Customers can create counter offers" ON public.negotiations;
DROP POLICY IF EXISTS "Participants can update negotiation status" ON public.negotiations;
