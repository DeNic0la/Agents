#!/usr/bin/env python3
"""Turn Jira XML exports into compact Markdown.

Reads the XML that Jira produces for one issue (Export > XML) or for a filter
(the search's XML view): an RSS feed with one <item> per issue. Prints one
Markdown document per issue, or writes each to <dir>/<KEY>-<slug>.md with -o.

Standard library only. Run untrusted exports with `python -I`.
"""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path


class NotAJiraExport(Exception):
    """The file is not a Jira XML export this script can read."""


# Custom fields that only carry Jira-internal bookkeeping.
NOISE_FIELD_TYPES = ("gh-lexo-rank", "devsummary", "issue-templates-customfield")
ISSUE_KEY = re.compile(r"[A-Za-z][A-Za-z0-9_]*-[0-9]+")


# ---------------------------------------------------------------- model


@dataclass
class Comment:
    author: str
    created: str
    body: str


@dataclass
class Attachment:
    name: str
    size_bytes: int
    author: str
    created: str


@dataclass
class JiraIssue:
    key: str
    summary: str
    url: str = ""
    exported: str = ""
    fields: list[tuple[str, str]] = field(default_factory=list)
    links: list[tuple[str, list[str]]] = field(default_factory=list)
    attachments: list[Attachment] = field(default_factory=list)
    custom_fields: list[tuple[str, str]] = field(default_factory=list)
    description: str = ""
    environment: str = ""
    comments: list[Comment] = field(default_factory=list)


# ---------------------------------------------------------------- HTML -> Markdown


@dataclass
class _Frame:
    """An element whose text is post-processed when it closes: a, cell, quote, pre."""

    kind: str
    parts: list[str] = field(default_factory=list)
    href: str | None = None


