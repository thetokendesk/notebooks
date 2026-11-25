# Bug race: the bugs and the prompts

Real bugs in marked (https://github.com/markedjs/marked), a Markdown parser. Each model got the repository at the commit just before the real fix, with no history, and the prompt below. The hidden tests are the spec files the real fix added; no model saw them.

## Bug 1: text after an empty nested quote disappears

Issue: markedjs/marked#4098. Starting commit `7f7a49670c14acc6f11efcb18ecc69d17962477a`, the real fix `1b89557177fe5a7d5d430fdc76e7c8a7c0adf6d7`. Hidden tests: `test/specs/new/blockquote_empty_nested_following_text.md`, `test/specs/new/blockquote_empty_nested_following_text.html`.

The prompt, word for word:

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

---

The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages.
````

## Bug 2: checkboxes jump off their labels in a nested checklist

Issue: markedjs/marked#4045. Starting commit `9552b6bbca7f587f96b7249c5833358a17a18e2b`, the real fix `b8cf7dc5929331d3014555babc33bcda0dae4999`. Hidden tests: `test/specs/new/list_loose_nested_tasks.md`, `test/specs/new/list_loose_nested_tasks.html`.

The prompt, word for word:

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

---

The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages.
````

## Bug 3: a link quietly points somewhere else

Issue: markedjs/marked#4052. Starting commit `44ddc319a2fbbfcbcecbaf4c974975ab2d6b6e98`, the real fix `8f432f0ef219439cb1b5efdb86018aee0e44a141`. Hidden tests: `test/specs/new/link_destination_character_references.md`, `test/specs/new/link_destination_character_references.html`.

The prompt, word for word:

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

---

The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages.
````

## Bug 4: a tilde before inline code puts the code style on the wrong words

Issue: markedjs/marked#4011. Starting commit `f056437b389407ab3a29fe9cb61a989f043edb3e`, the real fix `0de7188bf1f30511490c961d53865390e7ede956`. Hidden tests: `test/specs/new/codespan_adjacent_tilde.md`, `test/specs/new/codespan_adjacent_tilde.html`.

The prompt, word for word:

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

---

The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages.
````

## Bug 5: a numbered list after a quote gets swallowed into the quote

Issue: markedjs/marked#4002. Starting commit `bbb84c88cf3a187c93fbc8966002164d229eba62`, the real fix `33928d06634570d44c3426f4f48615f4c0a30b11`. Hidden tests: `test/specs/new/ordered_list_after_blockquote.md`, `test/specs/new/ordered_list_after_blockquote.html`.

The prompt, word for word:

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

---

The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages.
````
