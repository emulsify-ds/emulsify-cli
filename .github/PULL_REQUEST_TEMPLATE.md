# Pull Request

> **Title requirement:** Every pull request targeting `main` must have a
> release-producing conventional title whose release type matches the complete
> change, such as `fix(scope): ...` or `feat(scope): ...`. CI evaluates the
> title as a prospective squash commit; if squash merging is used, the title
> becomes the release-bearing commit.

## Summary

<!-- What changed, and why is this the right change for Emulsify CLI? -->

## Related Issue

<!-- Use "Closes #123" when this pull request should close an issue. -->

## Verification

<!-- Check the commands you ran. Explain any omitted step below. -->

- [ ] `npm run build`
- [ ] `npm run type`
- [ ] `npm test`
- [ ] `npm run pack:dry-run`
- [ ] `npm run smoke:pack`

<!-- Add manual checks or explain why a command was not applicable. -->

## Checklist

- [ ] I added or updated tests for behavior changes.
- [ ] I updated documentation for user-facing changes.
- [ ] I did not manually change the package version; the release workflow owns
      it.