class JiraHtmlToMarkdown(HTMLParser):
    """Converts the HTML Jira renders for descriptions, comments and text fields.

    Tolerates sloppy HTML: an element left open inside another is closed with it,
    and tables nested in a cell are flattened into the cell's text.
    """

    HEADINGS = ("h1", "h2", "h3", "h4", "h5", "h6")

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.frames: list[_Frame] = [_Frame("root")]
        self.lists: list[str] = []
        self.table_depth = 0
        self.row: list[str] | None = None
        self.rows_in_table = 0
        self.after_bullet = False

    # -- output plumbing

    def _out(self, text: str) -> None:
        self.frames[-1].parts.append(text)

    def _tail(self) -> str:
        parts = self.frames[-1].parts
        return parts[-1] if parts else ""

    def _inside(self, kind: str) -> bool:
        return any(f.kind == kind for f in self.frames)

    def _block_break(self, newlines: str = "\n\n") -> None:
        if self._inside("cell"):
            self._out(" ")
        elif not self.after_bullet:
            self._out(newlines)

    def _open(self, kind: str, href: str | None = None) -> None:
        self.frames.append(_Frame(kind, href=href))

    def _close(self, kind: str) -> _Frame | None:
        """Pop up to the innermost open `kind`, folding unclosed inner frames into their parent."""
        if not any(f.kind == kind for f in self.frames[1:]):
            return None
        while True:
            frame = self.frames.pop()
            if frame.kind == kind:
                return frame
            self._out(self._render(frame))

    def _render(self, frame: _Frame) -> str:
        text = "".join(frame.parts)
        if frame.kind == "a":
            text = text.strip()
            if frame.href and text and text != frame.href and not frame.href.startswith("#"):
                return f"[{text}]({frame.href})"
            return text or frame.href or ""
        if frame.kind == "quote":
            quoted = tidy(text)
            return "\n\n" + "\n".join("> " + line for line in quoted.splitlines()) + "\n\n"
        if frame.kind == "pre":
            longest = max((len(run) for run in re.findall(r"`+", text)), default=0)
            fence = "`" * max(3, longest + 1)
            return f"\n\n{fence}\n{text.strip(chr(10))}\n{fence}\n\n"
        if frame.kind == "cell":
            return " ".join(text.split()).strip(" ;").replace("|", "\\|")
        return text

    def _close_dangling_links(self) -> None:
        while self.frames[-1].kind == "a":
            self._out(self._render(self.frames.pop()))

    def _finish_cell(self) -> None:
        frame = self._close("cell")
        if frame is not None and self.row is not None:
            self.row.append(self._render(frame))

    def _finish_row(self) -> None:
        self._finish_cell()
        if self.row is None:
            return
        row, self.row = self.row, None
        if not row:
            return
        self._out("\n| " + " | ".join(row) + " |")
        if self.rows_in_table == 0:
            self._out("\n|" + "---|" * len(row))
        self.rows_in_table += 1

    # -- parser callbacks

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        in_pre = self._inside("pre")
        if tag in self.HEADINGS:
            self._block_break()
            self._out("#" * min(int(tag[1]) + 1, 6) + " ")
        elif tag in ("p", "div"):
            self._block_break()
        elif tag == "br":
            self._out(" " if self._inside("cell") else "\n" + "  " * len(self.lists))
        elif tag in ("ul", "ol"):
            self.lists.append(tag)
            if len(self.lists) == 1:
                self._block_break()
        elif tag == "li":
            if self._inside("cell"):
                if "".join(self.frames[-1].parts).strip():
                    self._out("; ")
                return
            indent = "  " * max(len(self.lists) - 1, 0)
            bullet = "1. " if self.lists and self.lists[-1] == "ol" else "- "
            self.after_bullet = False
            self._out("\n" + indent + bullet)
            self.after_bullet = True
        elif tag in ("b", "strong"):
            self._out("**")
        elif tag in ("i", "em"):
            self._out("_")
        elif tag in ("tt", "code") and not in_pre:
            self._out("`")
        elif tag == "del":
            self._out("~~")
        elif tag == "pre":
            self._open("pre")
        elif tag == "blockquote":
            self._open("quote")
        elif tag == "a":
            css = a.get("class") or ""
            plain = "user-hover" in css or "issue-link" in css
            self._open("a", href=None if plain else a.get("href"))
        elif tag == "table":
            self.table_depth += 1
            if self.table_depth == 1:
                self._block_break()
                self.rows_in_table = 0
            else:
                self._out(" ")
        elif tag == "tr":
            if self.table_depth == 1:
                self._finish_row()
                self.row = []
        elif tag in ("td", "th"):
            if self.table_depth == 1 and self.row is not None:
                self._finish_cell()
                self._open("cell")
            else:
                self._out(" ")
        elif tag == "img":
            label = a.get("alt") or Path(a.get("src") or "").name
            if label and "emoticon" not in (a.get("class") or ""):
                self._out(f"[image: {label}]")
        elif tag == "hr":
            self._block_break("\n\n---\n\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.HEADINGS or tag in ("p", "li"):
            self._close_dangling_links()
        if tag in self.HEADINGS or tag == "p":
            self._block_break()
        elif tag in ("ul", "ol"):
            if self.lists:
                self.lists.pop()
            self.after_bullet = False
            if not self.lists:
                self._block_break()
        elif tag == "li":
            self.after_bullet = False
        elif tag in ("b", "strong"):
            self._out("**")
        elif tag in ("i", "em"):
            self._out("_")
        elif tag in ("tt", "code") and not self._inside("pre"):
            self._out("`")
        elif tag == "del":
            self._out("~~")
        elif tag in ("a", "pre", "blockquote"):
            frame = self._close({"blockquote": "quote"}.get(tag, tag))
            if frame is not None:
                self._out(self._render(frame))
        elif tag in ("td", "th"):
            if self.table_depth == 1:
                self._finish_cell()
            else:
                self._out(" ")
        elif tag == "tr":
            if self.table_depth == 1:
                self._finish_row()
            else:
                self._out("; ")
        elif tag == "table" and self.table_depth:
            if self.table_depth == 1:
                self._finish_row()
            self.table_depth -= 1
            if self.table_depth == 0:
                self._block_break()

    def handle_data(self, data: str) -> None:
        if self._inside("pre"):
            self._out(data)
            return
        text = re.sub(r"\s+", " ", data)
        if self._tail()[-1:] in (" ", "\n", ""):
            text = text.lstrip()
        if text:
            self.after_bullet = False
            self._out(text)

    def markdown(self) -> str:
        self.close()
        self._finish_row()
        while len(self.frames) > 1:  # elements never closed in sloppy HTML
            frame = self.frames.pop()
            self._out(self._render(frame))
        return tidy("".join(self.frames[0].parts))


def tidy(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def html_to_markdown(html: str | None) -> str:
    if not html or not html.strip():
        return ""
    converter = JiraHtmlToMarkdown()
    converter.feed(html)
    return converter.markdown()


# ---------------------------------------------------------------- XML -> model


def short_date(value: str | None) -> str:
    if not value or not value.strip():
        return ""
    try:
        return parsedate_to_datetime(value.strip()).strftime("%Y-%m-%d %H:%M")
    except (TypeError, ValueError):
        return value.strip()


def size_in_bytes(value: str | None) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0


def text_of(item: ET.Element, tag: str) -> str:
    node = item.find(tag)
    return (node.text or "").strip() if node is not None else ""


def custom_field_value(cf: ET.Element) -> str:
    values = cf.find("customfieldvalues")
    if values is None:
        return ""
    checklist = values.find("checklist")
    if checklist is not None:
        name = text_of(cf, "customfieldname")
        rendered = html_to_markdown(checklist.text)
        rendered = rendered.removeprefix(name).strip()
        return "" if rendered in ("", "Empty") else rendered
    is_date = (cf.get("key") or "").endswith(("datetime", "datepicker"))
    parts = [short_date(v.text) if is_date else html_to_markdown(v.text)
             for v in values.findall("customfieldvalue")]
    parts = [p for p in parts if p]
    if not parts:
        return ""
    return ", ".join(parts) if all("\n" not in p for p in parts) else "\n".join(parts)


def parse_item(item: ET.Element, exported: str, all_fields: bool) -> JiraIssue:
    issue = JiraIssue(
        key=text_of(item, "key"),
        summary=text_of(item, "summary"),
        url=text_of(item, "link"),
        exported=exported,
        description=html_to_markdown(text_of(item, "description")),
        environment=html_to_markdown(text_of(item, "environment")),
    )

    project = item.find("project")
    labels = [t.strip() for t in (n.text for n in item.findall("labels/label")) if t]
    rows = [
        ("Project", f"{project.text} ({project.get('key')})" if project is not None else ""),
        ("Type", text_of(item, "type")),
        ("Status", text_of(item, "status")),
        ("Priority", text_of(item, "priority")),
        ("Resolution", text_of(item, "resolution")),
        ("Assignee", text_of(item, "assignee")),
        ("Reporter", text_of(item, "reporter")),
        ("Created", short_date(text_of(item, "created"))),
        ("Updated", short_date(text_of(item, "updated"))),
        ("Resolved", short_date(text_of(item, "resolved"))),
        ("Due", short_date(text_of(item, "due"))),
        ("Labels", ", ".join(labels)),
        ("Components", ", ".join(n.text or "" for n in item.findall("component"))),
        ("Affects versions", ", ".join(n.text or "" for n in item.findall("version"))),
        ("Fix versions", ", ".join(n.text or "" for n in item.findall("fixVersion"))),
        ("Parent", text_of(item, "parent")),
        ("Subtasks", ", ".join(n.text or "" for n in item.findall("subtasks/subtask"))),
        ("Original estimate", text_of(item, "timeoriginalestimate")),
        ("Remaining estimate", text_of(item, "timeestimate")),
        ("Time spent", text_of(item, "timespent")),
    ]
    issue.fields = [(name, value) for name, value in rows if value]

    for link_type in item.findall("issuelinks/issuelinktype"):
        for direction in ("outwardlinks", "inwardlinks"):
            for group in link_type.findall(direction):
                keys = [k.text for k in group.findall("issuelink/issuekey") if k.text]
                if keys:
                    label = group.get("description") or text_of(link_type, "name")
                    issue.links.append((label, keys))

    for att in item.findall("attachments/attachment"):
        issue.attachments.append(Attachment(
            name=att.get("name", ""),
            size_bytes=size_in_bytes(att.get("size")),
            author=att.get("author", ""),
            created=short_date(att.get("created")),
        ))

    for cf in item.findall("customfields/customfield"):
        name = text_of(cf, "customfieldname")
        noise = any(t in (cf.get("key") or "") for t in NOISE_FIELD_TYPES)
        value = custom_field_value(cf)
        if not value or (not all_fields and (noise or value.startswith("$action."))):
            continue
        issue.custom_fields.append((name, value))

    for c in item.findall("comments/comment"):
        issue.comments.append(Comment(
            author=c.get("author", ""),
            created=short_date(c.get("created")),
            body=html_to_markdown(c.text),
        ))
    return issue


def parse_export(raw: bytes, all_fields: bool = False) -> list[JiraIssue]:
    # Jira writes UTF-8 without a DOCTYPE. Checking the decoded whole file keeps
    # entity declarations out, whatever encoding trick or padding hides them.
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as err:
        raise NotAJiraExport("not UTF-8; Jira exports always are") from err
    if "<!DOCTYPE" in text or "<!ENTITY" in text:
        raise NotAJiraExport("has a DOCTYPE or entity declaration; Jira exports never do")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as err:
        raise NotAJiraExport(f"not well-formed XML ({err})") from err
    header = re.search(r"RSS generated by JIRA[^\n]*? at ([^\n]+)", text[:2048])
    exported = header.group(1).strip() if header else ""
    items = [i for i in (root.findall("channel/item") or root.findall("item"))
             if i.find("key") is not None]
    if not items:
        raise NotAJiraExport("no <item> with a <key>; not a Jira XML export")
    for item in items:
        key = text_of(item, "key")
        if not ISSUE_KEY.fullmatch(key):
            raise NotAJiraExport(f"issue key {key[:40]!r} is not a Jira key")
    return [parse_item(i, exported, all_fields) for i in items]


# ---------------------------------------------------------------- model -> Markdown


def indent_continuation(value: str) -> str:
    return value.replace("\n", "\n  ")


def render_markdown(issue: JiraIssue) -> str:
    out = [f"# {issue.key}: {issue.summary}", ""]
    source = issue.url + (f" (exported {issue.exported})" if issue.exported else "")
    if source:
        out.append(f"- Source: {source}")
    out += [f"- {name}: {value}" for name, value in issue.fields]
    for label, keys in issue.links:
        out.append(f"- Link, {label}: {', '.join(keys)}")
    if issue.attachments:
        out.append("- Attachments:")
        for a in issue.attachments:
            details = [f"{max(1, round(a.size_bytes / 1024))} KB", a.author, a.created]
            out.append(f"  - {a.name} ({', '.join(d for d in details if d)})")

    if issue.custom_fields:
        out += ["", "## Fields", ""]
        out += [f"- {name}: {indent_continuation(value)}" for name, value in issue.custom_fields]
    if issue.environment:
        out += ["", "## Environment", "", issue.environment]
    out += ["", "## Description", "", issue.description or "(empty)"]
    if issue.comments:
        out += ["", f"## Comments ({len(issue.comments)})"]
        for c in issue.comments:
            heading = f"{c.created or '(no date)'} · {c.author or '(unknown author)'}"
            out += ["", f"### {heading}", "", c.body or "(empty)"]
    return "\n".join(line.rstrip() for line in "\n".join(out).splitlines()) + "\n"


def local_copy_name(issue: JiraIssue) -> str:
    """<KEY>-<kebab-case title>.md, as the issue-tracker concept names local copies."""
    title = issue.summary
    for umlaut, plain in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("Ä", "Ae"),
                          ("Ö", "Oe"), ("Ü", "Ue"), ("ß", "ss")):
        title = title.replace(umlaut, plain)
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    if len(slug) > 60:
        slug = slug[:60].rsplit("-", 1)[0]
    return f"{issue.key}-{slug}.md" if slug else f"{issue.key}.md"


# ---------------------------------------------------------------- CLI


def convert_file(path: Path, out_dir: Path | None, all_fields: bool) -> list[str]:
    """Markdown documents for stdout, or the paths written when out_dir is set."""
    issues = parse_export(path.read_bytes(), all_fields)
    if out_dir is None:
        return [render_markdown(issue) for issue in issues]
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for issue in issues:
        target = out_dir / local_copy_name(issue)
        target.write_text(render_markdown(issue), encoding="utf-8")
        written.append(str(target))
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Turn Jira XML exports into compact Markdown (stdout, or one file per issue).")
    parser.add_argument("files", nargs="+", type=Path, help="Jira XML export file(s)")
    parser.add_argument("-o", "--out-dir", type=Path,
                        help="write <KEY>-<slug>.md per issue into this folder and print the paths")
    parser.add_argument("--all-fields", action="store_true",
                        help="keep internal custom fields such as Rank and Development")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    failed = False
    results: list[str] = []
    for path in args.files:
        try:
            results += convert_file(path, args.out_dir, args.all_fields)
        except (OSError, NotAJiraExport) as err:
            print(f"{path}: {err}", file=sys.stderr)
            failed = True
        except Exception as err:  # one odd file must not stop the batch
            print(f"{path}: unexpected {type(err).__name__}: {err}", file=sys.stderr)
            failed = True
    if results:
        print(("\n" if args.out_dir else "\n---\n\n").join(results), end="" if not args.out_dir else "\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
