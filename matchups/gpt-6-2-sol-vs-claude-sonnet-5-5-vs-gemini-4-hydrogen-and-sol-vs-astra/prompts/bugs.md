# Coding-agent test: three real bugs in marked (checked 15 Nov 2026)

Each model gets the marked repository at the commit just before a real fix, the issue text below, and nothing else. Grading runs the test files the real fix added, which the models never see. Every pick below was checked on this Mac (Node 24.22.3, npm cache warm): the grading test fails on the starting commit and passes on the fix commit. No AI model was run and no paid API was called.

## The repository

- **marked**, https://github.com/markedjs/marked: "A markdown parser and compiler. Built for speed." (site and live demo: https://marked.js.org/demo/). TypeScript source built to JavaScript; the published package has no dependencies.
- **Licence:** MIT. The LICENSE file also carries John Gruber's original Markdown notice (BSD style), so GitHub's API reports it as `NOASSERTION`.
- **Stars:** 37,305 (GitHub API, 15 Nov). **npm downloads:** 128,858,801 in the week 8-14 Nov (npm API).
- **Measured here:** `git clone` 1 s; `npm ci` 2.2-2.5 s; build (`node esbuild.config.js`) 0.1-0.16 s; one grading test 0.16-0.20 s; the whole spec suite 1.4-4.4 s; unit tests 0.7-0.8 s; the project's full `npm test` (build, docs, specs, unit, types, lint) 13 s. No services, Docker or keys.
- **How its tests work:** a spec test is a pair of files in `test/specs/new/`, `name.md` (input, with options in front matter) and `name.html` (expected output). `test/run-spec-tests.js` loads every pair and checks the rendered HTML against the `.html` file. It imports the built `lib/marked.esm.js`, so build before testing.

## Setting up one attempt

Keep a full clone with history away from the models. Each model gets its own folder made from one commit, with no history and dependencies already installed:

```bash
SRC=~/marked-src                                  # full clone, never shown to a model
git clone https://github.com/markedjs/marked.git "$SRC"

PARENT=<parent commit from the bug below>
RUN=~/matchup-runs/<model>-<issue>/marked          # the clean folder the agent opens
mkdir -p "$RUN" && git -C "$SRC" archive "$PARENT" | tar -x -C "$RUN"
cd "$RUN" && npm ci --no-audit --no-fund && git init -q && git add -A && git commit -qm start
```

`node_modules` and `lib` are git-ignored, so the start commit holds only the source (456 files at the #4045 parent). After the attempt, `git diff` in the folder is that model's patch. Dry run of this recipe for #4045: setup 5 s, `npm test` 13 s and passing, grading 0.27 s, failing before and passing once the fix's `src/` was copied in.

Two ways a model could see the answer:

- **The web.** Each issue page links to its fix PR. Turn off web search and fetch in all three agents, or the test is open book.
- **A newer marked from npm.** The `node_modules` copies of marked at these parents are 18.0.0 and older (checked); every fix here shipped in 18.0.6 or later. A model that runs `npm install marked@latest` could read the fixed code inside `node_modules`.

## Grading one attempt

Copy only the fix's test files into the attempt, build, and run those tests by name:

```bash
cd "$RUN"
git -C "$SRC" archive <fix commit> <test files> | tar -x -C .
node esbuild.config.js
node --test --test-reporter=spec --test-name-pattern='<pattern>' test/run-spec-tests.js
```

Exit code 0 is a pass. Node counts two tests per spec file (the file and its one case), so a pass reads "tests 2, pass 2".

Regression check on the same folder, so a fix that breaks other rendering shows up:

```bash
node --test test/run-spec-tests.js          # whole spec suite, 1.4-4.4 s
node --test test/unit/*.test.js             # unit tests, 0.7-0.8 s
```

---

## Bug 1 (easy): text after an empty nested quote disappears

**For a viewer:** type `>>` on one line and a sentence on the next, and marked throws the sentence away.

- **Issue:** [#4098](https://github.com/markedjs/marked/issues/4098) "Text after an empty nested blockquote is dropped (18.0.9+)", opened 19 Sept 2026, closed 22 Sept. A regression from an earlier fix (#4030); broken in 18.0.9 to 18.0.13.
- **Fix:** PR [#4101](https://github.com/markedjs/marked/pull/4101) "fix: keep text after empty nested blockquote", merged 22 Sept 2026. Commit `1b89557177fe5a7d5d430fdc76e7c8a7c0adf6d7`. First release with it: v18.0.14.
- **Start from (parent):** `7f7a49670c14acc6f11efcb18ecc69d17962477a` ("fix: support GFM protocol autolinks (#4067)", 21 Sept).
- **What the fix changed:** `src/Tokenizer.ts`, +9/-1 in `blockquote()`. The issue names that function and the mechanism.
- **Hidden test files:** `test/specs/new/blockquote_empty_nested_following_text.md`, `test/specs/new/blockquote_empty_nested_following_text.html` (four inputs: `>>`, `>>>`, `> quote` then `>>`, and `>>` with a `> more` quote after; each followed by `text`).
- **Grading command:**

```bash
git -C "$SRC" archive 1b89557177fe5a7d5d430fdc76e7c8a7c0adf6d7 test/specs/new/blockquote_empty_nested_following_text.md test/specs/new/blockquote_empty_nested_following_text.html | tar -x -C .
node esbuild.config.js && node --test --test-reporter=spec --test-name-pattern='^blockquote_empty_nested_following_text( should|$)' test/run-spec-tests.js
```

- **Verified:** parent + hidden tests: exit 1, 0 of 2 pass, 0.19 s (`Expected: …</blockquote></blockquote><p>text</p>…  Actual: …</blockquote></blockquote><blockquote>…`). Fix commit: exit 0, 2 of 2 pass, 0.19 s. `npm ci` 2.4 s. Whole spec suite: 1859 of 1861 before (only the hidden file fails), 1861 of 1861 after, 4.4 s.
- **Known noise:** one unit test, "url email protocols" (`test/unit/Lexer.test.js:2126`), already fails at the parent and at the fix commit. Ignore it in the regression check.
- **On screen** (in an attempt folder, after building):

```bash
node --input-type=module -e "import { marked } from './lib/marked.esm.js'; console.log(marked.parse('>>\ntext\n> more'))"
```

Unfixed prints only the two empty `<blockquote>` tags; `text` and the `> more` quote are gone. Fixed adds `<p>text</p>` and `<blockquote><p>more</p></blockquote>`.

**What the model gets** (issue title and body, verbatim; the one comment, "PRs are always welcome", is left out):

````text
Text after an empty nested blockquote is dropped (18.0.9+)

**Marked version:** 18.0.9 through 18.0.13 (18.0.8 is fine)

**Describe the bug**
Text on the line after an empty nested blockquote is dropped from the output, with default options.

**To Reproduce**
1. [Marked Demo](https://marked.js.org/demo/?outputType=html&text=%3E%3E%0Atext)
2. [CommonMark Demo](https://spec.commonmark.org/dingus/?text=%3E%3E%0Atext)

`marked.parse('>>\ntext')` in 18.0.8, matching the dingus:

```html
<blockquote>
<blockquote>
</blockquote>
</blockquote>
<p>text</p>
```

In 18.0.9 to 18.0.13:

```html
<blockquote>
<blockquote>
</blockquote>
</blockquote>
```

Same for `>>>\ntext` and `> quote\n>>\ntext`. With `>>\ntext\n> more`, the following `> more` blockquote disappears as well.

**Expected behavior**
The empty nested blockquote closes and `text` becomes a paragraph after it, as in CommonMark and 18.0.8.

This looks like it comes from #4030: the continuation branch in `Tokenizer.blockquote()` now appends every continuation line to `raw`, also when the re-tokenized nested blockquote did not consume them, so the lexer skips past text no token holds. Reverting that commit brings the paragraph back. I have a small fix with a spec test in `test/specs/new/` and would be glad to open a PR if that is welcome.
````

---

## Bug 2 (medium): checkboxes jump off their labels in a nested checklist

**For a viewer:** in a to-do list with sub-items, some checkboxes end up on their own line with the label dropped below, and others in the same list don't.

- **Issue:** [#4045](https://github.com/markedjs/marked/issues/4045) "Task list checkbox rendered outside the <p> in loose nested lists, inconsistently within the same list", opened 7 Aug 2026, closed 15 Aug. The reporter bisected it to 17.0.0.
- **Fix:** PR [#4046](https://github.com/markedjs/marked/pull/4046) "fix: place task checkboxes after list loose is finalized", merged 15 Aug 2026. Commit `b8cf7dc5929331d3014555babc33bcda0dae4999`. First release with it: v18.0.10.
- **Start from (parent):** `9552b6bbca7f587f96b7249c5833358a17a18e2b`.
- **What the fix changed:** `src/Tokenizer.ts`, +13/-8 in `list()`: the list's loose/tight decision moved into its own pass before checkboxes are placed. The issue gives the input and both outputs but no cause.
- **Hidden test files:** `test/specs/new/list_loose_nested_tasks.md`, `test/specs/new/list_loose_nested_tasks.html` (the issue's own sample list).
- **Grading command:**

```bash
git -C "$SRC" archive b8cf7dc5929331d3014555babc33bcda0dae4999 test/specs/new/list_loose_nested_tasks.md test/specs/new/list_loose_nested_tasks.html | tar -x -C .
node esbuild.config.js && node --test --test-reporter=spec --test-name-pattern='^list_loose_nested_tasks( should|$)' test/run-spec-tests.js
```

- **Verified:** parent + hidden tests: exit 1, 0 of 2 pass, 0.18 s (`Expected: <ul><li><p><input …  Actual: <ul><li><input …`). Fix commit: exit 0, 2 of 2 pass, 0.18 s. `npm ci` 2.2 s. Whole spec suite: 1779 of 1781 before, 1781 of 1781 after, 4.0 s. Unit tests 190 of 190 at the fix.
- **On screen:**

```bash
node --input-type=module -e "import { marked } from './lib/marked.esm.js'; console.log(marked.parse('* [ ] Prepare the project\n\n  * [ ] Install dependencies\n* [x] Run the tests\n'))"
```

Unfixed: `<li><input disabled="" type="checkbox"> <p>Prepare the project</p>` (in a browser the box sits alone above its label) while "Run the tests" gets `<li><p><input …> Run the tests</p>`. Fixed: both items read `<li><p><input …> …</p>`. Rendering the issue's sample in a browser page shows it best.

**What the model gets** (verbatim; the one comment is left out, because it names the fix commit):

````text
Task list checkbox rendered outside the <p> in loose nested lists, inconsistently within the same list

### Marked version

18.0.9 (browser, UMD build). Not present in 15.0.12.

### Describe the bug

In a **loose** task list that contains a nested list, the checkbox is sometimes emitted *outside* the paragraph :

```html
<li><input type="checkbox"> <p>Text</p>
```

instead of inside it :

```html
<li><p><input type="checkbox"> Text</p>
```

Since `<p>` is a block element, the checkbox ends up alone on its own line and the label drops below it.

What makes me think this is a bug rather than a deliberate change :

**it is inconsistent within a single list. ** In the sample below, three of the four task items get the checkbox outside the paragraph, and one gets it inside, for identical Markdown structure.

### To Reproduce

```markdown
* [ ] Prepare the project

  * [ ] Install dependencies
  * [x] Update Marked
  * [ ] Check the rendering
* [x] Run the tests

  * [x] Test lists
  * [ ] Test tables

    * [ ] Test nested cases
```

Output on 18.0.9 :

```html
<ul>
<li><input disabled="" type="checkbox"> <p>Prepare the project</p>
<ul>
<li><input disabled="" type="checkbox"> Install dependencies</li>
<li><input checked="" disabled="" type="checkbox"> Update Marked</li>
<li><input disabled="" type="checkbox"> Check the rendering</li>
</ul>
</li>
<li><p><input checked="" disabled="" type="checkbox"> Run the tests</p>
<ul>
<li><input checked="" disabled="" type="checkbox"> <p>Test lists</p>
</li>
<li><input disabled="" type="checkbox"> <p>Test tables</p>
<ul>
<li><input disabled="" type="checkbox"> Test nested cases</li>
</ul>
</li>
</ul>
</li>
</ul>
```

`Run the tests` is the odd one out : same structure as the others, but its checkbox stays inside the `<p>`.

Same input on 15.0.12, for comparison

```html
<ul>
<li><p><input disabled="" type="checkbox"> 
Prepare the project</p>
<ul>
<li><input disabled="" type="checkbox"> Install dependencies</li>
<li><input checked="" disabled="" type="checkbox"> Update Marked</li>
<li><input disabled="" type="checkbox"> Check the rendering</li>
</ul>
</li>
<li><p><input checked="" disabled="" type="checkbox"> 
Run the tests</p>
<ul>
<li><p><input checked="" disabled="" type="checkbox"> 
Test lists</p>
</li>
<li><p><input disabled="" type="checkbox"> 
Test tables</p>
<ul>
<li><input disabled="" type="checkbox"> Test nested cases</li>
</ul>
</li>
</ul>
</li>
</ul>
```

15.0.12 always keeps the checkbox inside the `<p>`, so it renders on one line. The stray newline after the `<input>` collapses to whitespace and makes no visual difference.



### Expected behavior

The checkbox stays inside the paragraph, as in 15.0.12, and the placement is at least consistent across items of the same list.

### Note

I bisected by testing every version from 13.0.0 to 18.0.9 on https://marked.js.org/demo/ (the version dropdown makes this easy).

Output is identical to 15.0.12 all the way through 16.X, then changes starting exactly at 17.0.0, and stays the same from 17.0.0 through 18.0.9.

So the regression was introduced in 17.0.0, though I haven’t looked at the commits to say which change is responsible : the checkbox-token/loose-list-paragraph changes mentioned in the 17.0.0 release notes look like the right area, but that’s a guess.

I ran the same corpus (~30 list variations) through both versions and this is the only case where the rendered output differs visually.
Everything else was whitespace-only changes in the source.
````

---

## Bug 3 (tricky): a link quietly points somewhere else

**For a viewer:** a web address containing `&lt;` comes out as a link to a different address, because the browser reads `&lt;` as `<`.

- **Issue:** [#4052](https://github.com/markedjs/marked/issues/4052) "`&` not HTML-escaped in link/autolink href, silently changing the link target", opened 15 Aug 2026, closed 4 Sept. The reporter says it reproduces back to v12.
- **Fix:** PR [#4053](https://github.com/markedjs/marked/pull/4053) "fix: escape character references in autolink destinations", merged 4 Sept 2026. Commit `8f432f0ef219439cb1b5efdb86018aee0e44a141`. First release with it: v18.0.12.
- **Start from (parent):** `44ddc319a2fbbfcbcecbaf4c974975ab2d6b6e98`.
- **What the fix changed:** three source files, +17/-6: `src/Tokenizer.ts` marks autolink tokens (`autolink: true`), `src/Tokens.ts` declares the field, `src/Renderer.ts` escapes every `&` in an autolink's href and text, and only the `&` that cannot start a character reference in other links and image `src`.
- **Hidden test files:** `test/specs/new/link_destination_character_references.md`, `test/specs/new/link_destination_character_references.html`. Fifteen cases (bare URLs, `<…>` autolinks, inline links, reference links, images, each with `&lt;`, `&amp;` and a bare `&`), compared as one exact string (`renderExact: true`).
- **Left out of grading:** the fix also added `autolink: true` to four expected tokens in `test/unit/Lexer.test.js`. That asserts the field name the maintainers chose, which a model cannot know. If a model adds its own token field, the parent's Lexer unit tests fail on token shape alone; read those failures before counting them as regressions.
- **Grading command:**

```bash
git -C "$SRC" archive 8f432f0ef219439cb1b5efdb86018aee0e44a141 test/specs/new/link_destination_character_references.md test/specs/new/link_destination_character_references.html | tar -x -C .
node esbuild.config.js && node --test --test-reporter=spec --test-name-pattern='^link_destination_character_references( should|$)' test/run-spec-tests.js
```

- **Verified:** parent + hidden tests: exit 1, 0 of 2 pass, 0.20 s. Fix commit: exit 0, 2 of 2 pass, 0.18 s. `npm ci` 2.4 s. Whole spec suite: 1793 of 1795 before, 1795 of 1795 after, 3.9 s. Unit tests 191 of 191 at the fix.
- **Score per line** (the test is all or nothing; this counts how many of the 15 lines an attempt gets right):

```bash
node --input-type=module -e "
import { Marked } from './lib/marked.esm.js'; import fs from 'node:fs';
const d = 'test/specs/new/link_destination_character_references';
const got = new Marked().parse(fs.readFileSync(d + '.md', 'utf8').replace(/^---[\s\S]*?---\n/, '')).split('\n');
const want = fs.readFileSync(d + '.html', 'utf8').split('\n').filter(Boolean);
console.log(want.filter((l, i) => l === got[i]).length + ' of ' + want.length + ' lines right');"
```

Measured with hand edits to `src/Renderer.ts` at the parent (not model attempts):

| Change | Lines right |
| --- | --- |
| None (the parent) | 6 of 15 |
| The issue's own suggestion: `escapeHtmlEntities(href, true)` on link `href` and image `src` | 5 of 15 (wrong: 1, 2, 4, 5, 7, 8, 10, 11, 13, 14) |
| `escapeHtmlEntities(href)` without `encode` on both | 11 of 15 (wrong: 1, 2, 4, 5, the autolinks) |
| The real fix | 15 of 15 |

- **Where the test is marked's own choice:** on lines 7, 10 and 13 an inline or reference link keeps `&lt;` in the href. CommonMark would decode it and percent-encode to `?x=1%3C2`; the spec file's own comment says marked differs there. An attempt that follows CommonMark to the letter fails those three lines while being defensible. Lines 1-3 (bare `https://` URLs under GFM) also follow marked's choice. Check the per-line output before calling an attempt wrong.
- **On screen:**

```bash
node --input-type=module -e "import { marked } from './lib/marked.esm.js'; console.log(marked.parse('<https://example.com/?x=1&lt;2>\n\n[t](https://example.com/?x=1&lt;2)'))"
```

The same address twice, as an autolink and as an ordinary link. Unfixed: the autolink's `href="https://example.com/?x=1&lt;2"`, which a browser follows to `?x=1<2` (the bug); the ordinary link goes to `?x=1<2` too, which is right for it. Fixed: the autolink's href is `…?x=1&amp;lt;2` (goes to `?x=1&lt;2`) and the ordinary link still goes to `?x=1<2`. Hydrogen's and Terra's attempts (15 Nov) escape the ordinary link as well, so it goes to `?x=1&lt;2`: hidden-test lines 7, 8, 10, 11, 13 and 14, every ordinary link and image with a character reference. Hovering the link in a browser shows the address it really goes to.

**What the model gets** (verbatim; the two comments are left out, because the second one lays out the fix):

````text
`&` not HTML-escaped in link/autolink href, silently changing the link target

**Marked version:** 18.0.9 (also reproduces on every version tested, back to v12)

**Markdown flavor:** CommonMark

**Repro**
```js
const { marked } = require('marked');
marked('<https://example.com/?x=1&lt;2>');
```

**Expected** (commonmark.js and CommonMark spec [example 595](https://spec.commonmark.org/0.31.2/#example-595) — `&` in the destination is escaped to `&amp;`):
```html
<p><a href="https://example.com/?x=1&amp;lt;2">https://example.com/?x=1&amp;lt;2</a></p>
```

**Actual** (raw `&` in the href):
```html
<p><a href="https://example.com/?x=1&lt;2">https://example.com/?x=1&lt;2</a></p>
```

Because `&lt;` is a valid HTML character reference, a browser decodes it inside the attribute, so the link actually points to `https://example.com/?x=1<2` — a different URL than was written. Confirmed by parsing marked's output with parse5:
```
marked href, parsed back: "https://example.com/?x=1<2"     (wrong)
commonmark href, parsed:  "https://example.com/?x=1&lt;2"   (correct)
```
Note marked already escapes the same URL in the anchor *text* (`&amp;`) but not in the `href`, so the output is internally inconsistent. Any URL containing a valid entity sequence (`&lt;`, `&amp;`, `&copy;`, …) is affected; this is silent link-target corruption for user- or attacker-supplied URLs.

**Cause**
`Renderer.link()` writes `cleanUrl(href)` straight into the attribute without `escapeHtmlEntities()` — while the `title` attribute one line below *is* escaped. `cleanUrl` only runs `encodeURI`, which never encodes `&`, so the raw `&` reaches the attribute. (`Renderer.image()` has the same pattern for `src`.)
````

---

## Backup A (easy): a tilde before inline code puts the code style on the wrong words

**For a viewer:** write `` ~`0.1576` `` ("about 0.1576") and the code highlighting lands on the words between the numbers instead of the numbers.

- **Issue:** [#4011](https://github.com/markedjs/marked/issues/4011) "Inline code after a tilde is parsed with shifted backticks", opened 8 Jul 2026, closed 14 Jul.
- **Fix:** PR [#4012](https://github.com/markedjs/marked/pull/4012) "fix: preserve code spans adjacent to tildes", merged 14 Jul 2026. Commit `0de7188bf1f30511490c961d53865390e7ede956`. First release with it: v18.0.7.
- **Start from (parent):** `f056437b389407ab3a29fe9cb61a989f043edb3e`.
- **What the fix changed:** `src/rules.ts`, one line: the GFM inline `text` regex.
- **Hidden test files:** `test/specs/new/codespan_adjacent_tilde.md`, `test/specs/new/codespan_adjacent_tilde.html`.
- **Grading command:**

```bash
git -C "$SRC" archive 0de7188bf1f30511490c961d53865390e7ede956 test/specs/new/codespan_adjacent_tilde.md test/specs/new/codespan_adjacent_tilde.html | tar -x -C .
node esbuild.config.js && node --test --test-reporter=spec --test-name-pattern='^codespan_adjacent_tilde( should|$)' test/run-spec-tests.js
```

- **Verified:** parent + hidden tests: exit 1, 0 of 2 pass, 0.17 s (``Expected: <p>~<code>code</code></p>…  Actual: <p>~`code`</p>…``). Fix commit: exit 0, 2 of 2 pass, 0.17 s. `npm ci` 2.2 s. Whole spec suite: 1753 of 1755 before, 1755 of 1755 after, 1.6 s. Unit tests 188 of 188.
- **On screen:** ``marked.parse('~`0.1576` to measurement-window-only `0.00092`')``. Unfixed: ``<p>~`0.1576<code>to measurement-window-only</code>0.00092`</p>``. Fixed: `<p>~<code>0.1576</code> to measurement-window-only <code>0.00092</code></p>`.

**What the model gets** (verbatim; the issue has no comments):

````text
Inline code after a tilde is parsed with shifted backticks

**Marked version:** 18.0.5

**Markdown flavor:** GitHub Flavored Markdown

**Describe the bug**

A literal tilde immediately followed by an inline code span causes the opening backtick to be consumed as text. Subsequent backticks are then paired incorrectly.

**To Reproduce**

1. Create an empty directory and install Marked:

   ```sh
   npm init -y
   npm install marked@18.0.5
   ```

2. Save this as `repro.mjs`:

   ```js
   import assert from "node:assert/strict"
   import { marked } from "marked"

   const markdown = "~`0.1576` to measurement-window-only `0.00092`"
   const expected = "<p>~<code>0.1576</code> to measurement-window-only <code>0.00092</code></p>\n"
   const actual = marked.parse(markdown)

   console.log(actual)
   assert.equal(actual, expected)
   ```

3. Run `node repro.mjs`.

Actual output:

```html
<p>~`0.1576<code>to measurement-window-only</code>0.00092`</p>
```

**Expected behavior**

The tilde should remain literal and both complete backtick pairs should be parsed as code spans:

```html
<p>~<code>0.1576</code> to measurement-window-only <code>0.00092</code></p>
```
````

---

## Backup B (medium): a numbered list after a quote gets swallowed into the quote

**For a viewer:** a quote line followed by "2. next step" puts the numbered step inside the quote box.

- **Issue:** [#4002](https://github.com/markedjs/marked/issues/4002) "Ordered list following a blockquote is incorrectly nested inside the blockquote", opened 23 Jun 2026, closed 30 Jun.
- **Fix:** PR [#4003](https://github.com/markedjs/marked/pull/4003) "fix: Fix ordered lists after blockquotes", merged 30 Jun 2026. Commit `33928d06634570d44c3426f4f48615f4c0a30b11`. First release with it: v18.0.6.
- **Start from (parent):** `bbb84c88cf3a187c93fbc8966002164d229eba62`.
- **What the fix changed:** `src/rules.ts`, +8/-3: inside a quote, a list starting at any number may now end the quote's paragraph (outside a quote only a list starting at 1 may). The issue guesses the cause is the list branch of `Tokenizer.blockquote()`; the real fix is in the rules.
- **Hidden test files:** `test/specs/new/ordered_list_after_blockquote.md`, `test/specs/new/ordered_list_after_blockquote.html`.
- **Grading command:**

```bash
git -C "$SRC" archive 33928d06634570d44c3426f4f48615f4c0a30b11 test/specs/new/ordered_list_after_blockquote.md test/specs/new/ordered_list_after_blockquote.html | tar -x -C .
node esbuild.config.js && node --test --test-reporter=spec --test-name-pattern='^ordered_list_after_blockquote( should|$)' test/run-spec-tests.js
```

- **Verified:** parent + hidden tests: exit 1, 0 of 2 pass, 0.16 s (`Expected: <blockquote><p>blockquote</p></blockquote><ol start="2">…  Actual: <blockquote><p>blockquote</p><ol start="2">…`). Fix commit: exit 0, 2 of 2 pass, 0.16 s. `npm ci` 2.5 s. Whole spec suite: 1745 of 1747 before, 1747 of 1747 after, 1.4 s. Unit tests 188 of 188.
- **On screen:** `marked.parse('> blockquote\n2. test')`. Unfixed: the `<ol start="2">` sits inside the `<blockquote>`. Fixed: it follows it.

**What the model gets** (verbatim; the issue has no comments):

````text
Ordered list following a blockquote is incorrectly nested inside the blockquote

**Marked version:** 18.0.5

**Describe the bug**

When an **ordered list item** immediately follows a blockquote line (no blank line, list marker at column 0), marked’s `blockquote` tokenizer **lazy-continues** and absorbs the list into the blockquote. The list is parsed as a nested ordered list inside the blockquote instead of a sibling block.

This affects **ordered lists only**. An unordered list after a blockquote is parsed correctly as a sibling. A blockquote followed by a blank line and then a list is also parsed correctly.

The root cause appears to be in the `blockquote()` tokenizer: when the last parsed child inside a blockquote is a `list`, marked merges remaining lines into that list (`h?.type === "list"` branch), which pulls in subsequent ordered-list lines that should end the blockquote.

**To Reproduce**

1. [Marked Demo](https://marked.js.org/demo/) — paste:

```markdown
1. test
> blockquote
2. test
> blockquote
```

2. [CommonMark Dingus](https://spec.commonmark.org/dingus/) — same input.

Or run locally:

```bash
npm install marked
node -e "
const { marked } = require('marked');
const md = \`1. test
> blockquote
2. test
> blockquote\`;
console.log(marked.parse(md, { gfm: true, breaks: true }));
"
```

**Actual output (marked):**

```html
<ol>
<li>test</li>
</ol>
<blockquote>
<p>blockquote</p>
<ol start="2">
<li>test<br>blockquote</li>
</ol>
</blockquote>
```

Lexer tokens show the second list item and the second `> blockquote` line are trapped inside one blockquote token:

```js
// Simplified token tree
[
  { type: 'list', items: [{ text: 'test' }] },
  {
    type: 'blockquote',
    tokens: [
      { type: 'paragraph', text: 'blockquote' },
      { type: 'list', ordered: true, start: 2, items: [{ text: 'test\nblockquote' }] }
    ]
  }
]
```

**Expected behavior**

Per CommonMark (and micromark), the blockquote should close after its content, and the following ordered list items and blockquotes should be **sibling blocks**:

```html
<ol>
<li>test</li>
</ol>
<blockquote>
<p>blockquote</p>
</blockquote>
<ol start="2">
<li>test</li>
</ol>
<blockquote>
<p>blockquote</p>
</blockquote>
```

Minimal case:

```markdown
> blockquote
2. test
```

**Expected:** `<blockquote><p>blockquote</p></blockquote>` followed by `<ol start="2"><li>test</li></ol>`.

**Actual:** the `<ol>` is nested inside the `<blockquote>`.
````

---

## How old the fixes are

All five fixes landed between 30 Jun and 22 Sept 2026: the picks on 15 Aug, 4 Sept and 22 Sept, the backups on 30 Jun and 14 Jul. Sonnet 5.5 came out 28 Sept, GPT-6.1 Terra 26 Oct, Gemini 4 Hydrogen 12 Nov; their training cut-offs are not published, so any of them may have read these fixes. The only October and November fixes with a closed issue are #4112 and #4120 (both 6 Oct, listed below). The other fixes since then were PRs without an issue, and #4176 (1 Nov) is still open, with PR #4205 (13 Nov) fixing two of its three cases.

## Also checked

- **#4038 / PR #4039** (merged 5 Aug, commit `81bd7505338f83ad118401f53ab6b0e86b8d895f`): a code fence on the last line of a document after a paragraph shows as plain text. Verified as a third spare: 6 hidden tests (`backtick_fence_eof_interrupts_paragraph`, `tilde_fence_eof_interrupts_paragraph`, and a changed `test/specs/redos/quadratic_tilde_paragraph_interrupt.cjs`), all fail before (3.2 s) and pass after (0.17 s). The issue says where to look: fence detection when a paragraph is interrupted.
- **#4099 and #4120** (quadratic slowdowns): graded by timing, which varies by machine.
- **#4112** (CLI `--string ''` reads stdin): a one-line fix with nothing to show on screen.
- **#4176** (code span inside link text): still open; its fix PR covers two of the three cases in the issue.
- Merged PRs since 1 June in other repositories, bots included (GitHub search, 15 Nov): markdown-it 7, dayjs 5, date-fns 4, rich 4, sqlparse 7, python-tabulate 0, against marked's 158. Not searched further.
