# All Saints — Known Issues / Share Notes

Use this file to keep the current risk picture explicit before sharing the product more widely.

## Open issues to track

### Infrastructure / deployment
- [ ] Confirm Vercel → Railway `/api/*` rewrite still points at the correct backend
- [ ] Confirm Railway health check stays green at `/api/health`
- [ ] Confirm production saint roster loads cleanly after deploys

### Voice
- [ ] Verify live `voice/status` matches actual availability
- [ ] Verify at least two saint voices play correctly in production
- [ ] Verify text-only fallback stays clean when ElevenLabs is unavailable

### Conversation quality
- [ ] Re-check saint differentiation across at least 3 saints
- [ ] Re-check council mode rendering after backend changes
- [ ] Re-check study mode behavior after prompt or routing edits

### First-run UX
- [ ] Confirm no dead-end first-run actions remain
- [ ] Confirm loading / error states keep the right tone
- [ ] Confirm no placeholder copy or stale labels leak into the live product

## Before sharing

Write down:
- who it is being shared with
- what environment they will use
- what specific feedback is being requested
- what known rough edges they should expect

## Share log

### Template
- Date:
- Environment:
- Shared with:
- Goal:
- Known caveats disclosed:
- Follow-up needed:
