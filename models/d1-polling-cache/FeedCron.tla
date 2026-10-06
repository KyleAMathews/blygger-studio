---------------------------- MODULE FeedCron ----------------------------
EXTENDS Feed, FiniteSets
CONSTANTS MaxTicks, ServeOnTick, FreshTimer
VARIABLES ticks, queued, required, timerActive
cronVars == <<source, revision, artifact, attempts, regressed, missedCheck,
              checks, renders, triggerWrites, services,
              ticks, queued, required, timerActive>>
CronInit == Init /\ ticks = 0
            /\ queued = [c \in Clients |-> FALSE]
            /\ required = [c \in Clients |-> 0]
            /\ timerActive = [c \in Clients |-> FALSE]
\* Arrival can occur while another render is active. Its revision obligation
\* survives until the slot can perform a fresh check after that job finishes.
Tick(c) ==
    /\ ticks < MaxTicks /\ ~queued[c]
    /\ ticks' = ticks + 1
    /\ queued' = [queued EXCEPT ![c] = TRUE]
    /\ required' = [required EXCEPT ![c] = revision]
    /\ timerActive' = [timerActive EXCEPT ![c] = FALSE]
    /\ services' = IF ServeOnTick THEN Bump(services) ELSE services
    /\ UNCHANGED <<source, revision, artifact, attempts, regressed, missedCheck,
                    checks, renders, triggerWrites>>
StartTimer(c) ==
    /\ queued[c]
    /\ LET joining == ~FreshTimer /\ attempts[c].phase \in
                        {"readA", "readB", "validate", "preflight", "publish"}
       IN /\ attempts[c].phase \in {"idle", "done", "failed"} \/ joining
          /\ attempts' = IF joining THEN attempts ELSE
               [attempts EXCEPT ![c] = [Blank EXCEPT !.phase = "check"]]
    /\ queued' = [queued EXCEPT ![c] = FALSE]
    /\ timerActive' = [timerActive EXCEPT ![c] = TRUE]
    /\ UNCHANGED <<source, revision, artifact, regressed, missedCheck,
                    checks, renders, triggerWrites, services, ticks, required>>
CronNext == (Next /\ UNCHANGED <<ticks, queued, required, timerActive>>)
            \/ (\E c \in Clients : Tick(c) \/ StartTimer(c))
CronSpec == CronInit /\ [][CronNext]_cronVars
\* Each client can issue at most one HTTP request; cron adds none.
TimerDoesNotServe == services <= Cardinality(Clients)
\* Once the timer has checked (or joined a job), its sampled revision must
\* include the writes committed before the tick arrived. Failure is not a
\* publication or liveness promise; this law only protects the fresh check.
TimerChecksFresh == \A c \in Clients :
    (timerActive[c] /\ attempts[c].phase \in
      {"readA", "readB", "validate", "preflight", "publish", "done", "failed"})
    => attempts[c].before >= required[c]
=============================================================================
