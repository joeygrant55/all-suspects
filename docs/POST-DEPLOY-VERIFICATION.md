# Post-Deploy Verification

Use this right after a production deploy and before sharing All Saints more broadly.

## Confirm the deployment landed
- Verify the intended frontend deploy is live
- Verify the intended backend deploy is live
- Note the commit / build identifier if available

## Basic live checks
- Open the production URL
- Confirm the homepage loads cleanly
- Confirm saint roster loads without error
- Confirm no obvious console-breaking issue appears on first load

## Core product checks
- Start one conversation in normal chat flow
- Confirm response quality is coherent and in-character
- If council mode is live, confirm it renders and responds correctly
- If study mode is live, confirm it behaves as expected for at least one saint
- If voice is enabled, confirm playback controls appear and audio works

## Reliability / credibility checks
- Look for broken images, missing assets, or dead routes
- Look for API errors, timeouts, or malformed responses
- Watch for anything that breaks reverence, clarity, or trust

## Decision
- Shareable now: yes / no
- If no, what blocks sharing?
- If yes, who is safe to send it to first?
