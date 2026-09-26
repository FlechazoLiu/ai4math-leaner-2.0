"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

// ─── Props ─────────────────────────────────────────────────────────────────

interface LeanMonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  height?: string | number;
  readOnly?: boolean;
  onEditorMount?: (editor: { getValue: () => string; setValue: (v: string) => void; getPosition: () => { lineNumber: number; column: number } | null; executeEdits: (source: string, edits: unknown[]) => void; }) => void;
}

// ─── Fallback textarea ────────────────────────────────────────────────────

function FallbackEditor({
  value,
  onChange,
  readOnly,
}: LeanMonacoEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      className="h-full w-full resize-none font-mono text-sm border-0 rounded-none focus-visible:ring-0"
      placeholder="-- Your Lean4 proof or code"
      style={{ minHeight: "100%" }}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function LeanMonacoEditor({
  value,
  onChange,
  height = "100%",
  readOnly = false,
  onEditorMount,
}: LeanMonacoEditorProps) {
  const [Editor, setEditor] = useState<typeof FallbackEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Register Lean 4 language BEFORE loading the editor
        const monacoReact = await import("@monaco-editor/react");
        const { loader } = monacoReact;
        const monaco = await loader.init();
        registerLean4Language(monaco);
      } catch {
        // Monaco not available, will use fallback below
      }

      if (cancelled) return;

      // Try to import Monaco Editor React wrapper
      try {
        const mod = await import("@monaco-editor/react");
        const EditorComp = mod.default;

        if (!cancelled) {
          // Create a wrapper that passes the right props
          const Wrapper = (props: LeanMonacoEditorProps) => (
            <EditorComp
              language="lean4"
              theme="lean4-theme"
              value={props.value}
              onChange={props.onChange}
              onMount={(editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                props.onEditorMount?.(editor);
              }}
              options={{
                readOnly: props.readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                tabSize: 2,
                renderWhitespace: "selection",
                padding: { top: 8 },
              }}
              height={props.height as unknown as string | number}
            />
          );
          setEditor(() => Wrapper);
        }
      } catch {
        if (!cancelled) {
          setEditor(() => FallbackEditor);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function registerLean4Language(monaco: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "lean4")) {
      return;
    }

    monaco.languages.register({ id: "lean4" });

    monaco.languages.setMonarchTokensProvider("lean4", {
      defaultToken: "",
      tokenPostfix: ".lean",

      keywords: [
        "theorem", "lemma", "example", "def", "inductive", "structure", "class",
        "instance", "axiom", "opaque", "abbrev", "noncomputable", "partial",
        "mutual", "where", "let", "in", "have", "show", "from", "by",
        "calc", "refine", "exact", "apply", "intro", "intros", "assumption",
        "simp", "rw", "omega", "cases", "induction", "constructor",
        "match", "if", "then", "else", "forall", "fun", "=>", "→", "∀",
        "exists", "∃", "and", "or", "not", "true", "false",
        "Type", "Prop", "Sort", "Set",
        "open", "import", "namespace", "section", "end", "variable", "variables",
        "parameter", "parameters", "include", "omit", "extends",
        "private", "protected", "public", "export",
        "macro", "syntax", "elab", "elaborator",
        "attribute", "inherit", "local",
        "do", "return", "bind",
        "sorry",
      ],

      tactics: [
        "apply", "refine", "exact", "intro", "intros", "assumption",
        "simp", "rw", "omega", "cases", "induction", "constructor",
        "left", "right", "split", "injection", "contradiction",
        "exfalso", "specialize", "generalize",
        "rename", "clear", "revert", "change", "simpa",
        "rfl", "exact?", "apply?",
        "nlinarith", "positivity", "calc",
      ],

      typeKeywords: [
        "Nat", "Int", "String", "Bool", "List", "Option", "Prod", "Sum",
        "Unit", "Empty", "Fin", "Vector", "Array", "Set", "Finset",
        "Subtype", "Sigma", "Prop", "Type", "Sort",
      ],

      operators: [
        "=", "==", ":=", "|>", "<|", "->", "→", "=>", "⇒",
        "<->", "↔", "∧", "∨", "¬", "≠", "≤", "≥",
        "+", "-", "*", "/", "%", "^",
      ],

      symbols: /[=><!~?:&|+\-*\/^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          [/\/(\*)(?!\*)/, "comment", "@comment_block"],
          [/--.*$/, "comment"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string"],
          [/\d+/, "number"],
          [
            /[a-zA-Z_α-ωΑ-Ω][a-zA-Z0-9_']*/,
            {
              cases: {
                "@keywords": "keyword",
                "@tactics": "tag",
                "@typeKeywords": "type",
                "@default": "identifier",
              },
            },
          ],
          [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],
          [/[ \t\r\n]+/, "white"],
          [/[{}()\[\]]/, "@brackets"],
          [/[;,.]/, "delimiter"],
        ],
        comment_block: [
          [/[^*\/]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[*\/]/, "comment"],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/"/, "string", "@pop"],
        ],
      },
    });

    monaco.editor.defineTheme("lean4-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0000FF", fontStyle: "bold" },
        { token: "tag", foreground: "008080", fontStyle: "bold" },
        { token: "type", foreground: "2B91AF" },
        { token: "comment", foreground: "008000" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
        { token: "identifier", foreground: "000000" },
      ],
      colors: {},
    });
  }

  if (loading) {
    return (
      <div
        className="h-full w-full rounded-md bg-gray-100 animate-pulse flex items-center justify-center"
        ref={containerRef}
      >
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    );
  }

  if (!Editor) {
    return <FallbackEditor value={value} onChange={onChange} readOnly={readOnly} />;
  }

  return (
    <Editor value={value} onChange={onChange} height={height} readOnly={readOnly} onEditorMount={onEditorMount} />
  );
}
